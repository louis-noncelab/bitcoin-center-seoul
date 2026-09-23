import { expect, test, type Page } from "@playwright/test";

const configuredBase = process.env.COMMERCE_BASE_URL ?? process.env.COMMERCE_REVIEW_ORIGIN;
if (configuredBase) test.use({ baseURL: configuredBase });
const product = { id: "book", slug: "book", titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "", imageUrl: "", contentFormat: "PLAIN", priceKind: "BTC_FIXED", priceAmount: "100", memberOnly: false, allowedFulfillments: ["PICKUP", "DOMESTIC"], variants: [{ id: "book-option", sku: "book", optionLabelKo: "단권", optionLabelEn: "Single", availableStock: 10 }] };
const quote = { id: "q", amountSats: "100", expiresAt: "2030-01-01T00:00:00Z", snapshot: { items: [{ titleKo: "책", titleEn: "Book", optionLabelKo: "단권", optionLabelEn: "Single", quantity: 1, amountSats: "100" }], shippingAmountSats: "0", amountSats: "100", shipping: { countryCode: null, requiresPostalCode: false } } };
async function checkout(page: Page, items = [{ variantId: "book-option", quantity: 1 }], international = false) {
  await page.addInitScript((selection) => { localStorage.setItem("center-cart", JSON.stringify({ v: 1, items: selection })); }, items);
  await page.route("**/api/products", (route) => route.fulfill({ json: { data: [{ ...product, allowedFulfillments: international ? [...product.allowedFulfillments, "INTERNATIONAL"] : product.allowedFulfillments }] } }));
  await page.route("**/api/shipping/countries", (route) => route.fulfill({ json: { data: [{ code: "KR", requiresPostalCode: true, zone: { nameKo: "국내", nameEn: "Domestic" } }, ...(international ? [{ code: "US", requiresPostalCode: true, zone: { nameKo: "미국", nameEn: "United States" } }] : [])] } }));
  await page.route("**/api/orders/quote", (route) => route.fulfill({ json: { data: quote } }));
  await page.goto("/en/checkout");
}
async function contact(page: Page) {
  await page.locator("#customer-name").fill("Review Guest");
  await page.locator("#customer-email").fill("review@example.invalid");
  await page.locator("#customer-phone").fill("01012345678");
}

test("postcode frame policy is limited to checkout", async ({ page }) => {
  const checkoutResponse = await page.request.get("/en/checkout");
  const homeResponse = await page.request.get("/en");
  expect(checkoutResponse.headers()["content-security-policy"]).toContain("https://postcode.map.kakao.com");
  expect(homeResponse.headers()["content-security-policy"]).not.toContain("postcode.map.kakao.com");
});

test("phone country search stores one prefix and rejects unknown pasted prefixes", async ({ page }) => {
  await checkout(page);
  await page.getByRole("button", { name: /Phone country code/ }).click();
  await page.getByRole("combobox", { name: "Search country or calling code" }).fill("Italy");
  await page.getByRole("combobox", { name: "Search country or calling code" }).press("Enter");
  await page.locator("#customer-phone").fill("+39 02 12345678");
  await expect(page.locator('input[type="hidden"][name="phone"]')).toHaveValue("+39 02 12345678");
  await page.locator("#customer-phone").fill("1234");
  expect(await page.locator("#customer-phone").evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  await page.locator("#customer-phone").fill("123456");
  expect(await page.locator("#customer-phone").evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  await page.locator("#customer-phone").fill("+999 12345678");
  await expect(page.locator('input[type="hidden"][name="phone"]')).toHaveValue("");
  await expect(page.locator("#customer-phone")).toHaveAttribute("aria-invalid", "true");
});

test("domestic address search preloads only for Korea and opens with one click", async ({ page }) => {
  let scriptRequests = 0;
  let releaseScript: () => void = () => {};
  const scriptReady = new Promise<void>((resolve) => { releaseScript = resolve; });
  await page.route("https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js", async (route) => {
    scriptRequests += 1;
    await scriptReady;
    return route.fulfill({ contentType: "application/javascript", body: `window.kakao = { Postcode: class { constructor(options) { this.options = options; } open() { setTimeout(() => { this.options.oncomplete({ userSelectedType: "R", roadAddress: "서울 마포구 월드컵북로 123", jibunAddress: "", zonecode: "03930", sido: "서울", sigungu: "마포구" }); this.options.onclose(); }, 0); } } };` });
  });
  await checkout(page, undefined, true);
  expect(scriptRequests).toBe(0);
  await page.locator('input[value="INTERNATIONAL"]').check();
  await expect(page.getByRole("button", { name: "Find address" })).toHaveCount(0);
  expect(scriptRequests).toBe(0);
  await page.locator('input[value="DOMESTIC"]').check();
  await expect(page.getByRole("button", { name: "Loading address search…" })).toBeDisabled();
  await expect.poll(() => scriptRequests).toBe(1);
  releaseScript();
  await expect(page.getByRole("button", { name: "Find address", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Find address", exact: true }).click();
  await expect(page.locator('input[name="postalCode"]')).toHaveValue("03930");
  await expect(page.locator('input[name="region"]')).toHaveValue("서울");
  await expect(page.locator('input[name="city"]')).toHaveValue("마포구");
  await expect(page.locator('input[name="line1"]')).toHaveValue("월드컵북로 123");
  await page.locator('input[name="line1"]').fill("직접 수정한 주소");
  await expect(page.locator('input[name="line1"]')).toHaveValue("직접 수정한 주소");
  await page.locator('input[value="PICKUP"]').check();
  await expect(page.getByRole("button", { name: "Find address" })).toHaveCount(0);
});

test("checkout blocks missing selections without discarding them", async ({ page }) => {
  // Given one orderable item and one removed or hidden option.
  await checkout(page, [{ variantId: "book-option", quantity: 1 }, { variantId: "hidden-option", quantity: 1 }]);
  // When the catalog loads.
  // Then selection remains visible as an issue and cannot silently become a partial order.
  await expect(page.getByText("Some selected items are unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay" })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("center-cart") ?? "{}").items)).toHaveLength(2);
});

test("shipping fields reset after changing to pickup and back", async ({ page }) => {
  // Given typed domestic shipping fields.
  await checkout(page);
  await page.locator('input[value="DOMESTIC"]').check();
  await page.locator('input[name="line1"]').fill("Old street");
  // When pickup is selected before returning to shipping.
  await page.locator('input[value="PICKUP"]').check();
  await page.locator('input[value="DOMESTIC"]').check();
  // Then a stale DOM address is not submitted for a new shipping choice.
  await expect(page.locator('input[name="line1"]')).toHaveValue("");
});

test("payment return uses the authorized order and offers sandbox checkout without a redirect loop", async ({ page }) => {
  // Given an authorized sandbox payment and an untrusted order query.
  await page.route("**/api/payments/payment-one/status", (route) => route.fulfill({ json: { data: { id: "payment-one", orderId: "trusted-order", provider: "ZAPRITE", mode: "SANDBOX", status: "PENDING", amountSats: "100", currency: "BTC", expiresAt: "2030-01-01T00:00:00Z", checkoutUrl: "https://pay.zaprite.com/test-checkout", paymentRequest: null, review: false, creationUnknown: false, reviewReason: null } } }));
  // When returning from the provider to the English payment page.
  await page.goto("/en/payments/payment-one?order=untrusted-order");
  // Then only the authorized API response supplies the order navigation.
  await expect(page.getByRole("link", { name: /View order/ })).toHaveAttribute("href", "/en/orders/trusted-order");
  await expect(page.getByRole("link", { name: /Open checkout/ })).toHaveAttribute("href", "https://pay.zaprite.com/test-checkout");
  await expect(page).toHaveURL(/\/en\/payments\/payment-one/);
});

test("a changed cart invalidates a quote while its response is in flight", async ({ page }) => {
  // Given a quote request delayed while the shopper changes a cart quantity.
  await checkout(page);
  await contact(page);
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/orders/quote", async (route) => { await released; await route.fulfill({ json: { data: quote } }); });
  await page.locator('input[value="DOMESTIC"]').check();
  // When the cart changes through the existing header drawer while the quote is pending.
  await page.getByRole("button", { name: /Cart/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Close/ }).click();
  await expect(page.getByRole("button", { name: "Pay" })).toBeDisabled();
  release();
  // Then the quote that belonged to the previous quantity is not the one left on screen.
  await expect(page.getByRole("button", { name: "Pay" })).toBeEnabled();
});

test("an order finishing after cart edits clears only the purchased quantities", async ({ page }) => {
  // Given a confirmed quote and a pending order creation response.
  await checkout(page);
  await contact(page);
  await expect(page.getByRole("button", { name: "Pay" })).toBeEnabled();
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/orders", async (route) => { await released; await route.fulfill({ json: { data: { id: "created-order" } } }); });
  await page.route("**/api/orders/created-order", (route) => route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND", message: "Local test only" } } }));
  await page.getByRole("button", { name: "Pay" }).click();
  // When another unit is added while the order is being created.
  await page.getByRole("button", { name: /Cart/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Close/ }).click();
  release();
  // Then the completed order clears one unit and preserves the later addition.
  await expect(page).toHaveURL(/\/en\/orders\/created-order/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("center-cart") ?? "{}").items)).toEqual([{ variantId: "book-option", quantity: 1 }]);
});

test("cart keeps missing and sold-out selections visible until the shopper removes them", async ({ page }) => {
  // Given unavailable catalog stock and a deleted selection in persisted cart state.
  await checkout(page, [{ variantId: "book-option", quantity: 1 }, { variantId: "hidden-option", quantity: 1 }]);
  await page.route("**/api/products", (route) => route.fulfill({ json: { data: [{ ...product, variants: [{ ...product.variants[0], availableStock: 0 }] }] } }));
  // When the shopper opens their cart.
  await page.goto("/en/cart");
  // Then every selection has a removal action and checkout is blocked.
  await expect(page.getByText("Unavailable option", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Book", exact: true })).toHaveAttribute("href", "/en/shop/book");
  await expect(page.getByRole("button", { name: "Checkout", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("center-cart") ?? "{}").items)).toHaveLength(2);
});

for (const mode of ["SANDBOX", "LIVE"] as const) {
  test(`${mode} invoice creation opens provider checkout only after an explicit payment action`, async ({ page }) => {
    // Given a new authorized payment; the provider page is intercepted locally.
    const payment = { id: "payment-new", orderId: "trusted-order", provider: "ZAPRITE", mode, status: "NEW", amountSats: "100", currency: "BTC", expiresAt: "2030-01-01T00:00:00Z", checkoutUrl: null, paymentRequest: null, review: false, creationUnknown: false, reviewReason: null };
    await page.route("**/api/payments/payment-new/status", (route) => route.fulfill({ json: { data: payment } }));
    await page.route("**/api/payments/payment-new/invoice", (route) => route.fulfill({ json: { data: { ...payment, status: "PENDING", checkoutUrl: "https://pay.zaprite.com/test-checkout" } } }));
    await page.route("https://pay.zaprite.com/test-checkout", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Local intercepted checkout</h1>" }));
    await page.goto("/en/payments/payment-new");
    // When the customer explicitly requests payment.
    await page.getByRole("button", { name: "Pay now", exact: true }).click();
    // Then the same safe UI flow works for sandbox and live projections with no provider network call.
    await expect(page).toHaveURL("https://pay.zaprite.com/test-checkout");
    await expect(page.getByRole("heading", { name: "Local intercepted checkout" })).toBeVisible();
  });
}
