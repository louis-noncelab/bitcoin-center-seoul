import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable commerce database.");
Object.assign(process.env, { DATABASE_URL: process.env.TEST_DATABASE_URL, APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"), PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false", REVIEW_KRW_PER_BTC: "150000000" });
const { prisma } = await import("../src/server/db.ts");
const { correctOrderTracking, trackingSchema } = await import("../src/server/orders/admin.ts");
const ids = [];
const quoteIds = [];
async function fixture(patch = {}) {
  const token = randomUUID();
  const quote = await prisma.quote.create({ data: { input: {}, snapshot: {}, amountSats: 1000n, expiresAt: new Date(Date.now() + 60000) } });
  quoteIds.push(quote.id);
  const order = await prisma.order.create({ data: { quoteId: quote.id, customerName: "Tracking test", customerEmail: "tracking@example.invalid", amountSats: 1000n, fulfillment: "DOMESTIC", fulfillmentStatus: "SHIPPED", status: "PAID", shippingSnapshot: {}, idempotencyScope: token, idempotencyKey: token, requestHash: token, accessTokenHash: token, carrier: "Old carrier", trackingNumber: "OLD-1", ...patch } });
  ids.push(order.id); return order;
}
const input = { carrier: "New carrier", trackingNumber: "NEW-1", expectedCarrier: "Old carrier", expectedTrackingNumber: "OLD-1" };
after(async () => {
  await prisma.auditLog.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await prisma.$disconnect();
});
test("tracking correction records before/after without changing fulfillment or money", async () => {
  const order = await fixture({ fulfillmentStatus: "DELIVERED", fulfilledAt: new Date("2026-09-20") });
  const updated = await correctOrderTracking(order.id, trackingSchema.parse(input), "review-admin");
  assert.equal(updated.trackingNumber, input.trackingNumber); assert.equal(updated.status, "PAID"); assert.equal(updated.fulfillmentStatus, "DELIVERED"); assert.equal(updated.amountSats, "1000");
  assert.equal(new Date(updated.fulfilledAt).toISOString(), order.fulfilledAt.toISOString());
  const log = await prisma.auditLog.findFirstOrThrow({ where: { targetId: order.id, action: "order.tracking" } });
  assert.deepEqual(log.summary, { before: { carrier: "Old carrier", trackingNumber: "OLD-1" }, after: { carrier: "New carrier", trackingNumber: "NEW-1" } });
});
test("two admins cannot overwrite the same original tracking concurrently", async () => {
  const order = await fixture();
  const results = await Promise.allSettled([correctOrderTracking(order.id, input, "first"), correctOrderTracking(order.id, { ...input, trackingNumber: "OTHER" }, "second")]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "STALE_ORDER");
  assert.equal(await prisma.auditLog.count({ where: { targetId: order.id } }), 1);
});
test("tracking requires paid shipped delivery orders and nonempty validated input", async () => {
  for (const patch of [{ status: "PENDING_PAYMENT" }, { fulfillment: "PICKUP" }, { fulfillmentStatus: "UNFULFILLED" }, { refundStatus: "PENDING" }]) {
    const order = await fixture(patch);
    await assert.rejects(correctOrderTracking(order.id, input, "review-admin"), { code: "INVALID_STATE" });
  }
  assert.equal(trackingSchema.safeParse({ ...input, carrier: " " }).success, false);
  assert.equal(trackingSchema.safeParse({ ...input, trackingNumber: "" }).success, false);
});
