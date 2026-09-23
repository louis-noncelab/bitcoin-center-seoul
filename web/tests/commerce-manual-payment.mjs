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
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { applyObservation } = await import("../src/server/payments/state.ts");
const { ensureInvoice, reconcilePayment } = await import("../src/server/payments/index.ts");
const { runPaymentMaintenancePass } = await import("../src/server/payments/maintenance.ts");
const { resolveManualPayment, manualPaymentSchema } = await import("../src/server/orders/manual-payment.ts");
const { HttpError } = await import("../src/server/http.ts");
const prefix = `manual-${randomBytes(12).toString("hex")}`;
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
const orderStatus = async (order) => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status;
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
  return createOrder(request, { quoteId: quote.id, customer: { name: "Tester", email, phone: "" }, locale: "en", acceptance: { accepted: true, version: checkoutPolicyVersion("en") } }, null);
}
async function orderWithPayment(code) {
  const { order } = await fromQuote(await makeQuote(cart(code), null));
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  return { order, payment };
}

const input = (payment, decision = "PAID", reason = "입금 내역 대조 완료") => ({ paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision, reason });
const manual = (order, payment, decision = "PAID", reason) => resolveManualPayment(order.id, input(payment, decision, reason), "review-admin");
const reload = (payment) => prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
const auditCount = (order) => prisma.auditLog.count({ where: { targetId: order.id, action: "order.payment.manual" } });
const conflict = (error) => error instanceof HttpError && error.status === 409;

test("manual payment schema requires a reason and a version", () => {
  assert.equal(manualPaymentSchema.safeParse({ paymentId: "p", decision: "PAID", reason: " " }).success, false);
});
test("concurrent identical manual paid requests settle once and audit once", async () => {
  const { order, payment } = await orderWithPayment();
  const before = await stock();
  const results = await Promise.all([manual(order, payment), manual(order, payment)]);
  assert.deepEqual(results.map(({ status }) => status), ["PAID", "PAID"]);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand - 1, before.reservedStock - 1]);
  assert.equal(await auditCount(order), 1);
});

test("provider paid and manual paid race cannot double-consume stock", async () => {
  const { order, payment } = await orderWithPayment();
  const before = await stock();
  const results = await Promise.allSettled([manual(order, payment), applyObservation(payment.id, { status: "PAID" })]);
  assert.equal(await orderStatus(order), "PAID");
  assert.equal((await reload(payment)).status, "PAID");
  assert.ok(results.every((r) => r.status === "fulfilled" || conflict(r.reason)));
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand - 1, before.reservedStock - 1]);
  assert.ok(await auditCount(order) <= 1);
});
for (const first of ["manual", "provider"]) test(`paid/cancel serialization preserves money and stock when ${first} wins`, async () => {
  const { order, payment } = await orderWithPayment();
  const before = await stock();
  if (first === "manual") {
    await manual(order, payment, "CANCELLED");
    await applyObservation(payment.id, { status: "PAID" });
    assert.equal(await orderStatus(order), "REVIEW");
    assert.equal((await reload(payment)).status, "REVIEW");
    assert.equal((await stock()).stockOnHand, before.stockOnHand);
    assert.equal(await auditCount(order), 1);
  } else {
    await applyObservation(payment.id, { status: "PAID" });
    await assert.rejects(manual(order, payment, "CANCELLED"), conflict);
    assert.equal(await orderStatus(order), "PAID");
    assert.equal((await stock()).stockOnHand, before.stockOnHand - 1);
    assert.equal(await auditCount(order), 0);
  }
  assert.equal((await stock()).reservedStock, before.reservedStock - 1);
});
test("concurrent manual cancellation and verified paid leave one safe result", async () => {
  const { order, payment } = await orderWithPayment();
  const before = await stock();
  await Promise.allSettled([manual(order, payment, "CANCELLED"), applyObservation(payment.id, { status: "PAID" })]);
  const status = await orderStatus(order);
  assert.ok(["PAID", "REVIEW"].includes(status));
  assert.equal((await reload(payment)).status, status);
  assert.equal((await stock()).stockOnHand, before.stockOnHand - (status === "PAID" ? 1 : 0));
  assert.equal((await stock()).reservedStock, before.reservedStock - 1);
});
test("manual cancellation and expiry release coupon and stock only once", async () => {
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  const before = await stock();
  await Promise.allSettled([manual(order, payment, "CANCELLED"), applyObservation(payment.id, { status: "EXPIRED" })]);
  assert.ok(["CANCELLED", "EXPIRED"].includes(await orderStatus(order)));
  assert.equal((await stock()).reservedStock, before.reservedStock - 1);
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
  assert.equal(await uses(code), 0);
});
test("competing manual decisions reject the stale loser", async () => {
  const { order, payment } = await orderWithPayment();
  const result = await Promise.allSettled([manual(order, payment), manual(order, payment, "CANCELLED")]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(result.some((r) => r.status === "rejected" && r.reason.code === "PAYMENT_STALE"));
  assert.equal(await auditCount(order), 1);
});
test("stale paid retries from another operator or reason never count as identical", async () => {
  const { order, payment } = await orderWithPayment();
  await manual(order, payment);
  await assert.rejects(resolveManualPayment(order.id, input(payment), "other-admin"), conflict);
  await assert.rejects(manual(order, payment, "PAID", "different reason"), conflict);
  assert.equal(await auditCount(order), 1);
});
test("expired late paid resolution consumes free stock and restores the original coupon once", async () => {
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  await applyObservation(payment.id, { status: "EXPIRED" });
  const reviewed = await applyObservation(payment.id, { status: "PAID" });
  const before = await stock();
  const result = await manual(order, reviewed);
  assert.equal(result.status, "PAID");
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand - 1, before.reservedStock]);
  assert.equal(await uses(code), 1);
  assert.equal(await auditCount(order), 1);
});
test("expired paid resolution cannot consume stock held by another order and rolls back", async () => {
  const { order, payment } = await orderWithPayment();
  await applyObservation(payment.id, { status: "EXPIRED" });
  const reviewed = await applyObservation(payment.id, { status: "PAID" });
  const original = await stock();
  await prisma.productVariant.update({ where: { id: variantId }, data: { stockOnHand: original.reservedStock } });
  try {
    await assert.rejects(manual(order, reviewed), (e) => e.code === "OUT_OF_STOCK");
    assert.equal(await orderStatus(order), "REVIEW");
    assert.equal((await reload(payment)).updatedAt.toISOString(), reviewed.updatedAt.toISOString());
    assert.equal((await stock()).reservedStock, original.reservedStock);
    assert.equal(await auditCount(order), 0);
  } finally {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stockOnHand: original.stockOnHand } });
  }
});
test("coupon exhaustion rolls back manual stock deduction and leaves later reservation intact", async () => {
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  await applyObservation(payment.id, { status: "EXPIRED" });
  const reviewed = await applyObservation(payment.id, { status: "PAID" });
  const other = await orderWithPayment(code.code);
  const before = await stock();
  await assert.rejects(manual(order, reviewed), (e) => e.code === "COUPON_CAPACITY");
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock]);
  assert.equal(await orderStatus(order), "REVIEW");
  assert.equal(await orderStatus(other.order), "PENDING_PAYMENT");
  assert.equal(await uses(code), 1);
  assert.equal(await auditCount(order), 0);
});
test("an unpaid review can be cancelled once with stock, coupon and audit intact", async () => {
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  const reviewed = await applyObservation(payment.id, { status: "REVIEW", reason: "PROVIDER_REQUIRES_CHECK" });
  const before = await stock();
  await Promise.all([manual(order, reviewed, "CANCELLED"), manual(order, reviewed, "CANCELLED")]);
  assert.equal(await orderStatus(order), "CANCELLED");
  assert.equal((await stock()).stockOnHand, before.stockOnHand);
  assert.equal((await stock()).reservedStock, before.reservedStock - 1);
  assert.equal(await uses(code), 0);
  assert.equal(await auditCount(order), 1);
});
for (const state of ["PAID", "PROCESSING"]) test(`${state} payment cannot be manually marked unpaid`, async () => {
  const { order, payment } = await orderWithPayment();
  const updated = await applyObservation(payment.id, { status: state });
  const before = await stock();
  await assert.rejects(manual(order, updated, "CANCELLED"), (e) => e.code === "PAYMENT_RECEIVED");
  assert.equal((await stock()).reservedStock, before.reservedStock);
  assert.equal(await auditCount(order), 0);
});
test("a late paid review cannot be manually marked unpaid", async () => {
  const { order, payment } = await orderWithPayment();
  await applyObservation(payment.id, { status: "EXPIRED" });
  const updated = await applyObservation(payment.id, { status: "PAID" });
  await assert.rejects(manual(order, updated, "CANCELLED"), (e) => e.code === "PAYMENT_RECEIVED");
});
for (const state of ["CREATING", "UNKNOWN"]) test(`${state} invoice creation blocks both manual decisions`, async () => {
  const { order, payment } = await orderWithPayment();
  const updated = await prisma.payment.update({ where: { id: payment.id }, data: state === "CREATING" ? { status: "CREATING" } : { status: "REVIEW", creationUnknown: true } });
  for (const decision of ["PAID", "CANCELLED"]) {
    await assert.rejects(manual(order, updated, decision), (e) => e.code === "PAYMENT_IN_FLIGHT");
  }
  assert.equal(await auditCount(order), 0);
});
test("payment belonging to another order cannot be used for manual mutation", async () => {
  const left = await orderWithPayment();
  const right = await orderWithPayment();
  await assert.rejects(manual(left.order, right.payment), (e) => e.status === 404);
});
test("manual paid audit records actor, reason and both before/after statuses", async () => {
  const { order, payment } = await orderWithPayment();
  await manual(order, payment);
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: order.id, action: "order.payment.manual" } });
  assert.equal(audit.actorId, "review-admin");
  assert.equal(audit.targetType, "Order");
  assert.deepEqual(audit.summary, { decision: "PAID", reason: input(payment).reason, paymentId: payment.id, expectedPaymentUpdatedAt: input(payment).expectedPaymentUpdatedAt, fromOrderStatus: "PENDING_PAYMENT", fromPaymentStatus: "NEW", toOrderStatus: "PAID", toPaymentStatus: "PAID" });
});

test("reconciliation preserves manual cancellation when no invoice was ever issued", async () => {
  const { order, payment } = await orderWithPayment();
  assert.equal(payment.status, "NEW");
  assert.equal(payment.externalId, null);
  await manual(order, payment, "CANCELLED");
  const before = await stock();
  const result = await reconcilePayment(payment.id);
  assert.equal(result.status, "FAILED");
  assert.equal(await orderStatus(order), "CANCELLED");
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock]);
  assert.equal(await auditCount(order), 1);
});

test("maintenance detects late payment on a manually cancelled issued invoice without a webhook", async () => {
  const { order, payment } = await orderWithPayment();
  const issued = await ensureInvoice(payment.id);
  assert.ok(issued.externalId);
  await manual(order, issued, "CANCELLED");
  assert.equal((await reload(payment)).status, "FAILED");
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: "paid" } } });
  const before = await stock();
  await runPaymentMaintenancePass({ afterId: payment.id.slice(0, -1), limit: 100 });
  assert.equal((await reload(payment)).status, "REVIEW");
  assert.equal(await orderStatus(order), "REVIEW");
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock]);
  assert.equal(await auditCount(order), 1);
});
