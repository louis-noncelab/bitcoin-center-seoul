import Database from "better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { test, expect, request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { eventRecordSchema } from "../src/lib/events-contract";
import { deleteContentFixture } from "./content-cleanup";
import { reviewRuntime } from "./helpers/review-runtime";

test("admin can close and reopen participation without losing the link or bypassing revisions", async ({ page, baseURL }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const runtime = await reviewRuntime();
  expect(baseURL).toBe(runtime.APP_ORIGIN);
  const origin = runtime.APP_ORIGIN;
  const admin = await request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  const guest = await request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).ok()).toBeTruthy();
  const slug = `registration-${randomUUID()}`;
  const title = `[검토] 참여 마감 ${slug}`;
  const link = "https://pay.zaprite.com/local-registration-test?ticket=early#checkout";
  const input = { slug, title, titleEn: "Registration review", date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()), time: "00:01", venueType: "center", location: "", locationEn: "", description: "참여 설정 검토", descriptionEn: "Registration test", link, image: "", images: [], tags: [] };
  const created = await admin.post("/api/admin/events", { data: input });
  expect(created.ok()).toBeTruthy();
  const event = eventRecordSchema.parse((await created.json()).data);
  try {
    expect(event.registrationClosed).toBe(false);
    // Simulate an imported event with no venue; closing must not require editing legacy fields.
    if (runtime.DATABASE_URL) {
      const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtime.DATABASE_URL }) });
      try { await db.centerEvent.update({ where: { id: event.id }, data: { venueType: "external", location: "", locationEn: "" } }); }
      finally { await db.$disconnect(); }
    } else if (runtime.BCS_EVENTS_DB) {
      const db = new Database(runtime.BCS_EVENTS_DB);
      try { db.prepare("UPDATE events SET venueType = 'external', location = '', locationEn = '' WHERE id = ?").run(event.id); }
      finally { db.close(); }
    }
    const patch = { headers: { "If-Match": `"${event.revision}"` }, data: { registrationClosed: true } };
    expect((await guest.patch(`/api/admin/events/${event.id}`, patch)).status()).toBe(401);
    expect((await admin.patch(`/api/admin/events/${event.id}`, { ...patch, headers: { ...patch.headers, origin: "https://invalid.example" } })).status()).toBe(403);
    expect((await admin.patch(`/api/admin/events/${event.id}`, { ...patch, data: { registrationClosed: "true" } })).status()).toBe(400);
    expect((await admin.patch(`/api/admin/events/${event.id}`, { ...patch, data: { registrationClosed: true, title: "unexpected" } })).status()).toBe(400);
    expect((await guest.put(`/api/admin/events/${event.id}`, { headers: { "If-Match": `"${event.revision}"` }, data: { ...input, registrationClosed: true } })).status()).toBe(401);
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto("/ko/admin");
    const toggle = page.getByRole("switch", { name: `${title} 참여 마감`, exact: true });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    const originalToggle = await toggle.elementHandle();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(await originalToggle?.evaluate((element) => element.isConnected), "Keep the switch mounted so its thumb can slide without flashing the list").toBe(true);
    await page.screenshot({ path: info.outputPath("registration-admin-closed.png") });
    let current = eventRecordSchema.parse((await (await admin.get(`/api/admin/events/${event.id}`)).json()).data);
    expect(current.registrationClosed).toBe(true);
    expect(current.link).toBe(link);
    expect(current.venueType).toBe("external");
    expect(current.location).toBe("");
    expect((await admin.patch(`/api/admin/events/${event.id}`, patch)).status()).toBe(409);
    expect((await admin.put(`/api/admin/events/${event.id}`, { headers: { "If-Match": `"${event.revision}"` }, data: { ...input, registrationClosed: false } })).status()).toBe(409);
    // Older clients that omit the additive field must not reopen registration.
    expect((await admin.put(`/api/admin/events/${event.id}`, { headers: { "If-Match": `"${current.revision}"` }, data: input })).ok()).toBeTruthy();
    current = eventRecordSchema.parse((await (await admin.get(`/api/admin/events/${event.id}`)).json()).data);
    expect(current.registrationClosed).toBe(true);
    for (const locale of ["ko", "en"]) {
      for (const path of [`/${locale}`, `/${locale}/programs`, `/${locale}/programs/${slug}`]) {
        await page.goto(path);
        await expect(page.locator(`a[href="${link}"]`)).toHaveCount(0);
        await expect(page.getByText(locale === "ko" ? "참여 마감" : "Registration closed", { exact: true }).first()).toBeVisible();
      }
      await page.setViewportSize({ width: 375, height: 900 });
      await page.screenshot({ path: info.outputPath(`registration-${locale}-closed.png`) });
    }
    await page.goto("/ko/admin");
    await page.locator(".events-admin-list > li").filter({ hasText: title }).getByRole("button", { name: "수정", exact: true }).click();
    await expect(page.locator('input[name="registrationClosed"]')).toBeChecked();
    await expect(page.getByLabel("참여하기 버튼 링크 (선택)", { exact: true })).toHaveValue(link);
    await page.locator('input[name="registrationClosed"]').uncheck();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await page.goto(`/ko/programs/${slug}`);
    await expect(page.locator(".event-booking-link")).toHaveAttribute("href", link);
    await expect(page.locator(".event-booking-link")).toContainText("참여하기");
    await page.screenshot({ path: info.outputPath("registration-reopened.png") });
    await page.goto("/ko/admin");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  } finally {
    await deleteContentFixture(admin, `/api/admin/events/${event.id}`, origin);
    await admin.dispose(); await guest.dispose();
  }
});
