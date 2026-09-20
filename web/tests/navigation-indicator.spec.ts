import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
});

test("hover and keyboard focus keep a single navigation underline", async ({ page }) => {
  await page.goto("/ko/news");
  await page.locator('.desktop-navigation[data-indicator-ready="true"]').waitFor();
  const destination = page.locator('.desktop-navigation a[href="/ko/experience"]');
  for (const interaction of ["hover", "focus"] as const) {
    await destination[interaction]();
    await page.waitForTimeout(350);
    const lines = await page.locator(".desktop-navigation").evaluate((navigation) => {
      const marker = navigation.querySelector(".navigation-indicator");
      const labels = [...navigation.querySelectorAll(".navigation-feedback")];
      return Number(marker && Number(getComputedStyle(marker).opacity) > 0) + labels.filter((label) => {
        const style = getComputedStyle(label, "::after");
        return style.display !== "none" && Number(style.opacity) > 0 && new DOMMatrix(style.transform).a > 0;
      }).length;
    });
    expect(lines).toBe(1);
  }
});

test("cached navigation and history carry the underline from its current position", async ({ page }) => {
  await page.goto("/ko/experience");
  await page.locator('.desktop-navigation[data-indicator-ready="true"]').waitFor();
  await page.locator('.desktop-navigation a[href="/ko/news"]').click();
  await expect(page).toHaveURL("/ko/news");
  await page.locator('.desktop-navigation[data-indicator-ready="true"]').waitFor();
  await page.waitForTimeout(350);

  for (const back of [false, true]) {
    const target = back ? "/ko/news" : "/ko/experience";
    const marker = page.locator(".desktop-navigation .navigation-indicator");
    const from = await marker.boundingBox();
    const to = await page.locator(`.desktop-navigation a[href="${target}"] .navigation-feedback`).boundingBox();
    if (!from || !to) throw new Error("Navigation geometry is unavailable");
    const trace = page.evaluate(() => new Promise<{ x: number; y: number }[]>((resolve) => {
      const frames: { x: number; y: number }[] = [];
      const start = performance.now();
      function sample() {
        const navigation = [...document.querySelectorAll(".desktop-navigation")].find((element) => element.getBoundingClientRect().width > 0);
        const indicator = navigation?.querySelector(".navigation-indicator");
        if (indicator && Number(getComputedStyle(indicator).opacity) > 0.1) {
          const rect = indicator.getBoundingClientRect();
          frames.push({ x: rect.x, y: rect.y });
        }
        if (performance.now() - start < 800) requestAnimationFrame(sample);
        else resolve(frames);
      }
      requestAnimationFrame(sample);
    }));
    if (back) await page.goBack();
    else await page.locator(`.desktop-navigation a[href="${target}"]`).click();
    await expect(page).toHaveURL(target);
    const frames = await trace;
    expect(frames.length).toBeGreaterThan(3);
    expect(Math.min(...frames.map((frame) => frame.x))).toBeGreaterThanOrEqual(Math.min(from.x, to.x) - 1);
    expect(Math.max(...frames.map((frame) => frame.x))).toBeLessThanOrEqual(Math.max(from.x, to.x) + 1);
    expect(frames.some((frame) => frame.x > Math.min(from.x, to.x) + 2 && frame.x < Math.max(from.x, to.x) - 2)).toBe(true);
    expect(frames.every((frame) => Math.abs(frame.y - from.y) < 1)).toBe(true);
    expect(frames.at(-1)?.x).toBeCloseTo(to.x, 0);
  }
});

test("initial page load places the underline directly under the current label", async ({ page }) => {
  await page.addInitScript(() => {
    const offsets: number[] = [];
    Reflect.set(window, "navigationInitialOffsets", offsets);
    function sample() {
      const navigation = document.querySelector('.desktop-navigation[data-indicator-ready="true"]');
      const marker = navigation?.querySelector(".navigation-indicator");
      const label = navigation?.querySelector('[aria-current="page"] .navigation-feedback');
      if (marker && label) offsets.push(Math.abs(marker.getBoundingClientRect().x - label.getBoundingClientRect().x));
      if (performance.now() < 5000) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.goto("/ko/news", { waitUntil: "domcontentloaded" });
  await page.locator('.desktop-navigation[data-indicator-ready="true"]').waitFor();
  await page.waitForTimeout(350);
  const offsets: number[] = await page.evaluate(() => Reflect.get(window, "navigationInitialOffsets"));
  expect(offsets.length).toBeGreaterThan(1);
  expect(Math.max(...offsets)).toBeLessThan(1);
});
