import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function scrollFrames(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        function sample() {
          samples.push(window.scrollY);
          if (samples.length === 12) resolve(samples);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
  );
}

for (const locale of ["ko", "en"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`${locale} navigation keeps the page top with motion ${reducedMotion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);

      for (const section of ["about", "programs", "experience", "journal", "goods", "visit"]) {
        await page.locator(`.desktop-navigation a[href="/${locale}/${section}"]`).click();
        await expect(page).toHaveURL(`/${locale}/${section}`);
        await expect(page.locator(`.detail-${section}`)).toBeVisible();
        expect(await scrollFrames(page), `Unexpected scroll after ${section} navigation`).toEqual(Array(12).fill(0));
      }

      await page.locator(`.desktop-navigation a[href="/${locale}/visit"]`).click();
      expect(await scrollFrames(page), "Clicking the current page must keep the top").toEqual(Array(12).fill(0));

      await page.locator(".site-wordmark").click();
      await expect(page).toHaveURL(`/${locale}`);
      expect(await scrollFrames(page), "The wordmark must return to the page top").toEqual(Array(12).fill(0));

      await page.locator(".language-control").click();
      await expect(page).toHaveURL(`/${locale === "ko" ? "en" : "ko"}`);
      expect(await scrollFrames(page), "Changing locale must keep the page top").toEqual(Array(12).fill(0));
    });
  }
}

test("history restores the previous reading position", async ({ page }) => {
  await page.goto("/ko/about");
  await page.evaluate(() => document.fonts.ready);
  const nextPage = page.locator('.detail-visit a[href="/ko/visit"]');
  await nextPage.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const previousScroll = await page.evaluate(() => window.scrollY);
  expect(previousScroll).toBeGreaterThan(300);

  await nextPage.click();
  await expect(page).toHaveURL("/ko/visit");
  await page.goBack();
  await expect(page).toHaveURL("/ko/about");
  await expect.poll(() => page.evaluate(
    (previous) => window.scrollY - Math.min(previous, document.documentElement.scrollHeight - innerHeight),
    previousScroll,
  )).toBe(0);
});

test("the keyboard skip link keeps its intentional hash and focus", async ({ page }) => {
  await page.goto("/ko/about");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/ko/about#main");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page.locator("#main")).toBeInViewport();
});
