import { expect, test } from "@playwright/test";
import { z } from "zod";
import { adminProductRecord } from "../src/lib/commerce-contract";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

for (const width of [375, 1440]) {
  for (const repeated of [false, true]) {
  test(`gallery reorder preserves keyboard focus at ${width}px, repeated image ${repeated}`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const origin = reviewOrigin(baseURL);
    const { ADMIN_PASSWORD } = await reviewRuntime();
    expect((await page.request.post(`${origin}/api/admin/login`, {
      headers: { origin }, data: { password: ADMIN_PASSWORD },
    })).status()).toBe(200);
    const response = await page.request.get(`${origin}/api/admin/products`);
    expect(response.status()).toBe(200);
    const products = z.object({ data: z.array(adminProductRecord) }).parse(await response.json()).data;
    const product = products.find((item) => item.images.length >= 3);
    if (!product) throw new Error("Review fixture requires a product with three unique gallery images");
    const [first, second] = product.images;
    if (!first || !second) throw new Error("Review gallery images are missing");
    const original = repeated ? [first, second, first, ...product.images.slice(2)] : product.images;
    if (repeated) {
      // Product galleries permit repeated URLs; retain that valid response contract.
      await page.route("**/api/admin/products", (route) => route.fulfill({
        json: { data: products.map((item) => item.id === product.id ? { ...item, images: original } : item) },
      }));
    }
    await page.goto(`${origin}/ko/admin/products`);
    await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
    const row = page.locator(".events-admin-list > li").filter({
      has: page.getByRole("heading", { name: product.titleKo, exact: true }),
    });
    await row.getByRole("button", { name: "수정", exact: true }).click();
    const gallery = page.locator(".events-gallery-editor");
    const moved = gallery.locator("li").filter({ has: page.locator(`img[src="${first}"]`) }).first();
    const control = moved.getByRole("button", { name: /뒤로$/ });
    await control.focus();
    await expect(control).toBeFocused();
    await control.press("Enter");
    await expect(gallery.locator("img").nth(0)).toHaveAttribute("src", second);
    await expect(gallery.locator("img").nth(1)).toHaveAttribute("src", first);
    await expect(control).toBeFocused();
    if (!repeated) {
      await control.press("Enter");
      await expect(gallery.locator("img").nth(2)).toHaveAttribute("src", first);
    } else await expect(gallery.locator("img")).toHaveCount(original.length);
  });
  }
}
