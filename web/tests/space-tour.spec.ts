import { expect, test } from "@playwright/test";

test("space films respect motion preferences, visibility and explicit pause", async ({ page }) => {
  // Given: a visitor opens the tour with motion enabled.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ko/about");
  const lounge = page.locator("video").nth(0);
  const library = page.locator("video").nth(1);
  const gallery = page.locator("video").nth(2);
  await expect.poll(() => lounge.evaluate((film: HTMLVideoElement) => !film.paused && film.videoWidth === 640)).toBe(true);
  await expect(page.locator("video[src]")).toHaveCount(1);

  // When: motion is reduced, including before an unvisited scene is chosen.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => lounge.evaluate((film: HTMLVideoElement) => film.paused)).toBe(true);
  await page.getByRole("tab", { name: "서재", exact: true }).click();
  await expect(library).not.toHaveAttribute("src");
  await page.getByRole("button", { name: "서재 · 재생", exact: true }).click();
  await expect.poll(() => library.evaluate((film: HTMLVideoElement) => !film.paused && film.videoWidth === 640)).toBe(true);

  // Then: allowing motion again lets new scenes play; manual pause still persists.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("tab", { name: "전시", exact: true }).click();
  await expect.poll(() => gallery.evaluate((film: HTMLVideoElement) => !film.paused && film.videoWidth === 640)).toBe(true);
  await expect.poll(() => library.evaluate((film: HTMLVideoElement) => film.paused)).toBe(true);
  await page.getByRole("button", { name: "전시 · 일시정지", exact: true }).click();
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await gallery.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => gallery.evaluate((film: HTMLVideoElement) => film.paused)).toBe(true);
  await expect(page.getByRole("button", { name: "전시 · 재생", exact: true })).toBeVisible();
});
