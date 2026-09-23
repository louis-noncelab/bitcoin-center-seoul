import { expect, test } from "@playwright/test";
import { inspectSlide } from "./disclosure-motion";
import { chooseVenue, venueField } from "./venue-menu";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

for (const locale of ["ko", "en"] as const) {
  test(`${locale} navigation and calendars slide in both directions`, async ({ page }, info) => {
    await page.setViewportSize({ width: locale === "ko" ? 375 : 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: locale === "ko" ? "light" : "dark" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/${locale}/about`);
    await page.locator(".navigation-trigger").click();
    const toggle = page.locator(".navigation-group-toggle").first();
    const region = page.locator(".navigation-groups .slide-region").first();
    await inspectSlide(page, region, () => toggle.click(), `${locale}-submenu`, info);
    await expect(region).toHaveAttribute("inert", "");
    await toggle.click();
    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(region).not.toHaveAttribute("inert");
    await page.keyboard.press("Escape");
    await expect(page.locator(".navigation-trigger")).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".navigation-trigger").click();
    await toggle.click();
    await expect(region).toBeHidden();
    expect(await region.evaluate(element => element.getAnimations().length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const route of ["", "/programs"]) {
      await page.goto(`/${locale}${route}`);
      const calendar = page.locator(".calendar").first();
      await calendar.scrollIntoViewIfNeeded();
      const picker = calendar.locator(".slide-region").first();
      const month = calendar.locator(".calendar-month-toggle");
      await inspectSlide(page, picker, () => month.click(), `${locale}-${route ? "programs" : "home"}-calendar`, info);
      await expect(picker).toHaveAttribute("inert", "");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await month.click();
      expect(await picker.evaluate(element => element.getAnimations().length)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(month).toBeFocused();
      await expect(picker).toBeHidden();
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    expect(errors).toEqual([]);
  });
}

test("venue fields and date picker keep closing content and keyboard boundaries", async ({ page }, info) => {
  const runtime = await reviewRuntime();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await page.request.post("/api/admin/login", { headers: { origin: reviewOrigin() }, data: { password: runtime.ADMIN_PASSWORD } })).ok()).toBe(true);
  await page.goto("/ko/admin");
  await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
  const venue = venueField(page);
  const region = page.locator(".event-venue-details .slide-region").last();
  await venue.getByRole("combobox").scrollIntoViewIfNeeded();
  let external = false;
  await inspectSlide(page, region, () => { external = !external; return chooseVenue(page, external ? "external" : "center"); }, "venue", info);
  await expect(page.locator('input[name="location"]')).toBeDisabled();
  await expect(region).toHaveAttribute("inert", "");
  const date = page.getByLabel("행사 날짜", { exact: true });
  await date.fill("2024-02-28");
  const openDate = page.getByRole("button", { name: "행사 날짜 달력 열기", exact: true });
  await openDate.click();
  const dialog = page.getByRole("dialog", { name: "행사 날짜 선택", exact: true });
  const picker = dialog.locator(".slide-region").first();
  await inspectSlide(page, picker, () => dialog.locator(".calendar-month-toggle").click(), "date-calendar", info);
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(openDate).toBeFocused();
  await expect(page.locator(".date-field-dialog .calendar")).toHaveCount(1);
  await date.fill("2025-03-01");
  await openDate.click();
  await expect(dialog.locator(".calendar-month-toggle")).toHaveText("2025년 3월");
  await page.keyboard.press("Escape");
});
