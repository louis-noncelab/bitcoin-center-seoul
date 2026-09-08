import { expect, test } from "@playwright/test";

test("the root path redirects to the Korean locale", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe("/ko");
});

test("an unsupported locale returns 404 without a fallback redirect", async ({ request }) => {
  const response = await request.get("/fr", { maxRedirects: 0 });

  expect(response.status()).toBe(404);
  expect(response.url()).toMatch(/\/fr$/);
});

test("development tools bypass locale routing", async ({ page }) => {
  const response = await page.goto("/dev-tools/react-scan");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/dev-tools\/react-scan$/);
  expect(response?.headers()["content-type"]).toContain("text/javascript");
});
