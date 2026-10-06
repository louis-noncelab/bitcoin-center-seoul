import assert from "node:assert/strict";
import test from "node:test";
import { checkoutPolicyEvidence, checkoutPolicyVersion } from "../src/server/orders/checkout-policy.ts";
import { buildPaymentLetter, buildOperatorLetter } from "../src/server/email/payment-letter.ts";
import { nextFulfillment } from "../src/lib/commerce-contract.ts";
import { purchaseKind, ticketEventId } from "../src/lib/commerce-kind.ts";

const item = { titleKo: "테스트 밋업", titleEn: "Test meetup", quantity: 1, sku: "MEETUP-7" };
const order = { id: "meetup-copy", status: "PAID", amountSats: 1000n, amountKrw: 1500n, fulfillment: "PICKUP", confirmationCode: "a".repeat(24), items: [item] };
const contact = { name: "Fixture", email: "fixture@example.invalid", phone: "", address: "" };
const goodsCopy = /상품|배송|반품|포장|재고|\bgoods\b|\bproducts?\b|shipping|delivery|packaging|pickup/i;

for (const locale of ["ko", "en"]) {
  test(`${locale} meetup reception carries only the accepted event policy`, () => {
    const saved = checkoutPolicyEvidence(locale, checkoutPolicyVersion(locale, "meetup"), new Date("2026-10-06T00:00:00Z"), "meetup");
    const result = buildPaymentLetter(locale, "order.created", { ...order, contractAcceptance: saved }, "https://example.invalid/confirm", "SATS", "https://example.invalid");
    assert.doesNotMatch(result.text, goodsCopy);
    assert.doesNotMatch(result.text, /수령/);
    assert.doesNotMatch(result.html, goodsCopy);
    assert(result.text.includes(saved.version));
    assert(result.text.includes(saved.acceptedAt));
    assert.match(result.text, locale === "ko" ? /7일 전|법정/ : /seven days|statutory/i);
  });

  test(`${locale} free registration has no payment or product policy`, () => {
    const saved = checkoutPolicyEvidence(locale, checkoutPolicyVersion(locale, "free_meetup"), new Date("2026-10-06T00:00:00Z"), "free_meetup");
    assert.doesNotMatch(JSON.stringify(saved), goodsCopy);
    assert.match(JSON.stringify(saved), locale === "ko" ? /무료/ : /free/i);
    assert.notEqual(saved.version, checkoutPolicyVersion(locale, "meetup"));
    assert.throws(() => checkoutPolicyEvidence(locale, checkoutPolicyVersion(locale, "goods"), undefined, "meetup"), error => error.code === "POLICY_STALE");
  });
}

test("operator notifications keep paid and free meetup attendance separate from goods", () => {
  for (const [amountSats, kind] of [[1000n, "operator.created"], [1000n, "operator.paid"], [0n, "operator.paid"]]) {
    const result = buildOperatorLetter({ ...order, amountSats }, contact, "https://example.invalid/admin", "SATS", "https://example.invalid", kind);
    assert.doesNotMatch(result.text, goodsCopy);
    assert.doesNotMatch(result.html, goodsCopy);
    assert.match(result.text, /1명/);
  }
  const mixed = buildOperatorLetter({ ...order, items: [item, { titleKo: "도서", titleEn: "Book", quantity: 2, sku: "BOOK" }] }, contact, "https://example.invalid/admin", "SATS", "https://example.invalid", "operator.paid");
  assert.match(mixed.text, /테스트 밋업, 1명/);
  assert.match(mixed.text, /도서, 2개/);
});

test("ticket classification rejects malformed and out-of-range event codes", () => {
  for (const sku of [undefined, null, "MEETUP-", "MEETUP-0", "MEETUP-07", "MEETUP-7BOOK", "MEETUP-2147483648", "MEETUP-9007199254740992"]) assert.equal(ticketEventId(sku), null);
  assert.equal(ticketEventId("MEETUP-2147483647"), 2147483647);
  assert.equal(purchaseKind([]), "goods");
});

test("goods checkout acceptance omits event cancellation and attendance instructions", () => {
  for (const locale of ["ko", "en"]) {
    const saved = checkoutPolicyEvidence(locale, checkoutPolicyVersion(locale));
    assert.doesNotMatch(JSON.stringify(saved), /행사 시작 7일|행사 참여 시|Paid events|event safety|Follow the age, safety/i);
    assert.match(JSON.stringify(saved), locale === "ko" ? /반품/ : /return shipping/i);
  }
});

test("meetup-only records cannot advance through goods fulfillment", () => {
  const record = { status: "PAID", privacyRedactedAt: null, fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", items: [item] };
  assert.equal(nextFulfillment(record), null);
  assert.equal(nextFulfillment({ ...record, items: [{ ...item, sku: "BOOK" }] }), "READY");
  assert.equal(nextFulfillment({ ...record, items: [item, { ...item, sku: "BOOK" }] }), "READY");
});
