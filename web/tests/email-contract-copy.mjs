import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymentLetter } from "../src/server/email/payment-letter.ts";
import { checkoutPolicyEvidence, checkoutPolicyVersion } from "../src/server/orders/checkout-policy.ts";

const order = {
  id: "contract-copy-test", status: "PENDING_PAYMENT", amountSats: 1000n,
  amountKrw: 1500n, confirmationCode: "confirmation", fulfillment: "PICKUP",
  items: [{ titleKo: "책", titleEn: "Book", quantity: 1, sku: "BOOK" }],
};
const letter = (input, kind = "order.created") => buildPaymentLetter("ko", kind, input, "https://example.invalid/confirm", "SATS", "https://example.invalid");

test("customer email carries the saved contract and escapes its HTML", () => {
  const saved = checkoutPolicyEvidence("ko", checkoutPolicyVersion("ko"), new Date("2026-09-23T00:00:00Z"));
  saved.terms = { title: "historical-contract-01", description: "<img src=x onerror=alert(1)>", sections: [] };
  const result = letter({ ...order, contractAcceptance: saved });
  assert.ok(result.text.includes(saved.terms.title));
  assert.ok(result.text.includes(saved.terms.description));
  assert.ok(result.text.includes(saved.version));
  assert.ok(result.text.includes(saved.acceptedAt));
  for (const section of saved.refunds.sections) assert.ok(result.text.includes(section.heading));
  assert.ok(result.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!result.html.includes(saved.terms.description));
});

test("legacy order emails do not fabricate a historical acceptance", () => {
  const without = letter(order);
  const legacy = letter({ ...order, contractAcceptance: null });
  assert.deepEqual(without, legacy);
  assert.ok(!without.text.includes(checkoutPolicyVersion("ko")));
});

test("later payment notices do not re-render or validate contract content", () => {
  assert.deepEqual(letter({ ...order, contractAcceptance: { corrupted: true } }, "order.paid"), letter(order, "order.paid"));
});
