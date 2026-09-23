import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import { execFileSync } from "node:child_process";

assert.ok(process.env.TEST_DATABASE_URL, "Use a disposable PostgreSQL test database.");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "lnurl", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
});
const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { setMeetupCheckin } = await import("../src/server/orders/checkin.ts");
const { rateFromSources } = await import("../src/server/money.ts");
const { ensureInvoice, reconcilePayment } = await import("../src/server/payments/index.ts");
const { providerContext } = await import("../src/server/payments/provider.ts");
const prefix = `policy-${randomUUID()}`;
const orders = [];
const quotes = [];
let variantId;
let previousSettings;

before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  await prisma.siteSetting.upsert({ where: { id: "site" }, update: { paymentProvider: "LNURL" }, create: { id: "site", paymentProvider: "LNURL" } });
  const product = await prisma.product.create({ data: {
    slug: prefix, titleKo: "검토", titleEn: "Review", descriptionKo: "", descriptionEn: "", published: true,
    priceKind: "BTC_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
    variants: { create: { sku: prefix, stockOnHand: 100 } },
  }, include: { variants: true } });
  variantId = product.variants[0].id;
});
after(async () => {
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: orders } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orders } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orders } } });
  await prisma.order.deleteMany({ where: { id: { in: orders } } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: orders } } });
  await prisma.quote.deleteMany({ where: { id: { in: quotes } } });
  if (orders.length) await prisma.emailOutbox.deleteMany({ where: { OR: orders.map(id => ({ eventKey: { contains: id } })) } });
  await prisma.productVariant.deleteMany({ where: { id: variantId } });
  await prisma.product.deleteMany({ where: { slug: prefix } });
  if (previousSettings) await prisma.siteSetting.update({ where: { id: "site" }, data: { paymentProvider: previousSettings.paymentProvider } });
  else await prisma.siteSetting.delete({ where: { id: "site" } });
  await prisma.$disconnect();
});

async function issuedOrder() {
  const { quote, token } = await makeQuote({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP" }, null);
  quotes.push(quote.id);
  const request = new Request("http://127.0.0.1:3100/api/orders", { method: "POST", headers: {
    origin: "http://127.0.0.1:3100", "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"),
    cookie: `bcs_quote_${quote.id}=${token}`,
  } });
  const { order } = await createOrder(request, { quoteId: quote.id, customer: { name: "Tester", email: `${prefix}@example.invalid`, phone: "" }, locale: "en" }, null);
  orders.push(order.id);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  return { order, payment: await ensureInvoice(payment.id) };
}
async function paidMeetup() {
  const { order, payment } = await issuedOrder();
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...payment.metadata, reviewScenario: "paid" } } });
  await reconcilePayment(payment.id);
  await prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { sku: "MEETUP-999999" } });
  return order;
}

test("cached executable FX rate expires after five minutes and rejects future timestamps", () => {
  // Given a valid cached rate and deterministic pricing clock.
  const now = Date.UTC(2026, 8, 23);
  const cached = { krwPerBtc: "150000000", source: "upbit:KRW-BTC", timestamp: new Date(now - 300_000) };
  // When fallback crosses its age limit, Then checkout fails closed.
  assert.equal(rateFromSources(null, cached, now).source, "cache:upbit:KRW-BTC");
  for (const timestamp of [new Date(now - 300_001), new Date(now + 5001), new Date(NaN)]) {
    assert.throws(() => rateFromSources(null, { ...cached, timestamp }, now), error => error.code === "RATE_UNAVAILABLE");
  }
});

test("two concurrent scans admit one booking only once", async () => {
  // Given a paid booking without check-in.
  const order = await paidMeetup();
  // When scanners race on the same booking.
  let scans;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
    scans = Promise.all([setMeetupCheckin({ orderId: order.id }, "scanner-a"), setMeetupCheckin({ orderId: order.id }, "scanner-b")]);
    const deadline = Date.now() + 3000;
    for (;;) {
      await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
      const [waiting] = await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%"Order"%'`;
      if (waiting.count >= 2) break;
      assert.ok(Date.now() < deadline, "Both scanners must reach the locked order");
      await setImmediate();
    }
  });
  const result = await scans;
  // Then one scanner admits it and only one audit entry commits.
  assert.deepEqual(result.map(value => value.status).sort(), ["already_checked_in", "checked_in"]);
  assert.equal(await prisma.auditLog.count({ where: { targetId: order.id, action: "meetup.checked_in" } }), 1);
});

test("LNURL verification uses the immutable receiver snapshot after selection changes", async () => {
  // Given an earlier invoice issued by another saved receiver on the fixture host.
  const { payment } = await issuedOrder();
  const receiverSnapshot = { ...payment.metadata.receiverSnapshot, lightningAddress: "OLD@lnurl.review.invalid" };
  const saved = await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...payment.metadata, receiverSnapshot, reviewScenario: "paid" } } });
  // When its original invoice is verified after the active receiver changes.
  const context = await providerContext(saved);
  const settled = await reconcilePayment(payment.id);
  // Then it uses its saved receiver and verifies the real fixture preimage.
  assert.deepEqual(context.receiver, receiverSnapshot);
  assert.equal(settled.status, "PAID");
});

test("local LNURL timeout cannot release stock before the signed invoice expires", async () => {
  // Given a locally expired hold whose issued invoice is still payable.
  const { order, payment } = await issuedOrder();
  const expired = await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(0) } });
  const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
  const beforeStock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  // When an operator attempts unpaid cancellation with a provider reference.
  await assert.rejects(resolveManualPayment(order.id, {
    paymentId: expired.id, expectedPaymentUpdatedAt: expired.updatedAt.toISOString(), decision: "CANCELLED", reason: "Provider checked",
    unpaidEvidence: { providerReference: "fixture-provider-reference", pendingHtlcsCleared: true },
  }, "operator"), error => error.code === "LNURL_INVOICE_STILL_PAYABLE");
  // Then the original stock reservation remains intact.
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reservedStock, beforeStock.reservedStock);
});

async function expiredInvoice() {
  const { order, payment } = await issuedOrder();
  const { reviewInvoice } = await import("../src/server/payments/review-transport.ts");
  const invoice = reviewInvoice({ ...payment, createdAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() - 60_000) });
  await prisma.payment.update({ where: { id: payment.id }, data: { paymentRequest: invoice.pr, expiresAt: new Date(0) } });
  return { order, payment: await reconcilePayment(payment.id) };
}

test("expired LNURL cancellation requires explicit provider evidence", async () => {
  // Given a signed expired invoice and a held REVIEW order.
  const { order, payment } = await expiredInvoice();
  const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
  // When cancellation omits provider evidence, Then it fails closed.
  await assert.rejects(resolveManualPayment(order.id, {
    paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision: "CANCELLED", reason: "Local clock expired",
  }, "operator"), error => error.code === "LNURL_RECONCILIATION_REQUIRED");
});

test("maintenance reports expired LNURL holds requiring operator reconciliation", async () => {
  // Given an expired unpaid invoice with a retained stock reservation.
  await expiredInvoice();
  // When the actual operational command reconciles pending payments.
  const stdout = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/reconcile-payments.ts"], { encoding: "utf8", env: process.env });
  const passes = stdout.trim().split("\n").map(line => JSON.parse(line));
  // Then the real worker log exposes the attention count and completes its cycle.
  assert.ok(passes.some(pass => pass.event === "maintenance.pass" && pass.requiresReconciliation >= 1));
  assert.equal(passes.at(-1).cycleComplete, true);
});

test("provider-confirmed expired LNURL cancellation releases once and quarantines late money", async () => {
  // Given an expired invoice and explicit provider reconciliation evidence.
  const { order, payment } = await expiredInvoice();
  const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
  const unpaidEvidence = { providerReference: "fixture-final-unpaid-reference", pendingHtlcsCleared: true };
  const input = { paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision: "CANCELLED", reason: "Provider confirms no settled or pending HTLC", unpaidEvidence };
  const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  // When the operator records and retries the same confirmed resolution.
  await resolveManualPayment(order.id, input, "operator");
  await resolveManualPayment(order.id, input, "operator");
  // Then the hold is released exactly once and evidence is auditable.
  const released = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  assert.equal(released.reservedStock, stock.reservedStock - 1);
  assert.equal(released.stockOnHand, stock.stockOnHand);
  const audits = await prisma.auditLog.findMany({ where: { targetId: order.id, action: "order.payment.manual" } });
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0].summary.unpaidEvidence, unpaidEvidence);
  const saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...saved.metadata, reviewScenario: "paid" } } });
  assert.equal((await reconcilePayment(payment.id)).status, "REVIEW");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "REVIEW");
  const late = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  assert.equal(late.reservedStock, released.reservedStock);
  assert.equal(late.stockOnHand, released.stockOnHand);
});

test("check-in observes a cancellation committed while it waits for the order lock", async () => {
  // Given a paid meetup and a cancellation transaction already holding the order lock.
  const order = await paidMeetup();
  let scan;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
    scan = setMeetupCheckin({ code: order.confirmationCode }, "scanner").then(value => ({ value }), error => ({ error }));
    const deadline = Date.now() + 3000;
    for (;;) {
      await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
      const [waiting] = await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%"Order"%'`;
      if (waiting.count >= 1) break;
      assert.ok(Date.now() < deadline, "Scanner must reach the locked order");
      await setImmediate();
    }
    // When cancellation commits before the waiting scanner can proceed.
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", refundStatus: "PENDING" } });
  });
  const result = await scan;
  // Then no stale PAID read admits the cancelled booking.
  assert.equal(result.error?.code, "NOT_PAID");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).checkedInAt, null);
  assert.equal(await prisma.auditLog.count({ where: { targetId: order.id, action: "meetup.checked_in" } }), 0);
});

test("immutable receiver verification preserves mode and transport boundaries", async () => {
  // Given a valid fixture invoice and a changed server-saved LNURL receiver.
  const { payment } = await issuedOrder();
  const context = await providerContext(payment);
  // When unsupported execution modes or external fixture URLs are attempted.
  await assert.rejects(providerContext({ ...payment, mode: "LIVE" }), error => error.code === "LIVE_DISABLED");
  await assert.rejects(providerContext({ ...payment, mode: "SANDBOX" }), error => error.code === "SANDBOX_DISABLED");
  await assert.rejects(context.transport({ url: "https://example.com/verify" }), error => error.code === "REVIEW_EXTERNAL_REQUEST_BLOCKED");
  // Then the invoice cannot cross providers either.
  await assert.rejects(providerContext({ ...payment, metadata: { ...payment.metadata, receiverSnapshot: { provider: "ZAPRITE", url: "https://zaprite.review.invalid", accountId: "other" } } }), error => error.code === "RECEIVER_CONFIGURATION_CHANGED");
});
