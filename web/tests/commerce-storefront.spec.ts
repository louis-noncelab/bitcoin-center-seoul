import { expect, test } from "@playwright/test";
import { z } from "zod";
import { productSchema } from "../src/components/commerce/contracts";

const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? "http://127.0.0.1:3100";

for (const width of [375, 768, 1440]) {
  test(`cart closes and restores focus at ${width}px`, async ({ page }) => {
    // Given a visitor with an empty cart.
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/en/shop`);
    const trigger = page.getByRole("button", { name: "Cart", exact: true });
    const dialog = page.locator(".commerce-cart-drawer");
    await expect(trigger).toHaveCount(1);
    await expect(dialog).toHaveCount(1);
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);

    // When the modal is dismissed with Escape.
    await page.keyboard.press("Escape");

    // Then focus and document scrolling are restored, including after reopening.
    await expect(dialog).not.toHaveAttribute("open");
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    await trigger.click();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).not.toHaveAttribute("open");
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });
}

test("Escape immediately followed by reopening keeps the cart modal open", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`${origin}/ko/shop`);
  const trigger = page.getByRole("button", { name: "장바구니", exact: true });
  const dialog = page.locator(".commerce-cart-drawer");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await trigger.press("Enter");
    await expect(dialog).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await trigger.press("Enter");
    await expect(dialog).toHaveAttribute("open", "");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("cart backdrop, interrupted animation and reduced motion remain operable", async ({ page }) => {
  // Given a desktop modal during ordinary motion.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/en/shop`);
  const trigger = page.getByRole("button", { name: "Cart", exact: true });
  const dialog = page.locator(".commerce-cart-drawer");
  await trigger.click();
  await expect(dialog).toHaveCSS("transform", "none");

  // When the backdrop is clicked and the trigger is immediately reactivated.
  await page.mouse.click(20, 400);
  await expect(dialog).not.toHaveAttribute("open");
  await trigger.press("Enter");

  // Then the latest state wins and reduced motion removes transitions.
  await expect(dialog).toHaveAttribute("open", "");
  await expect(dialog).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open");
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
});

for (const locale of ["ko", "en"] as const) {
  test(`product variants retain readable native option labels in ${locale}`, async ({ page, request }) => {
    // Given the first listed product that has a variant.
    const response = await request.get(`${origin}/api/products`);
    if (response.status() !== 200) throw new Error(`The catalog is empty (GET /api/products returned ${response.status()}).`);
    const products = z.object({ data: z.array(productSchema) }).parse(await response.json()).data;
    const product = products.find((item) => item.variants.length > 0);
    if (!product) throw new Error("The catalog is empty: no product has a variant.");
    await page.goto(`${origin}/${locale}/shop/${product.slug}`);
    const optionName = locale === "ko" ? "옵션" : "Option";
    const option = page.getByRole("combobox", { name: optionName, exact: true });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(option).toBeVisible();

    await option.focus();

    // Then the control is usable and each visible label is human-readable, not a raw variant id.
    await expect(option).toBeFocused();
    expect(await option.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
    await expect(option).toHaveJSProperty("required", true);
    const labels = (await option.locator("option").allTextContents()).map((label) => label.trim());
    expect(labels.length).toBe(product.variants.length);
    const variantIds = new Set(product.variants.map((variant) => variant.id));
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(variantIds.has(label)).toBe(false);
    }
  });
}

test("cart navigation releases modality and keeps the chosen product", async ({ page }) => {
  // Given a product added through the real purchase control.
  await page.goto(`${origin}/en/shop/bitcoin-standard`);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  const dialog = page.locator(".commerce-cart-drawer");
  await expect(dialog).toHaveAttribute("open", "");

  // When the shopper follows the cart route.
  await dialog.getByRole("link", { name: "View cart", exact: true }).click();

  // Then the destination is usable with the chosen item retained.
  await expect(page).toHaveURL(/\/en\/cart$/);
  await expect(page.locator(".commerce-cart-drawer[open]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator("main .commerce-cart-line")).toHaveCount(1);
});

test("cart catalog failure offers retry and never enables stale checkout", async ({ page }) => {
  // Given a cart that has previously loaded a current product.
  await page.goto(`${origin}/en/shop/bitcoin-standard`);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  const dialog = page.locator(".commerce-cart-drawer");
  const checkout = dialog.getByRole("link", { name: "Checkout", exact: true });
  await expect(checkout).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open");
  await page.route("**/api/products", async route => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "REQUEST_FAILED", message: "상품 정보를 불러오지 못했습니다. / Item details could not be loaded." } }) });
  });

  // When the next catalog refresh fails.
  await page.getByRole("button", { name: /^Cart/ }).click();

  // Then the error is actionable, stale checkout is blocked, and retry recovers.
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(checkout).toHaveAttribute("aria-disabled", "true");
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await page.unroute("**/api/products");
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(checkout).not.toHaveAttribute("aria-disabled", "true");
  await expect(dialog.locator(".commerce-cart-line")).toHaveCount(1);
});
