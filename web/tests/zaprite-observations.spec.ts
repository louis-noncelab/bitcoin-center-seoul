import { expect, test } from "@playwright/test";
import { reviewOrigin } from "./helpers/review-runtime";

const order = {
  id: "zaprite-observation-order", status: "PENDING_PAYMENT", refundStatus: "NONE", refundedAt: null,
  customerName: "Zaprite fixture", customerEmail: "fixture@example.invalid", customerPhone: "", locale: "ko",
  amountSats: "1000", amountKrw: null, fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null,
  shippingAmountSats: "0", carrier: null, trackingNumber: null, fulfilledAt: null,
  holdExpiresAt: "2030-01-01T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z",
  items: [], privacyRedactedAt: null,
  payments: [{ id: "fixture-payment", status: "PROCESSING", mode: "REVIEW", expiresAt: "2030-01-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", paidAt: null, creationUnknown: false }],
};
const reference = `fixture-${"a".repeat(450)}`;
const observation = {
  id: "observation-1", paymentId: "fixture-payment", createdAt: "2026-10-01T00:00:00.000Z",
  summary: { status: "PROCESSING", reason: null, zaprite: {
    orderId: "provider-order-1", status: "PROCESSING", expiresAt: "2030-01-01T00:00:00.000Z",
    transactions: [{ id: "tx-1", status: "PENDING", method: "BITCOIN", externalRef: reference, amountInOrderCurrency: 1000 }],
  } },
};

for (const width of [375, 768, 1440]) {
  test(`Zaprite evidence renders and refreshes without a payment version change at ${width}px`, async ({ page, baseURL }) => {
    // Given provider evidence with a long reference and the existing processing guard.
    await page.setViewportSize({ width, height: 1000 });
    let refreshed = false;
    await page.route("**/api/admin/session", route => route.fulfill({ json: { data: { authenticated: true } } }));
    await page.route("**/api/admin/orders?*", route => route.fulfill({ json: { data: { items: [order], total: 1, page: 1, pageSize: 50 } } }));
    await page.route("**/api/admin/orders/zaprite-observation-order/payment", route => {
      if (route.request().method() === "PATCH") {
        refreshed = true;
        return route.fulfill({ json: { data: order } });
      }
      return route.fulfill({ json: { data: [] } });
    });
    await page.route("**/api/admin/orders/zaprite-observation-order/payment-observations", route => route.fulfill({ json: { data: [
      refreshed ? {
        ...observation, id: "observation-2",
        summary: { status: "EXPIRED", reason: null, zaprite: {
          ...observation.summary.zaprite, status: "ABANDONED",
          transactions: [{ ...observation.summary.zaprite.transactions[0], status: "CANCELED" }],
        } },
      } : observation,
    ] } }));
    await page.goto(`${reviewOrigin(baseURL)}/ko/admin/orders`);
    await page.getByRole("button", { name: "자세히", exact: true }).click();
    const evidence = page.locator('[data-provider="ZAPRITE"]');
    await expect(evidence.locator('[data-order-status="PROCESSING"]')).toBeVisible();
    await expect(evidence.locator('[data-transaction-status="PENDING"]')).toHaveCount(1);
    await expect(evidence.getByText(reference, { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await evidence.evaluate(element => {
      const row = element.closest(".events-admin-workspace > .events-admin-list > li");
      return row !== null && element.getBoundingClientRect().width >= row.getBoundingClientRect().width * 0.8;
    })).toBe(true);

    // When refresh returns new evidence while leaving the payment status/version unchanged.
    const observed = page.waitForResponse(response => response.url().endsWith("/payment-observations") && response.request().method() === "GET");
    await page.getByRole("button", { name: "결제 상태 다시 확인", exact: true }).click();
    await observed;

    // Then the new record appears and the existing cancellation guard remains.
    await expect(evidence.locator('[data-order-status="ABANDONED"]')).toBeVisible();
    await expect(evidence.locator('[data-transaction-status="CANCELED"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "미입금 확인 후 취소", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "접기", exact: true }).click();
    await expect(evidence).toHaveCount(0);
  });
}
