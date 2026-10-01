import "./helpers/pg-content-env.mjs";
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const uploads = await mkdtemp(join(tmpdir(), "bcs-stock-test-"));
process.env.BCS_EVENTS_UPLOADS = uploads;
const { prisma } = await import("../src/server/db.ts");
const { saveProduct, listAdminProducts } = await import("../src/server/catalog/index.ts");
const { productSchema } = await import("../src/server/catalog/validation.ts");
const { toDraft, toVariantInput, newVariant } = await import("../src/lib/product-variants.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
const productIds = [], orderIds = [], quoteIds = [];
let previousSettings;
const actor = "stock-test";
const input = (sku, stockOnHand = 5) => ({
  slug: sku, titleKo: "재고", titleEn: "Stock", descriptionKo: "검사", descriptionEn: "Fixture",
  imageUrl: "", images: [], published: true, memberOnly: false, priceKind: "BTC_FIXED", priceAmount: "1000",
  allowedFulfillments: ["PICKUP"], variants: [{ sku, optionLabelKo: "", optionLabelEn: "", stockOnHand, billableWeightG: 0, active: true }],
});
before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  const settings = { maintenanceMode: false, guestPurchaseAllowed: true, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT" };
  await prisma.siteSetting.upsert({ where: { id: "site" }, update: settings, create: { id: "site", ...settings } });
});
after(async () => {
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.couponUsage.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  if (orderIds.length) await prisma.emailOutbox.deleteMany({ where: { OR: orderIds.map(id => ({ eventKey: { contains: id } })) } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: [...productIds, ...orderIds] } } });
  await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  if (previousSettings) await prisma.siteSetting.update({ where: { id: "site" }, data: {
    maintenanceMode: previousSettings.maintenanceMode, guestPurchaseAllowed: previousSettings.guestPurchaseAllowed,
    paymentProvider: previousSettings.paymentProvider, btcPriceSource: previousSettings.btcPriceSource,
  } });
  else await prisma.siteSetting.delete({ where: { id: "site" } });
  await prisma.$disconnect();
  await rm(uploads, { recursive: true, force: true });
});
async function product(stockOnHand = 5) {
  const data = input(`stock-${randomBytes(8).toString("hex")}`, stockOnHand);
  const saved = await saveProduct(productSchema.parse(data), actor);
  productIds.push(saved.id);
  return { data, saved, drafts: saved.variants.map(toDraft) };
}
const edit = (fixture, drafts = fixture.drafts) => productSchema.parse({ ...fixture.data, titleKo: "수정", variants: drafts.map(toVariantInput) });
const stock = fixture => prisma.productVariant.findUniqueOrThrow({ where: { id: fixture.saved.variants[0].id } });
async function reserve(variantId) {
  const { quote, token } = await makeQuote({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP" }, null);
  quoteIds.push(quote.id);
  const request = new Request("http://127.0.0.1:3100/api/orders", { method: "POST", headers: {
    origin: "http://127.0.0.1:3100", cookie: `bcs_quote_${quote.id}=${token}`,
    "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"),
  } });
  const { order } = await createOrder(request, {
    quoteId: quote.id, customer: { name: "Fixture", email: `stock-${randomUUID()}@example.invalid`, phone: "" }, locale: "en",
    acceptance: { accepted: true, version: checkoutPolicyVersion("en") },
  }, null);
  orderIds.push(order.id);
  return order;
}
async function sell(variantId) {
  const order = await reserve(variantId);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await resolveManualPayment(order.id, {
    paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision: "PAID", reason: "REVIEW fixture",
  }, actor);
  return order;
}

test("title-only edits preserve stock consumed after the editor opened", async () => {
  // Given a real admin draft at five, followed by an actual sale.
  const fixture = await product();
  const record = (await listAdminProducts()).find(item => item.id === fixture.saved.id);
  fixture.drafts = record.variants.map(toDraft);
  const order = await sell(fixture.saved.variants[0].id);
  // When the stale draft changes only metadata through the real serializer and schema.
  const saved = await saveProduct(edit(fixture), actor, fixture.saved.id);
  // Then the metadata changes, without restoring sold stock or changing settlement.
  assert.equal(saved.titleKo, "수정");
  assert.deepEqual([saved.variants[0].stockOnHand, saved.variants[0].reservedStock], [4, 0]);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
});
test("explicit stale stock edits reject the entire product save", async () => {
  // Given a five-stock draft followed by a sale.
  const fixture = await product();
  await sell(fixture.saved.variants[0].id);
  // When a stale draft explicitly requests six.
  await assert.rejects(saveProduct(edit(fixture, [{ ...fixture.drafts[0], stockOnHand: 6 }]), actor, fixture.saved.id),
    { status: 409, code: "STOCK_CONFLICT" });
  // Then neither quantity nor metadata is overwritten.
  assert.equal((await stock(fixture)).stockOnHand, 4);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: fixture.saved.id } })).titleKo, "재고");
});
for (const initial of [0, 5]) test(`fresh stock adjustment succeeds from ${initial}`, async () => {
  // Given a fresh zero or positive-stock draft.
  const fixture = await product(initial);
  // When stock is explicitly replenished.
  const saved = await saveProduct(edit(fixture, [{ ...fixture.drafts[0], stockOnHand: 8 }]), actor, fixture.saved.id);
  // Then the requested quantity is stored.
  assert.equal(saved.variants[0].stockOnHand, 8);
});
test("stock adjustment cannot fall below reservations made after the editor opened", async () => {
  // Given one reserved item but unchanged on-hand stock.
  const fixture = await product();
  await reserve(fixture.saved.variants[0].id);
  // When the draft requests zero with the correct on-hand baseline.
  await assert.rejects(saveProduct(edit(fixture, [{ ...fixture.drafts[0], stockOnHand: 0 }]), actor, fixture.saved.id),
    { status: 409, code: "STOCK_RESERVED" });
  // Then the reservation and its inventory are preserved.
  const actual = await stock(fixture);
  assert.deepEqual([actual.stockOnHand, actual.reservedStock], [5, 1]);
});
test("new options retain their explicit initial stock", async () => {
  // Given an existing product and a new option draft.
  const fixture = await product();
  const added = { ...newVariant(), sku: `added-${randomBytes(8).toString("hex")}`, stockOnHand: 3 };
  // When the product is saved with both options.
  const saved = await saveProduct(edit(fixture, [...fixture.drafts, added]), actor, fixture.saved.id);
  // Then initial and untouched existing stock are distinct.
  assert.equal(saved.variants.find(item => item.sku === added.sku).stockOnHand, 3);
  assert.equal(saved.variants.find(item => item.id === fixture.saved.variants[0].id).stockOnHand, 5);
});
test("two adjustments from the same stock baseline cannot both succeed", async () => {
  // Given two requests prepared at five.
  const fixture = await product();
  const inputs = [6, 7].map(quantity => edit(fixture, [{ ...fixture.drafts[0], stockOnHand: quantity }]));
  // When both adjustments run against real database locks.
  const results = await Promise.allSettled(inputs.map(value => saveProduct(value, actor, fixture.saved.id)));
  // Then precisely one wins and the other conflicts.
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const rejected = results.find(result => result.status === "rejected");
  assert.equal(rejected.reason.code, "STOCK_CONFLICT");
  const winner = results.find(result => result.status === "fulfilled");
  assert.equal((await stock(fixture)).stockOnHand, winner.value.variants[0].stockOnHand);
});
test("a stale option rejects other option adjustments atomically", async () => {
  // Given two options, with the second sold after drafting.
  const fixture = await product();
  const added = { ...newVariant(), sku: `second-${randomBytes(8).toString("hex")}`, stockOnHand: 3 };
  const saved = await saveProduct(edit(fixture, [...fixture.drafts, added]), actor, fixture.saved.id);
  fixture.drafts = saved.variants.map(toDraft);
  await sell(saved.variants.find(item => item.sku === added.sku).id);
  // When both options are adjusted from their original baselines.
  await assert.rejects(saveProduct(edit(fixture, fixture.drafts.map(draft => ({ ...draft, stockOnHand: draft.stockOnHand + 1 }))), actor, fixture.saved.id),
    { status: 409, code: "STOCK_CONFLICT" });
  // Then the otherwise-valid first option stays unchanged.
  assert.equal((await stock(fixture)).stockOnHand, 5);
});
const variantFields = { sku: "schema", optionLabelKo: "", optionLabelEn: "", billableWeightG: 0, active: true };
for (const [name, variant] of [
  ["existing quantity without baseline", { ...variantFields, id: "existing", stockOnHand: 5 }],
  ["baseline without quantity", { ...variantFields, id: "existing", expectedStockOnHand: 5 }],
  ["new option without initial stock", variantFields],
  ["new option with baseline", { ...variantFields, stockOnHand: 5, expectedStockOnHand: 5 }],
  ["negative baseline", { ...variantFields, id: "existing", stockOnHand: 5, expectedStockOnHand: -1 }],
  ["fractional quantity", { ...variantFields, id: "existing", stockOnHand: 1.5, expectedStockOnHand: 5 }],
]) test(`product schema rejects ${name}`, () => {
  // Given an invalid stock contract. When parsing. Then the boundary rejects it.
  assert.equal(productSchema.safeParse({ ...input("schema"), variants: [variant] }).success, false);
});
