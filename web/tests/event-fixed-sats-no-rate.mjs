import assert from "node:assert/strict";
import test from "node:test";

process.env.TEST_NO_REVIEW_RATE = "1";
delete process.env.REVIEW_KRW_PER_BTC;
const { fixture, quoteFor, fromQuote } = await import("./event-integrity-fixture.mjs");

test("fixed-satoshi meetup creates a REVIEW order without an exchange rate", async () => {
  const { variant: satsVariant } = await fixture({ ticketPriceKrw: "", ticketPriceSats: "21000" });
  const quoted = await quoteFor(satsVariant, 2);
  const { order } = await fromQuote(quoted);
  assert.equal(quoted.quote.amountSats, "42000");
  assert.equal(quoted.quote.amountKrw, null);
  assert.equal(quoted.quote.snapshot.rate, null);
  assert.equal(quoted.quote.snapshot.amountKrw, null);
  assert.equal(order.amountSats, "42000");
  assert.equal(order.amountKrw, null);
});

test("KRW-priced meetup still requires an exchange rate", async () => {
  const { variant: krwVariant } = await fixture({ ticketPriceKrw: "1500" });
  await assert.rejects(quoteFor(krwVariant), { code: "REVIEW_RATE_REQUIRED" });
});
