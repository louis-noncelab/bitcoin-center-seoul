import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";
import { eventRecordSchema } from "../src/lib/events-contract";

const runtimeSchema = z.object({ ADMIN_PASSWORD: z.string().min(1) });
const responseSchema = z.object({ data: eventRecordSchema });
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const nextMonth = new Date(`${today.slice(0, 7)}-25T00:00:00Z`);
nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
const eventDate = nextMonth.toISOString().slice(0, 10);
const slug = `calendar-review-${randomUUID()}`;

test.describe.serial("event calendar date exploration", () => {
  let admin: APIRequestContext;
  const eventIds: number[] = [];

  test.beforeAll(async ({ baseURL }) => {
    const runtime = runtimeSchema.parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
    const reviewOrigin = baseURL ?? "http://127.0.0.1:3102";
    expect(new URL(reviewOrigin).hostname).toBe("127.0.0.1");
    admin = await request.newContext({ baseURL: reviewOrigin, extraHTTPHeaders: { origin: reviewOrigin } });
    expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).ok()).toBeTruthy();
    for (const [index, { date, time }] of [
      { date: eventDate, time: "19:00" },
      { date: eventDate.replaceAll("-", "."), time: "14:00" },
      { date: "2012-04-12", time: "10:00" },
    ].entries()) {
      const response = await admin.post("/api/admin/events", { data: {
        slug: `${slug}-${index}`, title: `[검토] 달력 행사 ${index}`, titleEn: `[Review] Calendar event ${index}`,
        date, time,
        venueType: "center", location: "비트코인 센터 서울", locationEn: "Bitcoin Center Seoul",
        description: "달력 탐색 검토용 행사입니다.", descriptionEn: "An event for the calendar navigation check.",
        image: "", link: "", images: [],
      } });
      expect(response.ok()).toBeTruthy();
      eventIds.push(responseSchema.parse(await response.json()).data.id);
    }
  });

  test.afterAll(async () => {
    for (const id of eventIds) await admin.delete(`/api/admin/events/${id}`);
    if (admin) await admin.dispose();
  });

  for (const locale of ["ko", "en"] as const) {
    test(`chooses a distant event month and respects the earliest month in ${locale}`, async ({ page }) => {
      // Given a published event makes April 2012 the first available month.
      await page.goto(`/${locale}/programs`);
      const calendar = page.getByRole("complementary", { name: locale === "ko" ? "행사 달력" : "Event calendar" });
      const toggle = calendar.locator(".calendar-month-toggle");
      const year = calendar.getByRole("textbox", { name: locale === "ko" ? "연도" : "Year", exact: true });

      // When a visitor edits the year, only an explicit available month changes the calendar.
      await toggle.click();
      await expect(year).toBeFocused();
      for (const invalid of ["", "20", "2011", "20000", "abcd"]) {
        await year.fill(invalid);
        await year.press("Enter");
        await expect(year).toHaveAttribute("aria-invalid", "true");
        await expect(calendar.locator(".calendar-month-options button:enabled")).toHaveCount(0);
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
      }
      await year.fill("2012");
      await expect(calendar.locator('[data-calendar-month="2012-03"]')).toBeDisabled();
      await calendar.locator('[data-calendar-month="2012-04"]').click();

      // Then navigation stops at the bound and selecting the date still focuses its event group.
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toBeFocused();
      await expect(calendar.getByRole("button", { name: locale === "ko" ? "이전 달" : "Previous month", exact: true })).toBeDisabled();
      await calendar.locator('[data-calendar-date="2012-04-12"]').click();
      await expect(page.locator("#events-on-2012-04-12")).toBeFocused();
    });

    test(`groups dotted dates and navigates to the chosen day in ${locale}`, async ({ page, request: publicRequest }) => {
      // Given two published events share a day, including a legacy dotted date
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (locale === "en") await page.setViewportSize({ width: 375, height: 812 });
      const response = await publicRequest.get(`/${locale}/programs`);
      const html = await response.text();
      for (const index of [0, 1]) expect(html).toContain(`href="/${locale}/programs/${slug}-${index}"`);
      await page.goto(`/${locale}/programs`);
      const calendar = page.getByRole("complementary", { name: locale === "ko" ? "행사 달력" : "Event calendar" });

      // When the visitor explores next month and selects its marked event date
      await calendar.getByRole("button", { name: locale === "ko" ? "다음 달" : "Next month", exact: true }).click();
      const day = calendar.locator(`button[data-event-date="${eventDate}"]`);
      await expect(day).toBeVisible();
      await day.click();

      // Then one localized date heading receives focus and both canonical links stay available
      const heading = page.locator(`#events-on-${eventDate}`);
      await expect(heading).toBeFocused();
      await expect(heading).toBeInViewport();
      await expect(heading).toHaveText(new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", { dateStyle: "full", timeZone: "UTC" }).format(nextMonth));
      await expect(day).toHaveAttribute("aria-pressed", "true");
      const group = page.locator(`.event-date-group:has(#events-on-${eventDate})`);
      const fixtureLinks = group.locator(`a[href*="${slug}"]`);
      await expect(fixtureLinks).toHaveCount(2);
      await expect(fixtureLinks.first()).toHaveAttribute("href", `/${locale}/programs/${slug}-1`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await calendar.getByRole("button", { name: locale === "ko" ? "이번 달" : "This month", exact: true }).click();
      await expect(calendar.locator(".calendar-month")).toHaveText(new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${today}T00:00:00Z`)));
    });
  }

  test("admin month selection preserves date entry and Escape closes only the inner picker", async ({ page }) => {
    // Given the same calendar is inside the administrator's date dialog.
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ko/admin");
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    const date = page.getByLabel("행사 날짜", { exact: true });
    await date.fill("2024-02-28");
    await page.getByRole("button", { name: "행사 날짜 달력 열기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "행사 날짜 선택", exact: true });
    const toggle = dialog.locator(".calendar-month-toggle");
    const year = dialog.getByRole("textbox", { name: "연도", exact: true });

    // When the administrator cancels year editing, then chooses a distant leap-year month.
    await toggle.click();
    await year.fill("20");
    await year.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(toggle).toBeFocused();
    await expect(date).toHaveValue("2024-02-28");
    await toggle.click();
    await year.fill("2000");
    await dialog.locator('[data-calendar-month="2000-02"]').click();
    await expect(date).toHaveValue("2024-02-28");
    await dialog.locator('[data-calendar-date="2000-02-29"]').click();

    // Then only selecting a day updates the field and closes the date dialog.
    await expect(date).toHaveValue("2000-02-29");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "행사 날짜 달력 열기", exact: true })).toBeFocused();
  });

  test("admin calendar enforces both supported year boundaries", async ({ page }) => {
    // Given the administrator calendar supports January 0100 through December 9999.
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto("/ko/admin");
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    await page.getByRole("button", { name: "행사 날짜 달력 열기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "행사 날짜 선택", exact: true });
    const toggle = dialog.locator(".calendar-month-toggle");
    const year = dialog.getByRole("textbox", { name: "연도", exact: true });

    // When the first and last supported months are selected directly.
    await toggle.click();
    await year.fill("0099");
    await expect(dialog.locator(".calendar-month-options button:enabled")).toHaveCount(0);
    await year.fill("0100");
    await dialog.locator('[data-calendar-month="0100-01"]').click();
    await expect(dialog.getByRole("button", { name: "이전 달", exact: true })).toBeDisabled();
    await toggle.click();
    await year.fill("9999");
    await dialog.locator('[data-calendar-month="9999-12"]').click();

    // Then the next-month control cannot navigate beyond the supported date format.
    await expect(dialog.getByRole("button", { name: "다음 달", exact: true })).toBeDisabled();
    await expect(dialog.locator('[data-calendar-date="9999-12-31"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "새 항목 등록", exact: true })).toBeVisible();
  });
});
