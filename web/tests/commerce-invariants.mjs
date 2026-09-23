// TEST_DATABASE_URL=postgresql://max@127.0.0.1:5432/bcs_review_code_44c1074 node --conditions=react-server --import tsx --test tests/commerce-invariants.mjs
import assert from "node:assert/strict";
import test, { before, after, afterEach } from "node:test";
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
const { cancelUnpaidOrder } = await import("../src/server/orders/cancel-unpaid.ts");
const { ensureInvoice, reconcilePayment } = await import("../src/server/payments/index.ts");
const { applyObservation } = await import("../src/server/payments/state.ts");
const { HttpError } = await import("../src/server/http.ts");
const prefix = `inv-${randomBytes(12).toString("hex")}`;
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
afterEach(async () => { await prisma.siteSetting.update({ where: { id: "site" }, data: { maintenanceMode: false } }); });
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
async function expireNew(payment) {
  await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(0) } });
  return reconcilePayment(payment.id);
}

for (const status of ["pending", "processing"]) test(`paid settles once when a ${status} webhook used the same order key`, async () => {
  // Given: the production webhook key has already observed an earlier state.
  const { order, payment } = await orderWithPayment();
  const issued = await ensureInvoice(payment.id);
  const key = `webhook:zaprite:${issued.externalId}`;
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: status } } });
  await reconcilePayment(payment.id, key);
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: "paid" } } });
  const before = await stock();
  // When: two deliveries observe the provider-confirmed payment concurrently.
  const results = await Promise.all([reconcilePayment(payment.id, key), reconcilePayment(payment.id, key)]);
  // Then: settlement consumes the reservation exactly once.
  assert.deepEqual(results.map(({ status }) => status), ["PAID", "PAID"]);
  assert.equal(await orderStatus(order), "PAID");
  const after = await stock();
  assert.equal(after.stockOnHand, before.stockOnHand - 1);
  assert.equal(after.reservedStock, before.reservedStock - 1);
});

test("new quote is rejected when maintenance is enabled", async () => {
  // Given
  await prisma.siteSetting.update({ where: { id: "site" }, data: { maintenanceMode: true } });
  // When / Then
  await assert.rejects(makeQuote(cart(), null), (error) => error instanceof HttpError && error.code === "COMMERCE_MAINTENANCE");
});
test("existing quote cannot reserve stock after maintenance is enabled", async () => {
  // Given
  const quote = await makeQuote(cart(), null);
  const before = await stock();
  await prisma.siteSetting.update({ where: { id: "site" }, data: { maintenanceMode: true } });
  // When / Then
  await assert.rejects(fromQuote(quote), (error) => error instanceof HttpError && error.code === "COMMERCE_MAINTENANCE");
  assert.equal((await stock()).reservedStock, before.reservedStock);
});
test("issued payments still settle during maintenance", async () => {
  // Given
  const { payment } = await orderWithPayment();
  const issued = await ensureInvoice(payment.id);
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: "paid" } } });
  await prisma.siteSetting.update({ where: { id: "site" }, data: { maintenanceMode: true } });
  // When / Then
  assert.equal((await reconcilePayment(payment.id)).status, "PAID");
});
test("coupon capacity returns when an unissued payment expires", async () => {
  // Given
  const code = await coupon();
  const { payment } = await orderWithPayment(code.code);
  // When
  await expireNew(payment);
  // Then
  assert.equal(await uses(code), 0);
  assert.equal((await makeQuote(cart(code.code), null)).quote.snapshot.coupon.id, code.id);
});
test("coupon capacity returns when an issued invoice has a verified expired observation", async () => {
  // Given
  const code = await coupon();
  const { payment } = await orderWithPayment(code.code);
  await ensureInvoice(payment.id);
  // When
  await applyObservation(payment.id, { status: "EXPIRED" });
  // Then
  assert.equal(await uses(code), 0);
});
test("cancelling a previously expired order releases its legacy coupon reservation", async () => {
  // Given: the old expiry path retained a coupon usage.
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  await expireNew(payment);
  await prisma.couponUsage.upsert({ where: { orderId: order.id }, update: {}, create: { orderId: order.id, couponId: code.id, discountSats: 100n } });
  const before = await stock();
  // When
  await cancelUnpaidOrder(order.id, "customer", {});
  // Then
  assert.equal(await uses(code), 0);
  assert.equal((await stock()).reservedStock, before.reservedStock);
});
test("coupon remains reserved when payment settlement needs review", async () => {
  // Given
  const code = await coupon();
  const { payment } = await orderWithPayment(code.code);
  await ensureInvoice(payment.id);
  // When
  await applyObservation(payment.id, { status: "REVIEW", reason: "UNDERPAYMENT" });
  // Then
  assert.equal(await uses(code), 1);
});
test("late paid observations cannot consume released inventory or another order's coupon", async () => {
  // Given
  const code = await coupon();
  const { order, payment } = await orderWithPayment(code.code);
  await ensureInvoice(payment.id);
  await applyObservation(payment.id, { status: "EXPIRED" });
  const replacement = await orderWithPayment(code.code);
  const before = await stock();
  // When
  const result = await applyObservation(payment.id, { status: "PAID" });
  // Then
  assert.equal(result.status, "REVIEW");
  assert.equal(await orderStatus(order), "REVIEW");
  assert.equal(await orderStatus(replacement.order), "PENDING_PAYMENT");
  assert.equal(await uses(code), 1);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock]);
});
test("unissued cancellation returns stock and coupon capacity exactly once", async () => {
  // Given
  const code = await coupon();
  const { order } = await orderWithPayment(code.code);
  const before = await stock();
  // When
  await Promise.all([cancelUnpaidOrder(order.id, "customer", {}), cancelUnpaidOrder(order.id, "customer", {})]);
  // Then
  assert.equal(await uses(code), 0);
  const after = await stock();
  assert.deepEqual([after.stockOnHand, after.reservedStock], [before.stockOnHand, before.reservedStock - 1]);
});
test("only one concurrent order can reserve a limited coupon", async () => {
  // Given: both quotes were valid before either order reserved the last coupon use.
  const code = await coupon();
  const quotes = await Promise.all([makeQuote(cart(code.code), null), makeQuote(cart(code.code), null)]);
  // When
  const results = await Promise.allSettled(quotes.map(fromQuote));
  // Then
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  const failure = results.find(({ status }) => status === "rejected");
  assert.ok(failure?.status === "rejected" && failure.reason instanceof HttpError && failure.reason.code === "COUPON_INVALID");
  assert.equal(await uses(code), 1);
});
test("processing payments keep coupon capacity when a stale expiry arrives", async () => {
  // Given
  const code = await coupon();
  const { payment } = await orderWithPayment(code.code);
  await ensureInvoice(payment.id);
  await applyObservation(payment.id, { status: "PROCESSING" });
  // When
  const result = await applyObservation(payment.id, { status: "EXPIRED" });
  // Then
  assert.equal(result.status, "PROCESSING");
  assert.equal(await uses(code), 1);
});
