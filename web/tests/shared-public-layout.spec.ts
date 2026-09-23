import { expect, test } from "@playwright/test";
import { reviewOrigin } from "./helpers/review-runtime";

const routes = ["", "/programs", "/experience", "/collection", "/goods", "/news", "/visit"];
for (const locale of ["ko", "en"] as const) for (const theme of ["light", "dark"] as const) {
  test(`${locale} ${theme} public pages share the home header and responsive frame`, async ({ page, context, baseURL }, info) => {
    test.setTimeout(120_000);
    await context.addCookies([{ name: "bcs-theme", value: theme, url: reviewOrigin(baseURL) }]);
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    const measurements = [];
    for (const width of [320, 768, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      let homeHeader: unknown;
      for (const route of routes) {
        await page.goto(`/${locale}${route}`);
        const measured = await page.evaluate(() => {
          const header = document.querySelector<HTMLElement>(".site-header")!;
          const logo = [...header.querySelectorAll<HTMLElement>(".wordmark-img")].find(element => getComputedStyle(element).display !== "none")!;
          const main = document.querySelector<HTMLElement>("main")!;
          const container = main.matches(".container") ? main : main.querySelector<HTMLElement>(".container:not(.home-upcoming)")!;
          const rect = container.getBoundingClientRect();
          const contentLeft = rect.left + parseFloat(getComputedStyle(container).paddingLeft);
          const banner = main.querySelector<HTMLElement>(".home-upcoming");
          return {
            viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            background: getComputedStyle(document.body).backgroundColor,
            canvas: getComputedStyle(document.documentElement).backgroundColor,
            footer: getComputedStyle(document.querySelector(".site-footer")!).backgroundColor,
            theme: document.documentElement.dataset.theme,
            contentLeft, contentWidth: rect.width - 2 * parseFloat(getComputedStyle(container).paddingLeft),
            bannerLeft: banner?.getBoundingClientRect().left,
            header: { height: header.getBoundingClientRect().height, logoLeft: logo.getBoundingClientRect().left, logoWidth: logo.getBoundingClientRect().width, logoHeight: logo.getBoundingClientRect().height, border: getComputedStyle(header).borderBottomWidth, color: getComputedStyle(header).color },
          };
        });
        expect(measured.theme).toBe(theme);
        expect(measured.background).toBe(theme === "light" ? "rgb(255, 255, 255)" : "rgb(23, 25, 27)");
        expect(measured.canvas).toBe(measured.background);
        expect(measured.footer).toBe(measured.background);
        expect(measured.scrollWidth).toBe(width);
        expect(measured.header.height).toBe(74);
        expect(measured.header.border).toBe("0px");
        expect(Math.abs(measured.header.logoLeft - measured.contentLeft)).toBeLessThan(1);
        if (measured.bannerLeft !== undefined) expect(Math.abs(measured.bannerLeft - measured.contentLeft)).toBeLessThan(1);
        if (route === "") homeHeader = measured.header;
        else expect(measured.header).toEqual(homeHeader);
        if (width >= 1920) expect(measured.contentWidth).toBe(1664);
        measurements.push({ locale, route, width, ...measured });
        await page.waitForFunction(() => [...document.images].every(image => {
          const rect = image.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
          return !visible || (image.complete && image.naturalWidth > 0);
        }));
        await page.screenshot({ path: info.outputPath(`${locale}-${theme}-${width}-${route.slice(1) || "home"}.png`) });
        if (width === 1440) await page.locator(".site-footer").screenshot({ path: info.outputPath(`${locale}-${theme}-footer-${route.slice(1) || "home"}.png`) });
      }
    }
    await info.attach("layout-measurements", { body: JSON.stringify(measurements), contentType: "application/json" });
  });
}

test("public styles stay consistent during client navigation and leave admin palette intact", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/ko");
  await page.evaluate(() => document.documentElement.dataset.layoutSession = "client");
  await page.locator('.desktop-navigation a[href="/ko/collection"]').click();
  await expect(page).toHaveURL(/\/ko\/collection$/);
  await expect(page.locator("html")).toHaveAttribute("data-layout-session", "client");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
  await page.locator(".site-wordmark").click();
  await expect(page).toHaveURL(/\/ko$/);
  await page.goto("/ko/admin");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(250, 250, 248)");
});
