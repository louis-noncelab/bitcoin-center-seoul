import { expect, test } from "@playwright/test";

for (const locale of ["ko", "en"] as const) {
  test(`${locale} home keeps one document title and a visible space heading`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const documentTitle = page.locator("main > h1");
    const space = page.locator(".home-space");
    const spaceTitle = space.getByRole("heading", { level: 2, name: locale === "ko" ? "공간 둘러보기" : "Inside the center" });

    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(documentTitle).toHaveText(locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul");
    await expect(documentTitle).toHaveClass(/sr-only/);
    await expect(spaceTitle).toBeVisible();
    await expect(space.locator(".hero-letter")).toHaveCount(0);
  });
}
