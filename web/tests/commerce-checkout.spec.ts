import assert from "node:assert/strict";
import { expect, test, type Page, type Route } from "@playwright/test";

const configuredBase = process.env.COMMERCE_BASE_URL ?? process.env.COMMERCE_REVIEW_ORIGIN;
if (configuredBase) test.use({ baseURL: configuredBase });
const product = { id: "book", slug: "book", titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "", imageUrl: "", contentFormat: "PLAIN", priceKind: "BTC_FIXED", priceAmount: "100", memberOnly: false, allowedFulfillments: ["PICKUP", "DOMESTIC"], variants: [{ id: "book-option", sku: "book", optionLabelKo: "단권", optionLabelEn: "Single", availableStock: 10 }] };
function checkoutQuote(id = "q", amountSats = "100", shippingAmountSats = "0", couponCode = "") {
  return { id, amountSats, expiresAt: "2030-01-01T00:00:00Z", snapshot: { items: [{ titleKo: "책", titleEn: "Book", optionLabelKo: "단권", optionLabelEn: "Single", quantity: 1, amountSats: "100" }], shippingAmountSats, amountSats, shipping: { countryCode: shippingAmountSats === "0" ? null : "KR", requiresPostalCode: shippingAmountSats !== "0" }, ...(couponCode ? { coupon: { code: couponCode, nameKo: "할인", nameEn: "Discount", discountSats: "20" } } : {}) } };
}
const quote = checkoutQuote();
async function checkout(page: Page, items = [{ variantId: "book-option", quantity: 1 }], international = false, quoteHandler?: (route: Route) => unknown) {
  await page.addInitScript((selection) => { localStorage.setItem("center-cart", JSON.stringify({ v: 1, items: selection })); }, items);
  await page.route("**/api/products", (route) => route.fulfill({ json: { data: [{ ...product, allowedFulfillments: international ? [...product.allowedFulfillments, "INTERNATIONAL"] : product.allowedFulfillments }] } }));
  await page.route("**/api/shipping/countries", (route) => route.fulfill({ json: { data: [{ code: "KR", requiresPostalCode: true, zone: { nameKo: "국내", nameEn: "Domestic" } }, ...(international ? [{ code: "US", requiresPostalCode: true, zone: { nameKo: "미국", nameEn: "United States" } }] : [])] } }));
  await page.route("**/api/orders/quote", quoteHandler ?? ((route) => route.fulfill({ json: { data: quote } })));
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

test("checkout requires explicit policy acceptance before creating an order", async ({ page }) => {
  await checkout(page);
  await contact(page);
  let submitted = 0;
  let submittedBody: unknown;
  await page.route("**/api/orders", (route) => { submitted += 1; submittedBody = route.request().postDataJSON(); return route.fulfill({ json: { data: { id: "created-order" } } }); });
  await expect(page.getByRole("button", { name: "Pay" })).toBeEnabled();
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.locator("#checkout-acceptance")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#checkout-acceptance")).toHaveAttribute("aria-describedby", "checkout-acceptance-error");
  await expect(page.locator("#checkout-acceptance-error")).toBeVisible();
  expect(await page.locator("#checkout-acceptance").evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  expect(submitted).toBe(0);
  await page.locator("#checkout-acceptance").check();
  const orderRequest = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Pay" }).click();
  await orderRequest;
  expect(submitted).toBe(1);
  expect(submittedBody).toMatchObject({ acceptance: { accepted: true, version: expect.stringMatching(/^[a-f0-9]{64}$/) } });
});

test("changed policies require a reload and fresh acceptance", async ({ page }) => {
  await checkout(page);
  await contact(page);
  await page.locator("#checkout-acceptance").check();
  await page.route("**/api/orders", (route) => route.fulfill({ status: 409, json: { error: { code: "POLICY_STALE", message: "Checkout terms changed." } } }));
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByText("The terms or refund policy changed.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Review updated policies" }).click();
  await expect(page.locator("#checkout-acceptance")).not.toBeChecked();
});

test("stale quote recovery blocks early acceptance and submit races", async ({ page }) => {
  // Given a replacement quote whose response is explicitly held.
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  let recovering = false;
  await checkout(page, undefined, false, async (route) => {
    if (recovering) await released;
    await route.fulfill({ json: { data: checkoutQuote(recovering ? "replacement" : "original", recovering ? "160" : "100") } });
  });
  await contact(page);
  await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
  await page.locator("#checkout-acceptance").check();
  const orders: unknown[] = [];
  await page.route("**/api/orders", (route) => {
    orders.push(route.request().postDataJSON());
    recovering = true;
    return route.fulfill({ status: 409, json: { error: { code: "QUOTE_STALE", message: "fixture" } } });
  });
  const replacementRequest = page.waitForRequest((request) => request.url().endsWith("/api/orders/quote"));
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await replacementRequest;
  // When the user attempts acceptance and submission before the replacement arrives.
  const acceptance = page.locator("#checkout-acceptance");
  await expect(acceptance).toBeDisabled();
  await acceptance.evaluate((input: HTMLInputElement) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  const replacementResponse = page.waitForResponse((response) => response.url().endsWith("/api/orders/quote"));
  release();
  await replacementResponse;
  // Then consent must still be given after the changed total is visible.
  await expect(page.locator(".commerce-total dd")).toHaveText("160 sats");
  await expect(acceptance).toBeEnabled();
  await expect(acceptance).not.toBeChecked();
  await acceptance.evaluate((input: HTMLInputElement) => input.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect(acceptance).toHaveAttribute("aria-invalid", "true");
  expect(orders).toHaveLength(1);
  await acceptance.check();
  const retry = page.waitForRequest((request) => request.url().endsWith("/api/orders"));
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  expect((await retry).postDataJSON()).toMatchObject({ quoteId: "replacement", acceptance: { accepted: true } });
});

for (const equivalent of ["SAVE10 ", " save10 "]) {
  test(`canonical coupon edit ${JSON.stringify(equivalent)} retains the quote and consent`, async ({ page }) => {
    // Given a settled coupon quote and consent, with a virtual debounce clock.
    await checkout(page, undefined, false, (route) => route.fulfill({ json: { data: checkoutQuote("coupon", "80", "0", route.request().postDataJSON().couponCode ?? "") } }));
    await contact(page);
    await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
    await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
    const couponRequest = page.waitForResponse((response) => response.url().endsWith("/api/orders/quote") && response.request().postDataJSON().couponCode === "SAVE10");
    await page.locator("#coupon-code").fill("SAVE10");
    await page.clock.runFor(400);
    await couponRequest;
    await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
    await page.locator("#checkout-acceptance").check();
    // When only canonical-equivalent spelling changes.
    await page.locator("#coupon-code").fill(equivalent);
    await page.clock.runFor(400);
    // Then the valid quote and consent remain usable.
    await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
    await expect(page.locator("#checkout-acceptance")).toBeChecked();
    await expect(page.locator("#coupon-code")).toHaveValue(equivalent);
  });
}

test("coupon edits cannot restore an earlier in-flight quote during debounce", async ({ page }) => {
  // Given a coupon request held at the response boundary.
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await checkout(page, undefined, false, async (route) => {
    const coupon = route.request().postDataJSON().couponCode ?? "";
    if (coupon === "OLD") await released;
    await route.fulfill({ json: { data: checkoutQuote(coupon || "initial", coupon === "OLD" ? "80" : "90", "0", coupon) } });
  });
  await contact(page);
  await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
  const oldRequest = page.waitForRequest((request) => request.url().endsWith("/api/orders/quote") && request.postDataJSON().couponCode === "OLD");
  await page.locator("#coupon-code").fill("OLD");
  await page.clock.runFor(400);
  const old = await oldRequest;
  // When the input changes before its debounce and the old response is released.
  const cancelled = page.waitForEvent("requestfailed", { predicate: (request) => request === old });
  await page.locator("#coupon-code").fill("NEW");
  await cancelled;
  release();
  await page.clock.runFor(399);
  // Then the old quote cannot enable consent or payment.
  await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeDisabled();
  await expect(page.locator("#checkout-acceptance")).toBeDisabled();
  const nextResponse = page.waitForResponse((response) => response.url().endsWith("/api/orders/quote") && response.request().postDataJSON().couponCode === "NEW");
  await page.clock.runFor(1);
  await nextResponse;
  await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
  await expect(page.locator(".commerce-facts dt").filter({ hasText: "Coupon NEW" })).toHaveCount(1);
  await expect(page.locator(".commerce-facts dt").filter({ hasText: "Coupon OLD" })).toHaveCount(0);
});

for (const code of ["QUOTE_EXPIRED", "QUOTE_STALE"] as const) {
  test(`checkout refreshes ${code} quotes and retries once with a new request key`, async ({ page }) => {
    const quoteBodies: unknown[] = [];
    const orderRequests: { body: { quoteId?: string }, key: string | undefined }[] = [];
    let recoveryStarted = false;
    await checkout(page, undefined, false, (route) => {
      const body = route.request().postDataJSON();
      quoteBodies.push(body);
      const refreshed = recoveryStarted;
      return route.fulfill({ json: { data: checkoutQuote(refreshed ? `fresh-${code}` : `stale-${code}`, refreshed ? "160" : "130", "30", body.couponCode ?? "") } });
    });
    await contact(page);
    const domesticQuote = page.waitForResponse((response) => response.url().includes("/api/orders/quote") && (response.request().postData() ?? "").includes("DOMESTIC"));
    await page.locator('input[value="DOMESTIC"]').check();
    await domesticQuote;
    const couponQuote = page.waitForResponse((response) => response.url().includes("/api/orders/quote") && (response.request().postData() ?? "").includes("SAVE10"));
    await page.locator("#coupon-code").fill("SAVE10");
    await couponQuote;
    await page.locator('input[name="postalCode"]').fill("03930");
    await page.locator('input[name="region"]').fill("Seoul");
    await page.locator('input[name="city"]').fill("Mapo");
    await page.locator('input[name="line1"]').fill("World Cup buk-ro 123");
    await page.locator("#checkout-acceptance").check();
    await page.route("**/api/orders", (route) => {
      const headers = route.request().headers();
      orderRequests.push({ body: route.request().postDataJSON(), key: headers["idempotency-key"] });
      if (orderRequests.length === 1) {
        recoveryStarted = true;
        return route.fulfill({ status: 409, json: { error: { code, message: "fixture" } } });
      }
      return route.fulfill({ status: 201, json: { data: { id: `created-${code.toLowerCase()}` } } });
    });
    await page.route(`**/api/orders/created-${code.toLowerCase()}`, (route) => route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND", message: "Local test only" } } }));
    const failedOrder = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    const originalQuoteBody = quoteBodies.at(-1);
    const refreshedQuote = page.waitForResponse(async (response) => response.url().includes("/api/orders/quote") && (await response.json()).data.id === `fresh-${code}`);
    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await failedOrder;
    await refreshedQuote;
    expect(quoteBodies.at(-1)).toEqual(originalQuoteBody);
    await expect(page.locator(`[data-quote-recovery="${code === "QUOTE_EXPIRED" ? "expired" : "stale"}"]`)).toBeVisible();
    await expect(page.getByText("160 sats")).toBeVisible();
    await expect(page.locator("#checkout-acceptance")).toBeChecked({ checked: code === "QUOTE_EXPIRED" });
    if (code === "QUOTE_STALE") await page.locator("#checkout-acceptance").check();
    await expect(page.getByRole("button", { name: "Pay", exact: true })).toBeEnabled();
    const completedOrder = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST" && response.status() === 201);
    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await completedOrder;
    await expect(page).toHaveURL(new RegExp(`/en/orders/created-${code.toLowerCase()}`));
    expect(orderRequests).toHaveLength(2);
    const [firstOrder, secondOrder] = orderRequests;
    assert.ok(firstOrder && secondOrder);
    expect(firstOrder.body.quoteId).toBe(`stale-${code}`);
    expect(secondOrder.body.quoteId).toBe(`fresh-${code}`);
    expect(secondOrder.body).toEqual({ ...firstOrder.body, quoteId: `fresh-${code}` });
    expect(secondOrder.key).toBeTruthy();
    expect(secondOrder.key).not.toBe(firstOrder.key);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("center-cart") ?? "{}").items)).toEqual([]);
  });
}

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
  await expect(page.getByRole("link", { name: /View details/ })).toHaveAttribute("href", "/en/orders/trusted-order");
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
  await page.locator("#checkout-acceptance").check();
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
