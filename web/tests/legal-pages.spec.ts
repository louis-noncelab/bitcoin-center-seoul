import { expect, test } from "@playwright/test";
import { reviewOrigin } from "./helpers/review-runtime";

const documents = {
  "business-info": { ko: "사업자정보", en: "Business information" },
  "privacy-policy": { ko: "개인정보 처리방침", en: "Privacy policy" },
  "terms-of-service": { ko: "이용약관", en: "Terms of service" },
  "refund-policy": { ko: "환불 및 반품정책", en: "Refund and return policy" },
} as const;

for (const locale of ["ko", "en"] as const) {
  for (const [path, titles] of Object.entries(documents)) {
    test(`${locale}/${path} renders its document and metadata`, async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await context.addCookies([{ name: "bcs-theme", value: "dark", url: reviewOrigin(baseURL) }]);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(`/${locale}/${path}`);

      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[locale]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}/${path}$`));
      await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute("href", new RegExp(`/ko/${path}$`));
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`/en/${path}$`));
      await expect(page.locator(`.footer-legal a[href="/${locale}/${path}"]`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
      expect(errors).toEqual([]);
    });
  }
}

test("legal language switch keeps the same document", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/ko/privacy-policy");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "EN · Switch to English" }).click();
  await expect(page).toHaveURL(/\/en\/privacy-policy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
});

test("sitemap lists both locales of the four documents", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  for (const locale of ["ko", "en"] as const) {
    for (const path of Object.keys(documents)) {
      expect(xml).toContain(`/${locale}/${path}</loc>`);
    }
  }
});
