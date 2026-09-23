// TEST_DATABASE_URL=postgresql://max@127.0.0.1:5432/bcs_review_code_44c1074 node --conditions=react-server --import tsx --test tests/commerce-invariants.mjs
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";

assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable commerce database.");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000", ZAPRITE_API_KEY: "test-key", ZAPRITE_WEBHOOK_SECRET: "test-secret", ZAPRITE_ORG_ID: "org_test",
});
const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { applyObservation } = await import("../src/server/payments/state.ts");
const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
const { cancelPaidOrder, recordExternalRefund, externalRefundSchema } = await import("../src/server/orders/paid-cancellation.ts");
const { fulfillOrder } = await import("../src/server/orders/admin.ts");
const { HttpError } = await import("../src/server/http.ts");
const prefix = `refund-${randomBytes(12).toString("hex")}`;
const email = `${prefix}@example.invalid`;
let variantId;
let previousSettings;

before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  const settings = { maintenanceMode: false, guestPurchaseAllowed: true, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT" };
  await prisma.siteSetting.upsert({ where: { id: "site" }, update: settings, create: { id: "site", ...settings } });
  const product = await prisma.product.create({ data: {
    slug: prefix, titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "", published: true,
    priceKind: "BTC_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
    variants: { create: { sku: prefix, stockOnHand: 100 } },
  }, include: { variants: true } });
  variantId = product.variants[0].id;
});
after(async () => {
  const { customerEmailHash } = await import("../src/server/privacy.ts");
  const orders = await prisma.order.findMany({ where: { OR: [{ customerEmail: email }, { customerEmailHash: customerEmailHash(email) }] }, select: { id: true } });
  const ids = orders.map(({ id }) => id);
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: ids } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.couponUsage.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.quote.deleteMany({ where: { snapshot: { path: ["items", "0", "sku"], equals: prefix } } });
  if (ids.length) await prisma.emailOutbox.deleteMany({ where: { OR: ids.map((id) => ({ eventKey: { contains: id } })) } });
  await prisma.coupon.deleteMany({ where: { code: { startsWith: prefix.toUpperCase() } } });
  await prisma.productVariant.deleteMany({ where: { sku: prefix } });
  await prisma.product.deleteMany({ where: { slug: prefix } });
  if (previousSettings) await prisma.siteSetting.update({ where: { id: "site" }, data: {
    maintenanceMode: previousSettings.maintenanceMode, guestPurchaseAllowed: previousSettings.guestPurchaseAllowed,
    paymentProvider: previousSettings.paymentProvider, btcPriceSource: previousSettings.btcPriceSource,
  } });
  else await prisma.siteSetting.delete({ where: { id: "site" } });
  await prisma.$disconnect();
});

const cart = (couponCode) => ({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP", ...(couponCode ? { couponCode } : {}) });
const stock = () => prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
const uses = (coupon) => prisma.couponUsage.count({ where: { couponId: coupon.id } });
async function coupon() {
  return prisma.coupon.create({ data: {
    code: `${prefix}-${randomBytes(4).toString("hex")}`.toUpperCase(), nameKo: "할인", nameEn: "Discount", discountKind: "SATS", discountValue: 100n,
    usageLimit: 1, validFrom: new Date(0), validUntil: new Date("2099-01-01"),
  } });
}
async function fromQuote({ quote, token }) {
  const request = new Request("http://127.0.0.1:3100/api/orders", { method: "POST", headers: {
    origin: "http://127.0.0.1:3100", "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"),
    cookie: `bcs_quote_${quote.id}=${token}`,
  } });
  return createOrder(request, { quoteId: quote.id, customer: { name: "Tester", email, phone: "" }, locale: "en" }, null);
}
async function orderWithPayment(code) {
  const { order } = await fromQuote(await makeQuote(cart(code), null));
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  return { order, payment };
}

const input = (payment, decision = "PAID", reason = "입금 내역 대조 완료") => ({ paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision, reason });
const manual = (order, payment, decision = "PAID", reason) => resolveManualPayment(order.id, input(payment, decision, reason), "review-admin");
const reload = (payment) => prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
const conflict = (error) => error instanceof HttpError && error.status === 409;

const cancelInput = (payment) => ({ paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), reason: "구매자 취소 요청" });
const refundInput = (payment, restock = true) => ({ ...cancelInput(payment), method: "LIGHTNING", proof: "외부 지갑 거래내역 대조 완료", restock });
const paidOrder = async (code) => { const pair = await orderWithPayment(code); return { ...pair, payment: await applyObservation(pair.payment.id, { status: "PAID" }) }; };
const cancel = (order, payment) => cancelPaidOrder(order.id, cancelInput(payment), "review-admin");
const refund = (order, payment, restock = true) => recordExternalRefund(order.id, refundInput(payment, restock), "review-admin");
const orderRow = (order) => prisma.order.findUniqueOrThrow({ where: { id: order.id } });
const countAction = (order, action) => prisma.auditLog.count({ where: { targetId: order.id, action } });

test("paid cancellation keeps receipt and stock until external full-refund is recorded", async () => {
  const { order, payment } = await paidOrder();
  const before = await stock();
  await cancel(order, payment);
  const row = await orderRow(order);
  assert.equal(row.status, "CANCELLED");
  assert.equal(row.refundStatus, "PENDING");
  assert.equal((await reload(payment)).status, "PAID");
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
});
test("external refund requires explicit proof, reason, method and restock choice", () => {
  const valid = refundInput({ id: "payment", updatedAt: new Date() });
  assert.equal(externalRefundSchema.safeParse(valid).success, true);
  for (const invalid of [{ ...valid, proof: " " }, { ...valid, reason: " " }, { ...valid, method: "AUTO" }, { ...valid, method: "BANK" }, { ...valid, method: "OTHER" }, { ...valid, restock: undefined }]) assert.equal(externalRefundSchema.safeParse(invalid).success, false);
});
test("privacy-redacted order cannot enter paid cancellation", async () => {
  const { order, payment } = await paidOrder();
  await prisma.order.update({ where: { id: order.id }, data: { privacyRedactedAt: new Date() } });
  await assert.rejects(cancel(order, payment), (error) => error.code === "PRIVACY_REDACTED");
  assert.equal(await countAction(order, "order.paid.cancelled"), 0);
});
test("privacy-redacted pending refund cannot be marked complete", async () => {
  const { order, payment } = await paidOrder();
  await cancel(order, payment);
  await prisma.order.update({ where: { id: order.id }, data: { privacyRedactedAt: new Date() } });
  await assert.rejects(refund(order, await reload(payment)), (error) => error.code === "PRIVACY_REDACTED");
  assert.equal((await orderRow(order)).refundStatus, "PENDING");
});
test("concurrent identical paid cancellations are audited once without restoring stock", async () => {
  const { order, payment } = await paidOrder();
  const before = await stock();
  await Promise.all([cancel(order, payment), cancel(order, payment)]);
  assert.equal(await countAction(order, "order.paid.cancelled"), 1);
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
});
test("concurrent refund records restore stock exactly once and keep coupon consumed", async () => {
  const code = await coupon();
  const { order, payment } = await paidOrder(code.code);
  await cancel(order, payment);
  const current = await reload(payment);
  const before = await stock();
  await Promise.all([refund(order, current), refund(order, current)]);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand + 1, before.reservedStock]);
  assert.equal((await orderRow(order)).refundStatus, "COMPLETED");
  assert.ok((await orderRow(order)).refundedAt instanceof Date);
  assert.equal((await reload(payment)).status, "PAID");
  assert.equal(await uses(code), 1);
  assert.equal(await countAction(order, "order.refund.recorded"), 1);
});
test("refund without stock return records completion without manufacturing inventory", async () => {
  const { order, payment } = await paidOrder();
  await cancel(order, payment);
  const before = await stock();
  await refund(order, await reload(payment), false);
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
  assert.equal((await orderRow(order)).refundStatus, "COMPLETED");
});
test("paid cancellation serializes with fulfillment and blocks later fulfillment", async () => {
  const { order, payment } = await paidOrder();
  const results = await Promise.allSettled([cancel(order, payment), fulfillOrder(order.id, { status: "READY" }, "fulfillment-admin")]);
  assert.equal(results[0].status, "fulfilled");
  const row = await orderRow(order);
  assert.equal(row.status, "CANCELLED");
  assert.equal(row.refundStatus, "PENDING");
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: order.id, action: "order.paid.cancelled" } });
  assert.equal(audit.summary.originalFulfillmentStatus, row.fulfillmentStatus);
  await assert.rejects(fulfillOrder(order.id, { status: "COLLECTED" }, "fulfillment-admin"), (e) => e.code === "PAYMENT_REQUIRED");
});
test("collected paid orders can be cancelled but need explicit goods-return choice", async () => {
  const { order, payment } = await paidOrder();
  await fulfillOrder(order.id, { status: "READY" }, "fulfillment-admin");
  await fulfillOrder(order.id, { status: "COLLECTED" }, "fulfillment-admin");
  await cancel(order, payment);
  assert.equal((await orderRow(order)).fulfillmentStatus, "COLLECTED");
  const before = await stock();
  await refund(order, await reload(payment), false);
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
});
test("late paid review cancellation and refund cannot create stock that was never deducted", async () => {
  const { order, payment } = await orderWithPayment();
  await applyObservation(payment.id, { status: "EXPIRED" });
  const late = await applyObservation(payment.id, { status: "PAID" });
  const before = await stock();
  await cancel(order, late);
  const current = await reload(payment);
  await assert.rejects(refund(order, current, true), (e) => e.code === "RESTOCK_NOT_APPLICABLE");
  assert.equal((await orderRow(order)).refundStatus, "PENDING");
  await refund(order, current, false);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock]);
  assert.equal((await orderRow(order)).refundStatus, "COMPLETED");
});
test("paid review with retained stock releases only its reservation on cancellation", async () => {
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  await applyObservation(payment.id, { status: "REVIEW", reason: "REQUIRES_REVIEW" });
  const late = await applyObservation(payment.id, { status: "PAID" });
  const before = await stock();
  await cancel(order, late);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock - 1]);
  assert.equal(await uses(code), 1);
});
test("stale admin cancellation and conflicting refund data cannot reuse another action", async () => {
  const { order, payment } = await paidOrder();
  await cancel(order, payment);
  await assert.rejects(cancelPaidOrder(order.id, cancelInput(payment), "other-admin"), (e) => e.code === "PAYMENT_STALE");
  const current = await reload(payment);
  await refund(order, current);
  await assert.rejects(recordExternalRefund(order.id, { ...refundInput(current), proof: "different transfer" }, "review-admin"), (e) => e.code === "PAYMENT_STALE");
  assert.equal(await countAction(order, "order.refund.recorded"), 1);
});
test("missing cancellation evidence rolls refund back without stock or status changes", async () => {
  const { order, payment } = await paidOrder();
  await cancel(order, payment);
  await prisma.auditLog.updateMany({ where: { targetId: order.id, action: "order.paid.cancelled" }, data: { summary: { paymentId: payment.id } } });
  const current = await reload(payment);
  const before = await stock();
  await assert.rejects(refund(order, current), (e) => e.code === "CANCELLATION_AUDIT_MISSING");
  assert.equal((await orderRow(order)).refundStatus, "PENDING");
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
  assert.equal((await reload(payment)).updatedAt.toISOString(), current.updatedAt.toISOString());
  assert.equal(await countAction(order, "order.refund.recorded"), 0);
});
test("provider callbacks and manual resolution cannot resurrect cancelled paid orders", async () => {
  const { order, payment } = await paidOrder();
  await cancel(order, payment);
  const current = await reload(payment);
  await Promise.all([applyObservation(payment.id, { status: "PAID" }), applyObservation(payment.id, { status: "REVIEW", reason: "OLD_CALLBACK" })]);
  await assert.rejects(manual(order, current), (e) => e.code === "REFUND_IN_PROGRESS");
  assert.equal((await orderRow(order)).status, "CANCELLED");
  assert.equal((await orderRow(order)).refundStatus, "PENDING");
});
test("unpaid and unknown creation orders cannot enter paid cancellation", async () => {
  const { order, payment } = await orderWithPayment();
  await assert.rejects(cancel(order, payment), conflict);
  const unknown = await prisma.payment.update({ where: { id: payment.id }, data: { status: "REVIEW", creationUnknown: true } });
  await prisma.order.update({ where: { id: order.id }, data: { status: "REVIEW" } });
  await assert.rejects(cancel(order, unknown), (e) => e.code === "PAYMENT_UNCONFIRMED");
  assert.equal(await countAction(order, "order.paid.cancelled"), 0);
});
