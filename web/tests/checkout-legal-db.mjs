import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";

assert.ok(process.env.TEST_DATABASE_URL, "Use an isolated migrated PostgreSQL database.");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
});
const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { decryptPayload } = await import("../src/server/email/index.ts");
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { checkoutDisclosure } = await import("../src/content/checkout-disclosure.ts");
const { termsOfService } = await import("../src/content/legal-terms.ts");
const { refundPolicy } = await import("../src/content/legal-refunds.ts");
const { businessInformation } = await import("../src/content/legal-business.ts");
const prefix = `legal-${randomUUID()}`;
let variantId;
let previousSettings;
const quoteIds = [];
const orderIds = [];

before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  const settings = { maintenanceMode: false, guestPurchaseAllowed: true, paymentProvider: "ZAPRITE" };
  await prisma.siteSetting.upsert({ where: { id: "site" }, update: settings, create: { id: "site", ...settings } });
  const product = await prisma.product.create({ data: {
    slug: prefix, titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "", published: true,
    priceKind: "BTC_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
    variants: { create: { sku: prefix, stockOnHand: 3 } },
  }, include: { variants: true } });
  variantId = product.variants[0].id;
});

after(async () => {
  if (orderIds.length) await prisma.emailOutbox.deleteMany({ where: { OR: orderIds.map((id) => ({ eventKey: { contains: id } })) } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await prisma.productVariant.deleteMany({ where: { id: variantId } });
  await prisma.product.deleteMany({ where: { slug: prefix } });
  if (previousSettings) await prisma.siteSetting.update({ where: { id: "site" }, data: {
    maintenanceMode: previousSettings.maintenanceMode, guestPurchaseAllowed: previousSettings.guestPurchaseAllowed,
    paymentProvider: previousSettings.paymentProvider,
  } });
  else await prisma.siteSetting.delete({ where: { id: "site" } });
  await prisma.$disconnect();
});

test("a fresh order rejects missing or stale acceptance, records exact terms, and preserves evidence on retry", async () => {
  const { quote, token } = await makeQuote({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP" }, null);
  quoteIds.push(quote.id);
  const request = new Request("http://127.0.0.1:3100/api/orders", { method: "POST", headers: {
    origin: "http://127.0.0.1:3100", "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"),
    cookie: `bcs_quote_${quote.id}=${token}`,
  } });
  const base = { quoteId: quote.id, customer: { name: "Tester", email: `${prefix}@example.invalid`, phone: "" }, locale: "ko" };
  await assert.rejects(createOrder(request, base, null), (error) => error.code === "ACCEPTANCE_REQUIRED");
  await assert.rejects(createOrder(request, { ...base, acceptance: { accepted: false, version: checkoutPolicyVersion("ko") } }, null), (error) => error.code === "ACCEPTANCE_REQUIRED");
  await assert.rejects(createOrder(request, { ...base, acceptance: { accepted: true, version: "0".repeat(64) } }, null), (error) => error.code === "POLICY_STALE");
  assert.equal(await prisma.order.count({ where: { quoteId: quote.id } }), 0);
  const input = { ...base, acceptance: { accepted: true, version: checkoutPolicyVersion("ko") } };
  const before = Date.now();
  const first = await createOrder(request, input, null);
  orderIds.push(first.order.id);
  const original = await prisma.order.findUniqueOrThrow({ where: { id: first.order.id } });
  const evidence = original.contractAcceptance;
  assert.equal(first.created, true);
  assert.equal(evidence.version, input.acceptance.version);
  assert.equal(evidence.locale, "ko");
  assert.deepEqual(evidence.disclosure, checkoutDisclosure.ko);
  assert.deepEqual(evidence.terms, termsOfService.ko);
  assert.deepEqual(evidence.refunds, refundPolicy.ko);
  assert.deepEqual(evidence.business, businessInformation.ko);
  assert.ok(new Date(evidence.acceptedAt).getTime() >= before && new Date(evidence.acceptedAt).getTime() <= Date.now());
  const letter = await prisma.emailOutbox.findUniqueOrThrow({ where: { eventKey: `order:${first.order.id}:created` } });
  const mail = decryptPayload(letter.encryptedPayload);
  assert.equal(letter.status, "CAPTURED");
  assert.ok(mail.text.includes(evidence.version));
  assert.ok(mail.text.includes(termsOfService.ko.sections[0].heading));
  assert.ok(mail.text.includes(businessInformation.ko.details[0].value));
  const retry = await createOrder(request, input, null);
  assert.equal(retry.created, false);
  assert.equal(retry.order.id, first.order.id);
  assert.deepEqual((await prisma.order.findUniqueOrThrow({ where: { id: first.order.id } })).contractAcceptance, evidence);
  assert.equal(await prisma.order.count({ where: { quoteId: quote.id } }), 1);
});
