import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import { eventRecordSchema } from "../src/lib/events-contract";
import { centerEventLocation } from "../src/lib/event-location";
import { deleteContentFixture } from "./content-cleanup";
import { chooseVenue, expectVenue, venueField } from "./venue-menu";

const events = z.object({ data: z.array(eventRecordSchema) });

test("관리자가 센터 자동 주소와 외부 장소를 전환하고 저장한다", async ({ page, baseURL }, testInfo) => {
  if (baseURL !== "http://127.0.0.1:3102" || process.env.BCS_EVENTS_REVIEW !== "true" || !process.env.ADMIN_PASSWORD) throw new Error("Use the isolated review runner.");
  const slug = `venue-${randomUUID()}`;
  const title = `[검토] 장소 ${slug}`;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/ko/admin");
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(process.env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
  const venue = venueField(page);
  const korean = page.getByLabel("장소 · 한국어", { exact: true });
  const english = page.getByLabel("장소 · 영어 (선택)", { exact: true });
  const group = page.locator(".events-field-grid").filter({ has: venue });
  await expectVenue(page, "center");
  await expect(korean).toBeHidden();
  await expect(group).toContainText(centerEventLocation.location);
  await group.screenshot({ path: testInfo.outputPath("admin-center-375.png") });
  await page.getByLabel("제목 · 한국어", { exact: true }).fill(title);
  await page.getByLabel("제목 · 영어", { exact: true }).fill("[Review] Venue choice");
  await page.getByLabel("URL 슬러그", { exact: true }).fill(slug);
  await page.getByLabel("설명 · 한국어", { exact: true }).fill("장소 선택 검토용");
  await page.getByLabel("설명 · 영어", { exact: true }).fill("Local venue selection test");
  await page.getByLabel("행사 날짜", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".events-editor")).toHaveCount(0);
  const saved = async () => {
    const record = events.parse(await (await page.request.get("/api/admin/events")).json()).data.find(item => item.slug === slug);
    if (!record) throw new Error("Venue test record missing.");
    return record;
  };
  const initial = await saved();
  try {
    expect(initial).toMatchObject({ venueType: "center", ...centerEventLocation });
    const edit = () => page.locator(".events-admin-list > li").filter({ hasText: title }).getByRole("button", { name: "수정", exact: true }).click();
    await edit();
    await chooseVenue(page, "external");
    await expect(korean).toHaveAttribute("required", "");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    expect(await korean.evaluate(input => input instanceof HTMLInputElement && input.validity.valueMissing)).toBe(true);
    await korean.fill("외부 행사장 (서울 마포구)");
    await english.fill("External venue (Mapo-gu, Seoul)");
    await chooseVenue(page, "center");
    await expect(korean).toBeHidden();
    await chooseVenue(page, "external");
    await expect(korean).toHaveValue("외부 행사장 (서울 마포구)");
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await group.screenshot({ path: testInfo.outputPath(`admin-external-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".events-editor")).toHaveCount(0);
    expect(await saved()).toMatchObject({ venueType: "external", location: "외부 행사장 (서울 마포구)", locationEn: "External venue (Mapo-gu, Seoul)" });
    await page.reload();
    await edit();
    await expectVenue(page, "external");
    await expect(korean).toHaveValue("외부 행사장 (서울 마포구)");
    await chooseVenue(page, "center");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".events-editor")).toHaveCount(0);
    expect(await saved()).toMatchObject({ venueType: "center", ...centerEventLocation });
    expect(errors).toEqual([]);
  } finally { await deleteContentFixture(page.request, `/api/admin/events/${initial.id}`, baseURL); }
});
