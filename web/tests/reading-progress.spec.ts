import { expect, test, type Page } from "@playwright/test";

const progress = (page: Page) => page.locator(".reading-progress").evaluate(
  (element) => new DOMMatrix(getComputedStyle(element).transform).a,
);

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`reading progress follows position and changing page dimensions: ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/ko");
    await page.evaluate(() => document.fonts.ready);

    for (const fraction of [0, 0.5, 1]) {
      await page.evaluate((fraction) => {
        window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * fraction, behavior: "instant" });
      }, fraction);
      await expect.poll(async () => Math.abs(await progress(page) - fraction)).toBeLessThan(0.002);
    }

    await page.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2, behavior: "instant" }));
    await expect.poll(async () => Math.abs(await progress(page) - 0.5)).toBeLessThan(0.002);
    await page.setViewportSize({ width: 1440, height: 600 });
    await expect.poll(() => progress(page)).toBeLessThan(0.49);
    const beforeGrowth = await progress(page);
    await page.locator("main").evaluate((element) => {
      const extra = document.createElement("div");
      extra.style.height = "800px";
      element.append(extra);
    });
    await expect.poll(() => progress(page)).toBeLessThan(beforeGrowth - 0.03);

    await page.setViewportSize({ width: 1440, height: 10000 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await expect.poll(() => progress(page)).toBe(0);
  });
}

test("reading progress follows client navigation and restored history without moving the page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ko/about");
  await page.evaluate(() => document.fonts.ready);
  const next = page.locator('.footer-navigation a[href="/ko/visit"]');
  await next.scrollIntoViewIfNeeded();
  await expect.poll(() => progress(page)).toBeGreaterThan(0.3);
  const previous = { scroll: await page.evaluate(() => scrollY), progress: await progress(page) };
  await next.click();
  await expect(page).toHaveURL("/ko/visit");
  await expect.poll(() => progress(page)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL("/ko/about");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(previous.scroll);
  await expect.poll(async () => Math.abs(await progress(page) - previous.progress)).toBeLessThan(0.002);
});

test.describe("static contact access", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of ["ko", "en"] as const) {
    test(`${locale} footer icons keep named destinations without JavaScript`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await page.goto(`/${locale}`);
      const contacts = page.locator(".footer-actions a");
      await expect(contacts).toHaveCount(4);
      await expect(contacts.nth(0)).toHaveAccessibleName(/hello@noncelab\.com/);
      await expect(contacts.nth(0)).toHaveAttribute("href", "mailto:hello@noncelab.com");
      await expect(contacts.nth(1)).toHaveAccessibleName(/702-1718/);
      await expect(contacts.nth(1)).toHaveAttribute("href", /^tel:/);
      for (const [index, href] of [[2, "https://x.com/BtcCtrSeoul"], [3, "https://www.instagram.com/bitcoincenterseoul/"]] as const) {
        await expect(contacts.nth(index)).toHaveAttribute("href", href);
        await expect(contacts.nth(index)).toHaveAccessibleName(/새 창|new window/);
        await expect(contacts.nth(index)).toHaveAttribute("target", "_blank");
        await expect(contacts.nth(index)).toHaveAttribute("rel", "noopener noreferrer");
      }
      for (const link of await contacts.all()) {
        await expect(link).toHaveText("");
        await expect(link.locator("svg")).toHaveCount(1);
        const box = await link.boundingBox();
        expect(box?.width).toBe(48);
        expect(box?.height).toBe(48);
      }
      await contacts.nth(0).focus();
      await expect(contacts.nth(0)).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(contacts.nth(1)).toBeFocused();
      await expect(page.locator(".reading-progress")).toHaveAttribute("aria-hidden", "true");
      expect(await progress(page)).toBe(0);
    });
  }
});
