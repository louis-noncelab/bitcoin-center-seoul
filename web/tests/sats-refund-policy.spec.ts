import { expect, test } from "@playwright/test";
import { reviewOrigin } from "./helpers/review-runtime";

const order = {
  id: "refund-policy-order", status: "CANCELLED", refundStatus: "PENDING", refundedAt: null,
  customerName: "Refund policy fixture", customerEmail: "fixture@example.invalid", customerPhone: "", locale: "ko",
  amountSats: "1000", amountKrw: "1500", fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null,
  shippingAmountSats: "0", carrier: null, trackingNumber: null, fulfilledAt: null, holdExpiresAt: null,
  createdAt: "2026-09-23T00:00:00.000Z", items: [], privacyRedactedAt: null,
  payments: [{ id: "paid-payment", status: "PAID", mode: "REVIEW", expiresAt: "2026-09-23T00:00:00.000Z", updatedAt: "2026-09-23T00:00:00.000Z", paidAt: "2026-09-23T00:00:00.000Z", creationUnknown: false }],
};

test("refund form offers Bitcoin only and preserves legacy refund history", async ({ page, baseURL }) => {
  // Given an authenticated operator viewing a paid order awaiting an external refund.
  const origin = reviewOrigin(baseURL);
  await page.route("**/api/admin/session", (route) => route.fulfill({ json: { data: { authenticated: true } } }));
  await page.route("**/api/admin/orders?*", (route) => route.fulfill({ json: { data: { items: [order], total: 1, page: 1, pageSize: 50 } } }));
  await page.route("**/api/admin/orders/refund-policy-order/payment", (route) => route.fulfill({ json: { data: [
    { id: "legacy-bank", action: "order.refund.recorded", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z", summary: { method: "BANK", proof: "reference-bank" } },
    { id: "legacy-other", action: "order.refund.recorded", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z", summary: { method: "OTHER", proof: "reference-other" } },
  ] } }));

  // When the operator opens the refund controls.
  await page.goto(`${origin}/ko/admin/orders`);
  await page.getByRole("button", { name: "자세히", exact: true }).click();

  // Then the original satoshi amount and Bitcoin methods are shown, while old records still render.
  await expect(page.getByText(/원결제 1,000 sats 전액/)).toBeVisible();
  await expect(page.getByText(/환불 시점의 원화 시세로 재계산하지 않습니다/)).toBeVisible();
  await expect(page.getByLabel("환불 방식").locator("option")).toHaveText(["라이트닝", "온체인"]);
  await expect(page.getByText("계좌 이체 · reference-bank")).toBeVisible();
  await expect(page.getByText("기타 · reference-other")).toBeVisible();
});

test("redacted order retains payment inspection but hides manual refund entry", async ({ page, baseURL }) => {
  // Given a redacted order with an earlier refund audit.
  const origin = reviewOrigin(baseURL);
  await page.route("**/api/admin/session", (route) => route.fulfill({ json: { data: { authenticated: true } } }));
  await page.route("**/api/admin/orders?*", (route) => route.fulfill({ json: { data: { items: [{ ...order, privacyRedactedAt: "2026-09-24T00:00:00.000Z" }], total: 1, page: 1, pageSize: 50 } } }));
  await page.route("**/api/admin/orders/refund-policy-order/payment", (route) => route.fulfill({ json: { data: [
    { id: "legacy-bank", action: "order.refund.recorded", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z", summary: { method: "BANK", proof: "reference-bank" } },
  ] } }));

  // When the operator opens the order.
  await page.goto(`${origin}/ko/admin/orders`);
  await page.getByRole("button", { name: "자세히", exact: true }).click();

  // Then review controls remain while manual refund creation is unavailable.
  await expect(page.getByRole("button", { name: "결제 상태 다시 확인" })).toBeVisible();
  await expect(page.getByText("계좌 이체 · reference-bank")).toBeVisible();
  await expect(page.getByLabel("환불 방식")).toHaveCount(0);
  await expect(page.getByLabel("수동 처리 사유")).toHaveCount(0);
});
