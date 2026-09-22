import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? "http://127.0.0.1:3147";
test.describe.configure({ mode: "serial" });
const version = "2026-09-21T00:00:00.000Z";
const order = {
  id: "manual-order", status: "REVIEW", customerName: "수동 확인", customerEmail: "manual@example.invalid", customerPhone: "", locale: "ko",
  amountSats: "1000", fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null,
  shippingAmountSats: "0", carrier: null, trackingNumber: null, fulfilledAt: null, holdExpiresAt: version,
  createdAt: version, items: [], payments: [{ id: "manual-payment", status: "REVIEW", mode: "LIVE", expiresAt: version, updatedAt: version, paidAt: null, creationUnknown: false }],
};

async function openOrder(page: Page) {
  const { password } = z.object({ password: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/commerce-fixes/runtime.json", import.meta.url), "utf8")));
  expect((await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password } })).ok()).toBe(true);
  await page.route(/\/api\/admin\/orders(?:\?.*)?$/, (route) => route.fulfill({ json: { data: { items: [order], total: 1, page: 1, pageSize: 50 } } }));
  await page.route("**/api/admin/orders/manual-order/payment", (route) => route.request().method() === "GET"
    ? route.fulfill({ json: { data: [] } }) : route.fallback());
  await page.goto(`${origin}/ko/admin/orders`);
  await page.getByRole("button", { name: "자세히", exact: true }).click();
}

test("manual payment requires a reason and explicit confirmation, preserving the reason after cancellation", async ({ page }) => {
  // Given an order requiring payment review.
  await openOrder(page);
  const action = page.getByRole("button", { name: "입금 확인 후 결제 완료", exact: true });
  await expect(action).toBeDisabled();
  await page.getByLabel("수동 처리 사유", { exact: true }).fill("제공자 내역에서 전액 입금 확인");
  // When the operator declines the confirmation.
  await action.click();
  await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
  // Then no operation is submitted and the draft remains available.
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "수동 처리 사유", exact: true })).toHaveValue("제공자 내역에서 전액 입금 확인");
});

test("manual payment rejects stale data without losing the operator reason", async ({ page }) => {
  // Given a state changed by a webhook after the page loaded.
  await openOrder(page);
  const requests: unknown[] = [];
  await page.route("**/api/admin/orders/manual-order/payment", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 409, json: { error: { code: "PAYMENT_STALE" } } });
  });
  await page.getByLabel("수동 처리 사유", { exact: true }).fill("입금 확인 근거");
  // When the operator confirms the stale decision.
  await page.getByRole("button", { name: "입금 확인 후 결제 완료", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "결제 완료로 처리", exact: true }).click();
  // Then the server version is included, a state conflict appears and the reason stays.
  await expect(page.locator(".events-error[role=alert]")).toContainText("결제 상태");
  expect(requests).toEqual([{ paymentId: "manual-payment", expectedPaymentUpdatedAt: version, decision: "PAID", reason: "입금 확인 근거" }]);
  await expect(page.getByRole("textbox", { name: "수동 처리 사유", exact: true })).toHaveValue("입금 확인 근거");
  await expect(page.getByRole("button", { name: "최신 주문 불러오기", exact: true })).toBeVisible();
});
