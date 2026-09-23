import { expect, test, type APIRequestContext } from "@playwright/test";

type Product = { slug: string; imageUrl: string; images: string[]; variants: { id: string; availableStock: number }[] };
const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? "http://127.0.0.1:3100";

async function products(request: APIRequestContext): Promise<Product[]> {
  const response = await request.get(`${origin}/api/products`);
  expect(response.ok()).toBe(true);
  return (await response.json()).data as Product[];
}

test("image-less product leads with purchase information and keeps native option behavior", async ({ page, request }) => {
  const product = (await products(request)).find((item) => !item.imageUrl && item.images.length === 0);
  test.skip(!product, "Requires an image-less review product");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${origin}/en/shop/${product!.slug}`);
  await expect(page.locator(".commerce-gallery")).toHaveCount(0);
  await expect(page.locator(".commerce-product-buy")).toBeVisible();
  const option = page.getByRole("combobox", { name: "Option" });
  await expect(option).toHaveJSProperty("required", true);
  await expect(option).toHaveValue(product!.variants.find((item) => item.availableStock > 0)?.id ?? product!.variants[0]?.id ?? "");
  for (const variant of product!.variants.filter((item) => item.availableStock <= 0)) {
    await expect(option.locator(`option[value="${variant.id}"]`)).toBeDisabled();
  }
  await option.focus();
  await expect(option).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("English gallery modal contains keyboard focus and returns it on Escape", async ({ page, request }) => {
  const product = (await products(request)).find((item) => item.images.length > 1);
  test.skip(!product, "Requires a review product with two photos");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/en/shop/${product!.slug}`);
  const trigger = page.getByRole("button", { name: /^Enlarge photo of / });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Previous" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Next" })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
