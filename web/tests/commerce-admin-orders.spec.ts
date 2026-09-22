import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { z } from "zod";

function reviewOrigin(baseURL: string | undefined): string {
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? process.env.COMMERCE_BASE_URL ?? baseURL;
  if (!origin) throw new Error("Playwright baseURL is unset");
  return origin;
}

async function adminPassword(): Promise<string> {
  const credentials = process.env.COMMERCE_REVIEW_CREDENTIALS;
  if (credentials) {
    const { password } = z.object({ password: z.string() }).parse(JSON.parse(await readFile(credentials, "utf8")));
    return password;
  }
  const { ADMIN_PASSWORD } = z.object({ ADMIN_PASSWORD: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
  return ADMIN_PASSWORD;
}

async function authenticate(page: Page, origin: string) {
  const password = await adminPassword();
  const result = await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password } });
  expect(result.status(), `admin login failed with HTTP ${result.status()}`).toBe(200);
}

const order = (id: string) => ({
  id, status: "PAID", refundStatus: "NONE", customerName: id, customerEmail: "review@example.invalid", customerPhone: "", locale: "ko",
  amountSats: "1000", amountKrw: null, fulfillment: "DOMESTIC", fulfillmentStatus: "SHIPPED", address: null,
  shippingAmountSats: "0", carrier: "기존 택배", trackingNumber: "OLD-123", fulfilledAt: null, holdExpiresAt: null,
  createdAt: "2026-09-21T01:00:00.000Z", items: [], payments: [],
});

async function setup(page: Page, baseURL: string | undefined) {
  const origin = reviewOrigin(baseURL);
  const queries: URL[] = [];
  await page.route("**/api/admin/orders/*/payment", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/admin/orders?*", (route) => {
    const url = new URL(route.request().url());
    queries.push(url);
    return route.fulfill({ json: { data: { items: [order("주문 하나"), order("주문 둘")], total: 51, page: Number(url.searchParams.get("page") || 1), pageSize: 50 } } });
  });
  await authenticate(page, origin);
  await page.goto(`${origin}/ko/admin/orders`);
  await expect(page.getByRole("heading", { name: "주문 목록" })).toBeVisible();
  return { queries, origin };
}

async function chooseFulfillment(page: Page, option: string, value: string) {
  const field = page.locator("label").filter({ hasText: "수령 방식" });
  await field.getByRole("button").click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(field.locator('input[name="fulfillment"]')).toHaveValue(value);
}

test("search, fulfillment, dates, page and CSV keep the same query and support Back", async ({ page, baseURL }) => {
  const { queries, origin } = await setup(page, baseURL);
  await page.getByLabel("주문 검색", { exact: true }).fill("도서");
  await chooseFulfillment(page, "국내 택배", "DOMESTIC");
  await page.getByLabel("시작일 (한국 시간)", { exact: true }).fill("2026-09-01");
  await page.getByLabel("종료일 (한국 시간)", { exact: true }).fill("2026-09-21");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page).toHaveURL(/q=.*fulfillment=DOMESTIC.*from=2026-09-01.*to=2026-09-21/);
  await page.getByRole("button", { name: "다음 페이지" }).click();
  await expect(page).toHaveURL(/page=2/);
  const csv = new URL(await page.getByRole("link", { name: "CSV 내려받기" }).getAttribute("href") ?? "", origin);
  expect(csv.searchParams.get("q")).toBe("도서");
  expect(csv.searchParams.get("fulfillment")).toBe("DOMESTIC");
  expect(csv.searchParams.get("format")).toBe("csv");
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByLabel("주문 검색", { exact: true })).toHaveValue("도서");
  expect(queries.some((url) => url.searchParams.get("page") === "2")).toBe(true);
});

test("filter and browser Back protect drafts and failed tracking saves preserve the original CAS", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.getByRole("button", { name: "결제 완료", exact: true }).click();
  const first = page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: "주문 하나", exact: false }) });
  await first.getByRole("button", { name: "자세히", exact: true }).click();
  await first.getByLabel("송장 번호", { exact: true }).fill("NEW-123");
  await page.getByRole("button", { name: "다음 페이지" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
  await expect(first.getByLabel("송장 번호", { exact: true })).toHaveValue("NEW-123");
  await page.goBack();
  await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
  await expect(page).toHaveURL(/status=PAID/);
  let submitted: unknown;
  await page.route("**/api/admin/orders/*/tracking", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 409, json: { error: { code: "STALE_ORDER", message: "송장 정보가 변경되었습니다." } } });
  });
  await first.getByRole("button", { name: "송장 수정 저장" }).click();
  await expect(page.locator(".events-error")).toBeVisible();
  expect(submitted).toEqual({ carrier: "기존 택배", trackingNumber: "NEW-123", expectedCarrier: "기존 택배", expectedTrackingNumber: "OLD-123" });
  await expect(first.getByLabel("송장 번호", { exact: true })).toHaveValue("NEW-123");
  await page.getByRole("button", { name: "다음 페이지" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "버리기", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
});
