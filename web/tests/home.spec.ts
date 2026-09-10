import { expect, test } from "@playwright/test";

test("the Korean entry point renders a readable public page", async ({ page }) => {
  const response = await page.goto("/ko");

  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
});
