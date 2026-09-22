import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";

test.describe.configure({ mode: "serial" });

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

async function login(page: Page, path: string, baseURL: string | undefined) {
  const origin = reviewOrigin(baseURL);
  const password = await adminPassword();
  const result = await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password } });
  expect(result.status(), `admin login failed with HTTP ${result.status()}`).toBe(200);
  await page.goto(`${origin}/ko${path}`);
  return origin;
}

function sidebar(page: Page) {
  return page.getByRole("navigation", { name: "관리자 메뉴", exact: true });
}

function discardDialog(page: Page) {
  return page.getByRole("dialog", { name: "변경사항을 버릴까요?" });
}

async function answerDiscard(page: Page, name: "취소" | "버리기") {
  const dialog = discardDialog(page);
  await dialog.getByRole("button", { name, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function beforeUnloadBlocked(page: Page) {
  return page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
}

test("keeps product edits when leaving is cancelled and discards only after confirmation", async ({ page, baseURL }) => {
  // Given an unsaved product.
  const origin = await login(page, "/admin/products", baseURL);
  await page.getByRole("button", { name: "상품 등록", exact: true }).click();
  await page.getByLabel("상품명", { exact: true }).fill("임시 상품");
  // When leaving the editor is cancelled.
  await page.locator("form").getByRole("button", { name: "취소", exact: true }).click();
  await expect(discardDialog(page)).toBeVisible();
  await answerDiscard(page, "취소");
  // Then the draft remains, and confirmed discard returns to the list so the orders link can open.
  await expect(page.getByLabel("상품명", { exact: true })).toHaveValue("임시 상품");
  await expect(page).toHaveURL(`${origin}/ko/admin/products`);
  await page.locator("form").getByRole("button", { name: "취소", exact: true }).click();
  await answerDiscard(page, "버리기");
  await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
  await expect(page.getByLabel("상품명")).toHaveCount(0);
  await sidebar(page).getByRole("link", { name: "주문", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/ko/admin/orders`);
  await expect(page.getByRole("heading", { name: "주문 목록" })).toBeVisible();
});

test("admin menu opens the product workspace", async ({ page, baseURL }) => {
  // Given the admin shell.
  const origin = await login(page, "/admin", baseURL);
  // When the product entry is selected.
  await sidebar(page).getByRole("link", { name: "상품·분류", exact: true }).click();
  // Then the product workspace opens.
  await expect(page).toHaveURL(`${origin}/ko/admin/products`);
  await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "상품 등록", exact: true })).toBeVisible();
});

test("failed shipping save preserves entered fields", async ({ page, baseURL }) => {
  // Given a filled shipping region form and an unavailable write endpoint.
  await login(page, "/admin/shipping", baseURL);
  await page.getByLabel("지역 이름", { exact: true }).fill("임시 지역");
  await page.getByLabel("영어 이름", { exact: true }).fill("Draft region");
  await page.route("**/api/admin/shipping/zones", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE" } } });
    else await route.continue();
  });
  // When saving fails.
  await page.getByRole("button", { name: "지역 추가", exact: true }).click();
  await expect(page.locator(".events-error[role=alert]")).toBeVisible();
  // Then the draft is available for retry.
  await expect(page.getByLabel("지역 이름", { exact: true })).toHaveValue("임시 지역");
  await expect(page.getByLabel("영어 이름", { exact: true })).toHaveValue("Draft region");
});

for (const path of ["products", "orders", "shipping", "coupons", "settings", "review"]) {
  test(`logout revokes the session from ${path}`, async ({ page, baseURL }) => {
    // Given an authenticated commerce workspace.
    const origin = await login(page, `/admin/${path}`, baseURL);
    await expect(sidebar(page).getByRole("link", { name: "주문", exact: true })).toBeVisible();
    // When signing out.
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    // Then the login form returns and the server rejects the revoked session.
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "상품 목록" })).toHaveCount(0);
    const result = await page.request.get(`${origin}/api/admin/products`);
    expect(result.status()).toBe(401);
  });
}

test("protects an unsaved product category when registration is cancelled", async ({ page, baseURL }) => {
  // Given an unsaved category name.
  const origin = await login(page, "/admin/products", baseURL);
  await page.getByLabel("분류 이름", { exact: true }).fill("임시 분류");
  // When opening registration is cancelled.
  await page.getByRole("button", { name: "상품 등록", exact: true }).click();
  await answerDiscard(page, "취소");
  // Then the draft and the session remain until discard, and logout still signs out.
  await expect(page.getByLabel("분류 이름", { exact: true })).toHaveValue("임시 분류");
  expect((await page.request.get(`${origin}/api/admin/products`)).ok()).toBe(true);
  await page.getByRole("button", { name: "상품 등록", exact: true }).click();
  await answerDiscard(page, "버리기");
  await expect(page.getByLabel("상품명", { exact: true })).toBeVisible();
  await expect(page.getByLabel("분류 이름")).toHaveCount(0);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
});

for (const draft of [
  { path: "shipping", label: "지역 이름", value: "임시 지역" },
  { path: "coupons", label: "코드", value: "DRAFT10" },
]) {
  test(`keeps an unsaved ${draft.path} draft armed until logout`, async ({ page, baseURL }) => {
    // Given an unsaved commerce form. These screens arm beforeunload rather than a leave dialog.
    const origin = await login(page, `/admin/${draft.path}`, baseURL);
    await page.getByLabel(draft.label, { exact: true }).fill(draft.value);
    // When the draft is still on the page.
    await expect(page.getByLabel(draft.label, { exact: true })).toHaveValue(draft.value);
    expect(await beforeUnloadBlocked(page)).toBe(true);
    expect((await page.request.get(`${origin}/api/admin/products`)).ok()).toBe(true);
    // Then logout from the sidebar ends the session without a confirmation dialog.
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
    expect((await page.request.get(`${origin}/api/admin/products`)).status()).toBe(401);
  });
}

test("protects unsaved payment settings until the administrator leaves the page", async ({ page, baseURL }) => {
  // Given unsaved payment settings.
  const origin = await login(page, "/admin/settings", baseURL);
  const field = page.getByLabel("점검 모드", { exact: true });
  const initial = await field.isChecked();
  await field.setChecked(!initial);
  // When the content link is still the sidebar entry and the page has not been left.
  await expect(sidebar(page).getByRole("link", { name: "행사·하이라이트 관리", exact: true })).toHaveAttribute("href", "/ko/admin");
  expect(await beforeUnloadBlocked(page)).toBe(true);
  // Then the unsaved setting remains on the settings screen.
  await expect(field).toBeChecked({ checked: !initial });
  await expect(page).toHaveURL(`${origin}/ko/admin/settings`);
});

test("blocks the shipping form while a write is pending and keeps the draft after failure", async ({ page, baseURL }) => {
  // Given an in-flight shipping write.
  const origin = await login(page, "/admin/shipping", baseURL);
  await page.getByLabel("지역 이름", { exact: true }).fill("임시 지역");
  await page.getByLabel("영어 이름", { exact: true }).fill("Draft region");
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let posts = 0;
  await page.route("**/api/admin/shipping/zones", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts += 1;
    await pending;
    await route.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE" } } });
  });
  const request = page.waitForRequest((candidate) => candidate.url().endsWith("/api/admin/shipping/zones") && candidate.method() === "POST");
  await page.getByRole("button", { name: "지역 추가", exact: true }).click();
  await request;
  // When the form is blocked for the duration of that write.
  try {
    await expect(page.getByRole("button", { name: "지역 추가", exact: true })).toBeDisabled();
    await expect(page.getByLabel("지역 이름", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("영어 이름", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "지역 추가", exact: true }).click({ force: true });
    expect(posts).toBe(1);
    await expect(page).toHaveURL(`${origin}/ko/admin/shipping`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally { release(); }
  // Then the failed write surfaces and the draft is still editable.
  await expect(page.locator(".events-error[role=alert]")).toBeVisible();
  await expect(page.getByLabel("지역 이름", { exact: true })).toHaveValue("임시 지역");
  await expect(page.getByLabel("영어 이름", { exact: true })).toHaveValue("Draft region");
  await expect(page.getByLabel("지역 이름", { exact: true })).toBeEnabled();
});

test("keeps tracking drafts with their own order and cannot ship another order with them", async ({ page, baseURL }) => {
  // Given two paid domestic orders and a tracking draft for the first. UNFULFILLED delivery advances to SHIPPED ("발송됨로 변경") and asks for a carrier before writing.
  await login(page, "/admin/orders", baseURL);
  const orders = ["first", "second"].map((id) => ({
    id, status: "PAID", refundStatus: "NONE", customerName: id, customerEmail: `${id}@example.com`, customerPhone: "", locale: "ko",
    amountSats: "1000", fulfillment: "DOMESTIC", fulfillmentStatus: "UNFULFILLED", address: null,
    shippingAmountSats: "0", carrier: null, trackingNumber: null, fulfilledAt: null, holdExpiresAt: null,
    createdAt: "2026-09-21T00:00:00.000Z", items: [], payments: [],
  }));
  await page.route("**/api/admin/orders?*", (route) => route.fulfill({ json: { data: { items: orders, total: 2, page: 1, pageSize: 50 } } }));
  await page.route("**/api/admin/orders/*/payment", (route) => route.fulfill({ json: { data: [] } }));
  const writes: string[] = [];
  await page.route("**/api/admin/orders/*/fulfillment", (route) => { writes.push(route.request().url()); return route.fulfill({ status: 422, json: { error: { code: "INVALID_INPUT" } } }); });
  await page.reload();
  const first = page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: "first", exact: false }) });
  const second = page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: "second", exact: false }) });
  await expect(first.getByRole("heading", { name: "first" })).toBeVisible();
  await first.getByRole("button", { name: "자세히", exact: true }).click();
  await first.getByLabel("택배사", { exact: true }).fill("Draft carrier");
  await first.getByLabel("송장 번호", { exact: true }).fill("FIRST-123");
  // When attempting to ship the other order.
  await second.getByRole("button", { name: "발송됨로 변경", exact: true }).click();
  // Then no write happens; the other order asks for its own tracking details.
  await expect(page.getByRole("alert").filter({ hasText: "발송으로 변경하려면 택배사와 송장 번호를 입력해 주세요." })).toBeVisible();
  await expect(second.getByLabel("택배사", { exact: true })).toHaveValue("");
  await expect(second.getByLabel("송장 번호", { exact: true })).toHaveValue("");
  expect(writes).toEqual([]);
  await first.getByRole("button", { name: "자세히", exact: true }).click();
  await expect(first.getByLabel("택배사", { exact: true })).toHaveValue("Draft carrier");
  await expect(first.getByLabel("송장 번호", { exact: true })).toHaveValue("FIRST-123");
});

for (const mode of ["create", "edit"] as const) {
  test(`preserves controlled product options in ${mode} mode`, async ({ page, baseURL }) => {
    // Given a new or existing product option editor.
    const origin = await login(page, "/admin/products", baseURL);
    const productEdits = () => page.locator(".events-admin-list").first().getByRole("button", { name: "수정", exact: true });
    await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
    if (mode === "create") await page.getByRole("button", { name: "상품 등록", exact: true }).click();
    else {
      if (await productEdits().count() === 0) {
        const created = await page.request.post(`${origin}/api/admin/products`, { headers: { origin }, data: {
          slug: `option-edit-${randomUUID()}`, titleKo: "옵션 검토", titleEn: "Option review",
          descriptionKo: "검토용 상품", descriptionEn: "Review product", imageUrl: "", published: false, memberOnly: false,
          priceKind: "KRW_FIXED", priceAmount: "1000", allowedFulfillments: ["PICKUP"],
          variants: [{ sku: `EDIT-${randomUUID().slice(0, 8)}`, optionLabelKo: "기본", optionLabelEn: "Default", stockOnHand: 3, billableWeightG: 0, active: true }],
        } });
        expect(created.status(), `product seed failed with HTTP ${created.status()}`).toBe(201);
        await page.reload();
        await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
      }
      await expect(productEdits().first()).toBeVisible();
      await productEdits().first().click();
    }
    const sku = page.getByLabel("SKU", { exact: true }).first();
    await expect(sku).toHaveJSProperty("readOnly", mode === "edit");
    const skuValue = await sku.inputValue();
    if (mode === "create") await sku.fill("DRAFT-OPTION");
    await page.getByLabel("옵션 이름", { exact: true }).first().fill("임시 옵션");
    await page.getByLabel("영어 옵션 이름", { exact: true }).first().fill("Draft option");
    await page.getByLabel("재고", { exact: true }).first().fill("100");
    await page.getByLabel("포장 무게 (g)", { exact: true }).first().fill("350");
    await page.getByLabel("판매 중", { exact: true }).first().uncheck();
    const initialCount = await page.getByLabel("SKU", { exact: true }).count();
    // When adding and removing another option.
    await page.getByRole("button", { name: "옵션 추가", exact: true }).click();
    await expect(page.getByLabel("SKU", { exact: true })).toHaveCount(initialCount + 1);
    await expect(page.getByLabel("SKU", { exact: true }).last()).toBeEditable();
    await expect(page.getByLabel("재고", { exact: true }).last()).toHaveValue("0");
    await expect(page.getByLabel("판매 중", { exact: true }).last()).toBeChecked();
    await page.getByRole("button", { name: "이 옵션 제거", exact: true }).last().click();
    // Then the original controlled values remain, and cancelling the editor asks before discarding them.
    await expect(page.getByLabel("SKU", { exact: true })).toHaveCount(initialCount);
    await expect(sku).toHaveValue(mode === "create" ? "DRAFT-OPTION" : skuValue);
    await expect(page.getByLabel("옵션 이름", { exact: true }).first()).toHaveValue("임시 옵션");
    await expect(page.getByLabel("영어 옵션 이름", { exact: true }).first()).toHaveValue("Draft option");
    await expect(page.getByLabel("재고", { exact: true }).first()).toHaveValue("100");
    await expect(page.getByLabel("포장 무게 (g)", { exact: true }).first()).toHaveValue("350");
    await expect(page.getByLabel("판매 중", { exact: true }).first()).not.toBeChecked();
    await page.locator("form").getByRole("button", { name: "취소", exact: true }).click();
    await expect(discardDialog(page)).toBeVisible();
    await answerDiscard(page, "취소");
    await expect(page.getByLabel("옵션 이름", { exact: true }).first()).toHaveValue("임시 옵션");
  });
}
