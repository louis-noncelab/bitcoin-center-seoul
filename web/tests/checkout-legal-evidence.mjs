import assert from "node:assert/strict";
import test from "node:test";

const { createOrderSchema } = await import("../src/server/orders/validation.ts");
const { checkoutPolicyVersion, checkoutPolicyEvidence } = await import("../src/server/orders/checkout-policy.ts");

const order = {
  quoteId: "quote_1",
  customer: { name: "Buyer", email: "buyer@example.invalid", phone: "" },
  locale: "ko",
};

test("order input requires an explicit current contract and refund acceptance", () => {
  assert.equal(createOrderSchema.safeParse(order).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, acceptance: { accepted: false, version: "a".repeat(64) } }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, acceptance: { accepted: true, version: "old" } }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, acceptance: { accepted: true, version: checkoutPolicyVersion("ko"), privacyAccepted: true } }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, acceptance: { accepted: true, version: checkoutPolicyVersion("ko") } }).success, true);
});

test("stale terms are refused and accepted evidence contains the exact displayed documents", () => {
  assert.throws(() => checkoutPolicyEvidence("ko", "0".repeat(64)), (error) => error.code === "POLICY_STALE");
  const now = new Date("2026-09-23T12:00:00Z");
  const evidence = checkoutPolicyEvidence("ko", checkoutPolicyVersion("ko"), now);
  assert.equal(evidence.acceptedAt, now.toISOString());
  assert.equal(evidence.version, checkoutPolicyVersion("ko"));
  assert.equal(evidence.locale, "ko");
  assert.match(evidence.terms.title, /약관/);
  assert.match(evidence.refunds.title, /환불/);
  assert.match(evidence.business.title, /사업자/);
  assert.equal(evidence.disclosure.length, 4);
  assert.equal(JSON.stringify(evidence).includes("buyer@example.invalid"), false);
  assert.notEqual(checkoutPolicyVersion("ko"), checkoutPolicyVersion("en"));
});
