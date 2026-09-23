import assert from "node:assert/strict";
import test from "node:test";
import { orderPaymentHistory, refundMethodLabels, refundRecordingMethods } from "../src/lib/order-payment-contract.ts";

test("authorized order history retains unpaid reconciliation evidence without unrelated summary data", () => {
  // Given a manual unpaid cancellation audit with a provider lookup reference.
  const rows = [{
    id: "audit-1", action: "order.payment.manual", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z",
    summary: {
      reason: "제공자 확인", decision: "CANCELLED",
      unpaidEvidence: { providerReference: "payment-hash-qa", pendingHtlcsCleared: true },
      unrelatedSecret: "omit-this",
    },
  }];
  // When the authorized per-order history is projected.
  const projected = orderPaymentHistory.parse(rows);
  // Then the operator's evidence survives and unrelated summary data does not.
  assert.deepEqual(projected[0].summary.unpaidEvidence, { providerReference: "payment-hash-qa", pendingHtlcsCleared: true });
  assert.equal("unrelatedSecret" in projected[0].summary, false);
});

test("new refund choices are Bitcoin only while historic bank and other records remain readable", () => {
  // Given refund records written before the new method policy.
  const rows = ["BANK", "OTHER"].map((method, index) => ({
    id: `audit-${index}`, action: "order.refund.recorded", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z",
    summary: { method, proof: `reference-${index}` },
  }));
  // When the admin history contract parses those records.
  const projected = orderPaymentHistory.parse(rows);
  // Then old records retain their method labels, but neither is offered for a new refund.
  assert.deepEqual(projected.map((row) => refundMethodLabels[row.summary.method]), ["계좌 이체", "기타"]);
  assert.deepEqual(refundRecordingMethods, ["LIGHTNING", "ONCHAIN"]);
});
