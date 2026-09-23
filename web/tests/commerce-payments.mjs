// Commerce + payment regression checks.
//
// Runs against an explicitly selected isolated PostgreSQL database in REVIEW mode, so no
// provider is contacted. Run with:
//   TEST_DATABASE_URL=postgresql://localhost/bcs_test npm run test:commerce
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";

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
process.env.ZAPRITE_API_KEY = "test-key";
process.env.ZAPRITE_WEBHOOK_SECRET = "test-secret";
process.env.ZAPRITE_ORG_ID = "org_test";

const { krwToSats, satsToKrw, parseUpbitRate, parseBithumbRate, rateFromSources } = await import("../src/server/money.ts");
const { validateBolt11 } = await import("../src/server/payments/bolt11.ts");
const { readZapriteInvoice, bindZapriteInvoice } = await import("../src/server/payments/zaprite.ts");
const { verifyZapriteWebhookToken } = await import("../src/server/payments/webhook.ts");
const { PaymentError } = await import("../src/server/payments/types.ts");
const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { ensureInvoice, reconcilePayment } = await import("../src/server/payments/index.ts");

const prefix = `t${Date.now().toString(36)}`;
const seeded = { productId: "", variantId: "", zoneId: "" };

before(async () => {
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    update: { btcPriceSource: "UPBIT", paymentProvider: "ZAPRITE" },
    create: { id: "site", btcPriceSource: "UPBIT", paymentProvider: "ZAPRITE" },
  });
  const product = await prisma.product.create({
    data: {
      slug: `${prefix}-book`, titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "",
      published: true, priceKind: "KRW_FIXED", priceAmount: 30_000n,
      allowedFulfillments: ["PICKUP", "DOMESTIC"],
      variants: { create: { sku: `${prefix}-SKU`, stockOnHand: 5, billableWeightG: 500 } },
    },
    include: { variants: true },
  });
  seeded.productId = product.id;
  seeded.variantId = product.variants[0].id;
  const zone = await prisma.shippingZone.create({
    data: {
      nameKo: "국내", nameEn: "Domestic",
      countries: { create: { code: "KR", requiresPostalCode: true } },
      rates: { create: { maxWeightG: 2000, amountKrw: 3_000n } },
    },
  });
  seeded.zoneId = zone.id;
});

after(async () => {
  await prisma.paymentEvent.deleteMany({ where: { payment: { order: { items: { some: { variantId: seeded.variantId } } } } } });
  await prisma.payment.deleteMany({ where: { order: { items: { some: { variantId: seeded.variantId } } } } });
  await prisma.orderItem.deleteMany({ where: { variantId: seeded.variantId } });
  const { customerEmailHash } = await import("../src/server/privacy.ts");
  const email = `${prefix}@example.invalid`;
  const ordersForMail = await prisma.order.findMany({ where: { OR: [{ customerEmail: email }, { customerEmailHash: customerEmailHash(email) }] }, select: { id: true } });
  if (ordersForMail.length) await prisma.emailOutbox.deleteMany({ where: { OR: ordersForMail.map(({ id }) => ({ eventKey: { contains: id } })) } });
  await prisma.order.deleteMany({ where: { OR: [{ customerEmail: email }, { customerEmailHash: customerEmailHash(email) }] } });
  await prisma.quote.deleteMany({ where: { ownerHash: { not: null }, snapshot: { path: ["items", "0", "sku"], equals: `${prefix}-SKU` } } });
  await prisma.productVariant.deleteMany({ where: { sku: `${prefix}-SKU` } });
  await prisma.product.deleteMany({ where: { slug: `${prefix}-book` } });
  await prisma.shippingCountry.deleteMany({ where: { zoneId: seeded.zoneId } });
  await prisma.shippingRate.deleteMany({ where: { zoneId: seeded.zoneId } });
  await prisma.shippingZone.deleteMany({ where: { id: seeded.zoneId } });
  await prisma.$disconnect();
});

test("KRW converts to satoshis by ceiling, never truncating the center's price", () => {
  // 1 BTC = 150,000,000 KRW -> 1 KRW = 0.6666... sats, so 1 KRW must round up to 1 sat.
  assert.equal(krwToSats(1n, "150000000"), 1n);
  assert.equal(krwToSats(150_000_000n, "150000000"), 100_000_000n);
  assert.equal(krwToSats(3n, "150000000"), 2n);
  assert.equal(krwToSats(0n, "150000000"), 0n);
  // Fractional rates keep full precision through BigInt arithmetic.
  assert.equal(krwToSats(1n, "150000000.5"), 1n);
  assert.equal(satsToKrw(100_000_000n, "150000000"), 150_000_000n);
  assert.throws(() => krwToSats(1n, "0"), (error) => error.code === "INVALID_MONEY");
  assert.throws(() => krwToSats(-1n, "150000000"), (error) => error.code === "INVALID_MONEY");
});

test("exchange tickers are rejected unless the quote is fresh", () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  const upbit = [{ market: "KRW-BTC", trade_price: 150_000_000, trade_timestamp: now, timestamp: now }];
  assert.equal(parseUpbitRate(upbit, now).krwPerBtc, "150000000");
  assert.equal(parseUpbitRate(upbit, now).source, "upbit:KRW-BTC");
  // Two minutes stale must not be used to price an order.
  assert.throws(() => parseUpbitRate(upbit, now + 120_000), (error) => error.code === "RATE_UNAVAILABLE");
  const bithumb = { status: "0000", data: { closing_price: "150000000.0000", date: String(now) } };
  assert.equal(parseBithumbRate(bithumb, now).krwPerBtc, "150000000");
  assert.throws(() => parseBithumbRate({ status: "5600", data: {} }, now), (error) => error.code === "RATE_UNAVAILABLE");
  const cached = { krwPerBtc: "149000000", source: "upbit:KRW-BTC", timestamp: new Date(now - 300_000) };
  assert.equal(rateFromSources({ krwPerBtc: "150000000", source: "bithumb:BTC_KRW", timestamp: new Date(now) }, cached).source, "bithumb:BTC_KRW");
  const fallback = rateFromSources(null, cached, now);
  assert.equal(fallback.krwPerBtc, "149000000");
  assert.equal(fallback.source, "cache:upbit:KRW-BTC");
  assert.equal(fallback.timestamp.toISOString(), cached.timestamp.toISOString());
  assert.throws(() => rateFromSources(null, null), (error) => error.code === "RATE_UNAVAILABLE");
});

// Real 10-sat invoices captured from live lightning addresses on 2026-09-21. LUD-06 lets a payer
// server describe the payment either way, so both forms must parse whatever address is configured.
// `plainDescription` is the form the configured address (oksu.su) uses, and the earlier parser
// rejected it outright; `hashedDescription` came from another provider and covers the other branch.
const plainDescription = {
  pr: "lnbc100n1p4tzqmupp5vcdcad2697q3ky76xk54x48qjy466ucayz55a8aph47hchyma6yqdqs2pshjgr5dusxycmncqzysxqrrsssp5s0nwrnuxwu3eec8py07g20pc5cwvr67mehz9pfy2smcg4axst4cq9qxpqysgquejvmf7z7h9t6ts6kmsw5whka6t72xs909f435zayz0uua8v20spvw0yh4rj4lkj345wtpvqk38wj4pzjc0tgfzzfudlfdmx8lmhe4gqnl43f0",
  metadata: '[["text/plain","Pay to bcs"]]',
};
const hashedDescription = {
  pr: "lnbc100n1p4tzqmapp54y9wcveatqxwzus3l80we97j4g6gglmr4rmcuatxzzn6l9ch6qxqsp5uzz8yjpamhdy5vcv8rjgwznrhu2et2avv8urtduxw7hale2cy6zqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpuhp5aef9rffs5g7xf2d3w8nu8md987zqz0y6ek9t29pgxmm00s5204hq9qyyssq3ft9a4t5tycjcgtlj8pwyzdn2988890q9qq06nngzcd0c08qkmnxwyfx978zz7pxx5reee9xwhx0xl539jejuv48667q47vqr9jshucpvyyg4p",
  metadata: '[["text/plain","Pay to bcs@blink.sv"],["text/identifier","bcs@blink.sv"]]',
};

test("both LUD-06 description forms are accepted", () => {
  const plain = validateBolt11(plainDescription.pr, { amountSats: 10n, review: false, metadata: plainDescription.metadata });
  assert.match(plain.paymentHash, /^[0-9a-f]{64}$/);
  const hashed = validateBolt11(hashedDescription.pr, { amountSats: 10n, review: false, metadata: hashedDescription.metadata });
  assert.match(hashed.paymentHash, /^[0-9a-f]{64}$/);
});

test("a committed description hash must match the served metadata", () => {
  assert.throws(
    () => validateBolt11(hashedDescription.pr, { amountSats: 10n, review: false, metadata: '[["text/plain","other"]]' }),
    (error) => error instanceof PaymentError && error.code === "BOLT11_METADATA_MISMATCH",
  );
});

test("an invoice for the wrong amount is refused", () => {
  assert.throws(
    () => validateBolt11(hashedDescription.pr, { amountSats: 11n, review: false, metadata: hashedDescription.metadata }),
    (error) => error instanceof PaymentError && error.code === "BOLT11_QUOTE_MISMATCH",
  );
  // Mainnet invoices must never satisfy a REVIEW payment, which is testnet-only.
  assert.throws(
    () => validateBolt11(hashedDescription.pr, { amountSats: 10n, review: true, metadata: hashedDescription.metadata }),
    (error) => error instanceof PaymentError && error.code === "BOLT11_QUOTE_MISMATCH",
  );
});

function zapriteContext(order, payment = {}) {
  return {
    payment: {
      id: "pay_1", externalId: "od_1", amountSats: 1000n, mode: "LIVE",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"), orderId: "ord_1", bookingId: null,
      creationKey: "ck_1", ...payment,
    },
    receiver: { provider: "ZAPRITE", url: "https://api.zaprite.com", accountId: "default" },
    transport: async () => order,
  };
}
const zapriteOrder = {
  id: "od_1", orgId: "org_test", checkoutUrl: "https://pay.zaprite.com/order/od_1",
  status: "PENDING", totalAmount: 1000, currency: "BTC", externalUniqId: "pay_1",
  expiresAt: "2026-10-01T00:00:00.000Z",
};

test("Zaprite order statuses map to payment observations", async () => {
  const cases = [["PENDING", "PENDING"], ["PROCESSING", "PROCESSING"], ["PAID", "PAID"], ["COMPLETE", "PAID"], ["OVERPAID", "PAID"]];
  for (const [status, expected] of cases) {
    const observed = await readZapriteInvoice(zapriteContext({ ...zapriteOrder, status }));
    assert.equal(observed.status, expected, `${status} should observe as ${expected}`);
  }
  const underpaid = await readZapriteInvoice(zapriteContext({ ...zapriteOrder, status: "UNDERPAID" }));
  assert.equal(underpaid.status, "REVIEW");
  assert.equal(underpaid.reason, "UNDERPAYMENT");
  // ABANDONED is documented on the list filter; parsing it must not throw.
  const abandoned = await readZapriteInvoice(zapriteContext({ ...zapriteOrder, status: "ABANDONED" }));
  assert.equal(abandoned.status, "EXPIRED");
});

test("a Zaprite order is refused when it is not ours", async () => {
  await assert.rejects(
    readZapriteInvoice(zapriteContext({ ...zapriteOrder, orgId: "org_other" })),
    (error) => error instanceof PaymentError && error.code === "ZAPRITE_ORG_MISMATCH",
  );
  await assert.rejects(
    readZapriteInvoice(zapriteContext({ ...zapriteOrder, externalUniqId: "pay_other" })),
    (error) => error instanceof PaymentError && error.code === "ZAPRITE_ORDER_MISMATCH",
  );
  // A checkout link outside zaprite.com would send the customer somewhere else entirely.
  await assert.rejects(
    readZapriteInvoice(zapriteContext({ ...zapriteOrder, checkoutUrl: "https://pay.zaprite.com.evil.test/order/od_1" })),
    (error) => error instanceof PaymentError && error.code === "UNTRUSTED_PROVIDER_URL",
  );
});

test("the amount Zaprite will charge must equal the amount quoted", async () => {
  await assert.rejects(
    bindZapriteInvoice(zapriteContext(zapriteOrder), { ...zapriteOrder, totalAmount: 999 }),
    (error) => error instanceof PaymentError && error.code === "ZAPRITE_AMOUNT_MISMATCH",
  );
  const bound = await bindZapriteInvoice(zapriteContext(zapriteOrder), zapriteOrder);
  assert.equal(bound.externalId, "od_1");
  assert.equal(bound.checkoutUrl, "https://pay.zaprite.com/order/od_1");
});

test("the webhook path secret is compared without leaking its length", () => {
  assert.equal(verifyZapriteWebhookToken("test-secret", "test-secret"), true);
  assert.equal(verifyZapriteWebhookToken("test-secrel", "test-secret"), false);
  assert.equal(verifyZapriteWebhookToken("short", "test-secret"), false);
  assert.equal(verifyZapriteWebhookToken("", "test-secret"), false);
  assert.equal(verifyZapriteWebhookToken("test-secret-longer", "test-secret"), false);
});

function guestRequest(secret, key) {
  return new Request("http://127.0.0.1:3100/api/orders", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3100", "idempotency-key": key, "x-request-secret": secret },
  });
}

test("cart to paid order holds then consumes stock", async () => {
  const cart = { items: [{ variantId: seeded.variantId, quantity: 2 }], fulfillment: "DOMESTIC", countryCode: "KR" };
  const { quote, token } = await makeQuote(cart, null);

  // 2 x 30,000 KRW goods + 3,000 KRW shipping = 63,000 KRW at 150,000,000 KRW/BTC.
  assert.equal(quote.snapshot.amountKrw, "63000");
  assert.equal(quote.amountSats, krwToSats(63_000n, "150000000").toString());
  assert.equal(quote.snapshot.rate.source, "review:fixture");
  assert.equal(quote.snapshot.rounding, "CEILING_TO_SAT");

  const secret = randomBytes(32).toString("base64url");
  const request = guestRequest(secret, randomUUID());
  request.headers.set("cookie", `bcs_quote_${quote.id}=${token}`);
  const created = await createOrder(request, {
    quoteId: quote.id,
    customer: { name: "Tester", email: `${prefix}@example.invalid`, phone: "010-0000-0000" },
    locale: "ko",
    address: { countryCode: "KR", postalCode: "04000", region: "서울", city: "마포구", line1: "와우산로", line2: "" },
  }, null);
  assert.equal(created.created, true);
  assert.equal(created.order.amountSats, quote.amountSats);

  const held = await prisma.productVariant.findUniqueOrThrow({ where: { id: seeded.variantId } });
  assert.equal(held.reservedStock, 2, "creating the order must reserve stock");
  assert.equal(held.stockOnHand, 5, "stock is only consumed once payment is confirmed");

  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: created.order.id } });
  assert.equal(payment.mode, "REVIEW");
  assert.equal(payment.provider, "ZAPRITE");
  assert.equal(payment.amountSats.toString(), quote.amountSats);

  const issued = await ensureInvoice(payment.id);
  assert.equal(issued.status, "PENDING");
  assert.ok(issued.externalId, "an invoice must carry the provider order id");

  // Keep the receiver snapshot issuing pinned to the payment; replacing it is a fail-closed change.
  await prisma.payment.update({
    where: { id: payment.id },
    data: { metadata: { ...issued.metadata, reviewScenario: "paid" } },
  });
  const settled = await reconcilePayment(payment.id, `test:${payment.id}`);
  assert.equal(settled.status, "PAID");

  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.order.id } });
  assert.equal(order.status, "PAID");
  const sold = await prisma.productVariant.findUniqueOrThrow({ where: { id: seeded.variantId } });
  assert.equal(sold.stockOnHand, 3, "payment must consume the reserved stock");
  assert.equal(sold.reservedStock, 0, "the hold must be released once consumed");

  // A repeated delivery of the same provider event must not settle the order twice.
  const again = await reconcilePayment(payment.id, `test:${payment.id}`);
  assert.equal(again.status, "PAID");
  const unchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: seeded.variantId } });
  assert.equal(unchanged.stockOnHand, 3, "a duplicate event must not decrement stock again");
});

test("a quote is refused once a product runs short", async () => {
  const cart = { items: [{ variantId: seeded.variantId, quantity: 99 }], fulfillment: "PICKUP" };
  const { quote, token } = await makeQuote(cart, null);
  const request = guestRequest(randomBytes(32).toString("base64url"), randomUUID());
  request.headers.set("cookie", `bcs_quote_${quote.id}=${token}`);
  await assert.rejects(
    createOrder(request, {
      quoteId: quote.id,
      customer: { name: "Tester", email: `${prefix}@example.invalid`, phone: "" },
      locale: "ko",
    }, null),
    (error) => error.code === "OUT_OF_STOCK",
  );
});
