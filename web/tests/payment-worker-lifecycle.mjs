import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import test, { after, before } from "node:test";

import { assertSafeTestDatabaseUrl } from "./helpers/test-database-url.mjs";

const webRoot = resolve(import.meta.dirname, "..");
const databaseUrl = process.env.TEST_DATABASE_URL;
assertSafeTestDatabaseUrl(databaseUrl);

const tokenKey = Buffer.alloc(32, 7).toString("base64");
const requiredEnv = {
  APP_MODE: "test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  DATABASE_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  DATA_DIR: "/tmp",
  TOKEN_ENCRYPTION_KEY: tokenKey,
  PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review",
  EMAIL_MODE: "capture",
  __NEXT_PROCESSED_ENV: "true",
  TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
  ZAPRITE_API_KEY: "test-key",
  ZAPRITE_WEBHOOK_SECRET: "test-secret",
  ZAPRITE_ORG_ID: "org_test",
};
Object.assign(process.env, requiredEnv);

const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { ensureInvoice } = await import("../src/server/payments/index.ts");

const prefix = `worker-${randomBytes(8).toString("hex")}`;
const workerEnv = {
  ...requiredEnv,
  NODE_ENV: "test",
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "/tmp",
};
const orders = [];
const quotes = [];
let variantId;
let previousSettings;
const activeWorkers = new Set();

function withTimeout(promise, ms, description) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${description} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function linesFrom(stream, onLine) {
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffered += chunk;
    for (;;) {
      const end = buffered.indexOf("\n");
      if (end < 0) return;
      const line = buffered.slice(0, end).trim();
      buffered = buffered.slice(end + 1);
      if (line) onLine(line);
    }
  });
}

function startWorker(args = []) {
  const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/reconcile-payments.ts", ...args], {
    cwd: webRoot,
    env: workerEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  activeWorkers.add(child);
  const stdout = [];
  const stderr = [];
  const events = [];
  const waiters = [];
  linesFrom(child.stdout, (line) => {
    stdout.push(line);
    try {
      const event = JSON.parse(line);
      events.push(event);
      for (const waiter of [...waiters]) waiter(event);
    } catch {
      // Non-JSON output is retained for failure diagnostics only.
    }
  });
  linesFrom(child.stderr, (line) => stderr.push(line));
  const exit = new Promise((resolve) => {
    child.once("close", (code, signal) => { activeWorkers.delete(child); resolve({ code, signal }); });
  });
  return {
    child,
    stdout,
    stderr,
    events,
    waitForEvent(name, skip = 0) {
      let seen = events.filter((event) => event.event === name).length;
      if (seen > skip) return Promise.resolve(events.filter((event) => event.event === name).at(skip));
      return new Promise((resolve) => {
        const waiter = (event) => {
          if (event.event !== name) return;
          seen += 1;
          if (seen <= skip) return;
          waiters.splice(waiters.indexOf(waiter), 1);
          resolve(event);
        };
        waiters.push(waiter);
      });
    },
    async waitForExit(ms = 5000) {
      return withTimeout(exit, ms, `worker ${args.join(" ") || "once"} exit`);
    },
  };
}

async function stopGracefully(worker, signal) {
  const exit = worker.waitForExit(3000);
  worker.child.kill(signal);
  const result = await exit;
  assert.deepEqual(result, { code: 0, signal: null }, `${signal} stderr: ${worker.stderr.join("\n")}`);
}

async function runOnce() {
  const worker = startWorker();
  const result = await worker.waitForExit(10_000);
  assert.deepEqual(result, { code: 0, signal: null }, `worker stderr: ${worker.stderr.join("\n")}`);
  assert.ok(worker.events.some((event) => event.event === "maintenance.pass" && event.cycleComplete === true));
  return worker;
}

async function orderWithIssuedInvoice(scenario = "paid") {
  const { quote, token } = await makeQuote({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP" }, null);
  quotes.push(quote.id);
  const request = new Request("http://127.0.0.1:3100/api/orders", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:3100",
      "idempotency-key": randomUUID(),
      "x-request-secret": randomBytes(32).toString("base64url"),
      cookie: `bcs_quote_${quote.id}=${token}`,
    },
  });
  const { order } = await createOrder(request, {
    quoteId: quote.id,
    customer: { name: "Worker Tester", email: `${prefix}@example.invalid`, phone: "" },
    locale: "en",
    acceptance: { accepted: true, version: checkoutPolicyVersion("en") },
  }, null);
  orders.push(order.id);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  const issued = await ensureInvoice(payment.id);
  await prisma.payment.update({ where: { id: issued.id }, data: { metadata: { ...issued.metadata, reviewScenario: scenario } } });
  return { order, payment: await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }) };
}

async function durableState(orderId) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
  const payment = order.payments[0];
  assert.ok(payment);
  const [variant, eventCount, letters] = await Promise.all([
    prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
    prisma.paymentEvent.count({ where: { paymentId: payment.id } }),
    prisma.emailOutbox.findMany({ where: { orderId }, select: { eventKey: true, status: true, kind: true }, orderBy: { eventKey: "asc" } }),
  ]);
  return { order, payment, variant, eventCount, letters };
}

before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    update: { maintenanceMode: false, guestPurchaseAllowed: true, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT", notificationEmail: `${prefix}-ops@example.invalid` },
    create: { id: "site", maintenanceMode: false, guestPurchaseAllowed: true, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT", notificationEmail: `${prefix}-ops@example.invalid` },
  });
  const product = await prisma.product.create({
    data: {
      slug: prefix,
      titleKo: "워커 검증",
      titleEn: "Worker check",
      descriptionKo: "",
      descriptionEn: "",
      published: true,
      priceKind: "BTC_FIXED",
      priceAmount: 1000n,
      allowedFulfillments: ["PICKUP"],
      variants: { create: { sku: prefix, stockOnHand: 10 } },
    },
    include: { variants: true },
  });
  variantId = product.variants[0].id;
});

after(async () => {
  await Promise.all([...activeWorkers].map((child) => {
    const exit = new Promise((resolve) => child.once("close", resolve));
    child.kill("SIGTERM");
    return withTimeout(exit, 5000, "fixture worker cleanup");
  }));
  if (orders.length) {
    await prisma.emailOutbox.deleteMany({ where: { OR: orders.map((id) => ({ eventKey: { contains: id } })) } });
    await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: orders } } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orders } } });
    await prisma.auditLog.deleteMany({ where: { targetId: { in: orders } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orders } } });
    await prisma.order.deleteMany({ where: { id: { in: orders } } });
  }
  await prisma.quote.deleteMany({ where: { id: { in: quotes } } });
  await prisma.productVariant.deleteMany({ where: { id: variantId } });
  await prisma.product.deleteMany({ where: { slug: prefix } });
  if (previousSettings) {
    await prisma.siteSetting.update({
      where: { id: "site" },
      data: {
        maintenanceMode: previousSettings.maintenanceMode,
        guestPurchaseAllowed: previousSettings.guestPurchaseAllowed,
        paymentProvider: previousSettings.paymentProvider,
        btcPriceSource: previousSettings.btcPriceSource,
        notificationEmail: previousSettings.notificationEmail,
      },
    });
  } else {
    await prisma.siteSetting.delete({ where: { id: "site" } });
  }
  await prisma.$disconnect();
});

test("watch mode runs repeated real maintenance passes", async () => {
  // Given a real watch worker with stdout subscribed before launch.
  const worker = startWorker(["--watch"]);
  // When the production interval elapses once.
  const first = await withTimeout(worker.waitForEvent("maintenance.pass", 0), 10_000, "first maintenance pass");
  const second = await withTimeout(worker.waitForEvent("maintenance.pass", 1), 35_000, "second maintenance pass");
  await stopGracefully(worker, "SIGTERM");
  // Then both passes came from the actual process loop.
  assert.equal(first.event, "maintenance.pass");
  assert.equal(second.event, "maintenance.pass");
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  test(`watch mode exits promptly on ${signal}`, async () => {
    // Given a watch worker already inside its production wait.
    const worker = startWorker(["--watch"]);
    await withTimeout(worker.waitForEvent("maintenance.pass", 0), 10_000, "initial maintenance pass");
    // When the process receives the shutdown signal.
    await stopGracefully(worker, signal);
    // Then it disconnects and exits cleanly before the next interval.
    assert.equal(worker.child.exitCode, 0);
  });
}

test("restart settles a pending review-mode order and reruns stay idempotent", async () => {
  // Given a worker process that was abruptly stopped and a pending REVIEW-mode payment.
  const { order } = await orderWithIssuedInvoice("pending");
  const stopped = startWorker(["--watch"]);
  await withTimeout(stopped.waitForEvent("maintenance.pass", 0), 10_000, "pre-stop maintenance pass");
  const before = await durableState(order.id);
  assert.equal(before.order.status, "PENDING_PAYMENT");
  assert.equal(before.payment.status, "PENDING");
  assert.equal(before.variant.stockOnHand, 10);
  assert.equal(before.variant.reservedStock, 1);
  const stoppedExit = stopped.waitForExit(3000);
  stopped.child.kill("SIGKILL");
  assert.deepEqual(await stoppedExit, { code: null, signal: "SIGKILL" });
  await prisma.payment.update({
    where: { id: before.payment.id },
    data: { metadata: { ...before.payment.metadata, reviewScenario: "paid" } },
  });

  // When the worker is restarted and then rerun against the same durable state.
  await runOnce();
  const settled = await durableState(order.id);
  await runOnce();
  const rerun = await durableState(order.id);

  // Then settlement, inventory, payment event capture, and mail capture are durable and idempotent.
  assert.equal(settled.order.status, "PAID");
  assert.equal(settled.payment.status, "PAID");
  assert.equal(settled.variant.stockOnHand, 9);
  assert.equal(settled.variant.reservedStock, 0);
  assert.equal(rerun.order.status, "PAID");
  assert.equal(rerun.payment.status, "PAID");
  assert.equal(rerun.variant.stockOnHand, settled.variant.stockOnHand);
  assert.equal(rerun.variant.reservedStock, settled.variant.reservedStock);
  assert.equal(rerun.eventCount, settled.eventCount);
  assert.deepEqual(rerun.letters, settled.letters);
  assert.ok(settled.letters.some((letter) => letter.kind === "order.paid" && letter.status === "CAPTURED"));
  assert.ok(settled.letters.some((letter) => letter.kind === "operator.paid" && letter.status === "CAPTURED"));
});
