// Order notification webhook contract checks.
//
// Runs against an explicitly selected isolated PostgreSQL database in REVIEW mode, so no
// provider is contacted. Run with:
//   TEST_DATABASE_URL=postgresql://localhost/bcs_test npm run test:commerce
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";

process.env.__NEXT_PROCESSED_ENV = "true";
process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_DIR = "/tmp";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYMENT_PROVIDER = "zaprite";
process.env.PAYMENT_MODE = "review";
process.env.EMAIL_MODE = "capture";
process.env.TRUST_PROXY = "false";
process.env.REVIEW_KRW_PER_BTC = "150000000";

const { prisma } = await import("../src/server/db.ts");
const { encryptWebhookUrl, notifyOrder } = await import("../src/server/commerce/notifications.ts");

const prefix = `notify-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const webhookUrl = "https://hooks.example.invalid/order-secret-token";
const productIds = [];
const variantIds = [];
const quoteIds = [];
const orderIds = [];

async function configureWebhook() {
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    update: {
      notificationWebhook: encryptWebhookUrl(webhookUrl),
      notificationChannel: "GENERIC",
      productDisplayUnit: "SATS",
    },
    create: {
      id: "site",
      notificationWebhook: encryptWebhookUrl(webhookUrl),
      notificationChannel: "GENERIC",
      productDisplayUnit: "SATS",
    },
  });
}

async function createNotificationOrder() {
  const product = await prisma.product.create({
    data: {
      slug: `${prefix}-${randomUUID()}`,
      titleKo: "테스트 상품",
      titleEn: "Test item",
      descriptionKo: "",
      descriptionEn: "",
      published: true,
      priceKind: "KRW_FIXED",
      priceAmount: 1_500n,
      allowedFulfillments: ["PICKUP"],
      variants: {
        create: {
          sku: `${prefix}-${randomUUID()}`,
          optionLabelKo: "기본",
          optionLabelEn: "Default",
          stockOnHand: 1,
        },
      },
    },
    include: { variants: true },
  });
  productIds.push(product.id);
  variantIds.push(product.variants[0].id);
  const quote = await prisma.quote.create({
    data: {
      input: {},
      snapshot: {},
      amountSats: 1000n,
      amountKrw: 1_500n,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  quoteIds.push(quote.id);
  const token = randomUUID();
  const order = await prisma.order.create({
    data: {
      quoteId: quote.id,
      customerName: "Secret Customer",
      customerEmail: `${prefix}@example.invalid`,
      amountSats: 1000n,
      amountKrw: 1_500n,
      fulfillment: "PICKUP",
      shippingSnapshot: {},
      idempotencyScope: token,
      idempotencyKey: token,
      requestHash: token,
      accessTokenHash: token,
      items: {
        create: {
          variantId: product.variants[0].id,
          quantity: 1,
          sku: product.variants[0].sku,
          titleKo: "테스트 상품",
          titleEn: "Test item",
          optionLabelKo: "기본",
          optionLabelEn: "Default",
          priceKind: "KRW_FIXED",
          unitPriceAmount: 1_500n,
          amountSats: 1000n,
          snapshot: {},
        },
      },
    },
  });
  orderIds.push(order.id);
  return order;
}

after(async () => {
  await prisma.orderItem.deleteMany({ where: { variantId: { in: variantIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.siteSetting.updateMany({ where: { id: "site" }, data: { notificationWebhook: null } });
  await prisma.$disconnect();
});

test("notifyOrder treats a non-2xx receiver as best-effort and does not retry", async (t) => {
  // Given: an order notification receiver returns a server error.
  await configureWebhook();
  const order = await createNotificationOrder();
  const calls = [];
  const logs = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url: String(url), body: String(init.body) });
    return new Response("receiver failed", { status: 503 });
  });
  t.mock.method(console, "error", (...args) => { logs.push(args.map(String).join(" ")); });

  // When: the public order notification API is invoked once.
  await notifyOrder(order.id, "접수");

  // Then: the failed delivery is logged as supplementary notification work, not retried.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, webhookUrl);
  const payload = JSON.parse(calls[0].body);
  assert.equal(payload.text, payload.content);
  assert.match(payload.content, new RegExp(order.id));
  assert.equal(logs.some((line) => line.includes(webhookUrl) || line.includes("Secret Customer")), false);
});

test("notifyOrder swallows receiver network failure without logging secret or customer data", async (t) => {
  // Given: the receiver cannot be reached.
  await configureWebhook();
  const order = await createNotificationOrder();
  const calls = [];
  const logs = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    throw new Error("network unavailable");
  });
  t.mock.method(console, "error", (...args) => { logs.push(args.map(String).join(" ")); });

  // When: the public order notification API is invoked.
  await notifyOrder(order.id, "결제 완료");

  // Then: order processing can continue and logs do not expose the stored receiver URL or customer name.
  assert.deepEqual(calls, [webhookUrl]);
  assert.equal(logs.some((line) => line.includes(webhookUrl) || line.includes("Secret Customer")), false);
});

test("notifyOrder delivers each explicit duplicate call once without a durable retry queue", async (t) => {
  // Given: the receiver accepts delivery.
  await configureWebhook();
  const order = await createNotificationOrder();
  const bodies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    bodies.push(String(init.body));
    return new Response(null, { status: 204 });
  });

  // When: two independent notification attempts are requested for the same order and event.
  await notifyOrder(order.id, "확정");
  await notifyOrder(order.id, "확정");

  // Then: each request maps to one POST; there is no implicit fulfillment dependency or retry outbox.
  assert.equal(bodies.length, 2);
  assert.deepEqual(JSON.parse(bodies[0]), JSON.parse(bodies[1]));
});
