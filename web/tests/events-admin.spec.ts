import { deleteContentFixture } from "./content-cleanup";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { eventRecordSchema, highlightRecordSchema } from "../src/lib/events-contract";

async function login(page: Page) {
  const { ADMIN_PASSWORD } = z.object({ ADMIN_PASSWORD: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "행사 목록", exact: true })).toBeVisible();
}

async function expectSmoothFocus(field: Locator) {
  const bounds = await field.boundingBox();
  await field.focus();
  const scales = await field.evaluate((element) => {
    const control = element.parentElement;
    if (!control?.classList.contains("form-control")) throw new Error("Missing shared field control");
    const transition = control.getAnimations({ subtree: true }).find((animation) => animation instanceof CSSTransition && animation.transitionProperty === "transform");
    if (!transition?.effect) return [];
    const duration = Number(transition.effect.getComputedTiming().duration);
    transition.pause();
    const frames = [0, duration / 2, duration].map((time) => {
      transition.currentTime = time;
      return new DOMMatrixReadOnly(getComputedStyle(control, "::after").transform).a;
    });
    transition.finish();
    return frames;
  });
  expect(scales).toHaveLength(3);
  expect(scales[0]).toBe(0);
  expect(scales[1]).toBeGreaterThan(0);
  expect(scales[1]).toBeLessThan(1);
  expect(scales[2]).toBe(1);
  const line = await field.locator("..").evaluate((element) => {
    const style = getComputedStyle(element, "::after");
    return { height: style.height, origin: parseFloat(style.transformOrigin), width: parseFloat(style.width) };
  });
  expect(line.height).toBe("2px");
  expect(line.origin).toBeCloseTo(line.width / 2);
  await expect(field).toHaveCSS("outline-style", "none");
  expect(await field.boundingBox()).toEqual(bounds);
}

for (const theme of ["light", "dark"]) {
  test(`입력 하단 선이 중앙에서 펼쳐지고 모션 감소에서는 즉시 표시된다 · ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("bcs-theme", value), theme);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/ko/admin");
    await expectSmoothFocus(page.getByLabel("관리자 비밀번호", { exact: true }));
    await login(page);
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    for (const field of [page.getByLabel("제목 · 한국어", { exact: true }), page.getByLabel("행사 날짜", { exact: true }), page.getByRole("button", { name: "사진 여러 장 선택", exact: true }), page.getByRole("button", { name: "저장", exact: true })]) {
      expect((await field.boundingBox())?.height).toBe(48);
    }
    const description = page.getByLabel("설명 · 한국어", { exact: true });
    await description.scrollIntoViewIfNeeded();
    await expectSmoothFocus(description);

    await description.blur();
    const control = description.locator("..");
    expect(await control.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await control.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    await description.focus();
    expect(await control.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform).a)).toBe(1);
    expect(await control.evaluate((element) => getComputedStyle(element, "::after").backgroundColor)).toBe(theme === "light" ? "rgb(174, 67, 8)" : "rgb(255, 138, 64)");
    await page.emulateMedia({ forcedColors: "active" });
    await expect(description).toHaveCSS("outline-style", "solid");
    await description.blur();
    await expect(description).toHaveCSS("outline-style", "none");
  });
}

test("행사 등록, 사진 두 장 업로드, 수정, 세션 만료 후 초안 보존, 삭제", async ({ page, baseURL }) => {
  const title = `[검토] 행사 ${randomUUID()}`;
  const slug = `event-${randomUUID()}`;
  let id: number | undefined;
  await page.goto("/ko/admin");
  await login(page);
  try {
    await page.getByRole("button", { name: "새 항목 등록" }).click();
    await page.getByLabel("제목 · 한국어", { exact: true }).fill(title);
    await page.getByLabel("URL 슬러그", { exact: true }).fill(slug);
    await page.getByLabel("제목 · 영어", { exact: true }).fill("[Review] Event gallery");
    await page.getByLabel("설명 · 한국어", { exact: true }).fill("검토용 행사입니다. 공개 운영 자료가 아닙니다.");
    await page.getByLabel("설명 · 영어", { exact: true }).fill("Local review event, not an operational event.");
    await page.getByLabel("행사 날짜", { exact: true }).fill("2026-10-10");
    await page.getByLabel("시간", { exact: true }).fill("14:00–16:00");
    await page.getByLabel("장소 · 한국어", { exact: true }).fill("비트코인 센터 서울");
    await page.getByLabel("장소 · 영어", { exact: true }).fill("Bitcoin Center Seoul");
    const buffers = await Promise.all(["#ff6b0a", "#32699f"].map((background) => sharp({ create: { width: 80, height: 60, channels: 3, background } }).png().toBuffer()));
    await page.getByLabel("사진 여러 장 선택").setInputFiles(buffers.map((buffer, index) => ({ name: `review-${index}.png`, mimeType: "image/png", buffer })));
    await expect(page.getByText("2장 선택됨", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const initial = z.object({ data: z.array(eventRecordSchema) }).parse(await (await page.request.get("/api/events")).json()).data.find((record) => record.title === title);
    expect(initial).toBeDefined();
    if (!initial) throw new Error("Created review event missing");
    id = initial.id;
    expect(initial.images).toHaveLength(2);
    expect(initial.slug).toBe(slug);
    await page.goto(`/en/programs/${id}`);
    await expect(page).toHaveURL(`/en/programs/${slug}`);
    await expect(page.getByRole("heading", { name: "[Review] Event gallery", exact: true })).toBeVisible();
    await page.goto("/ko/admin");
    const row = page.locator(".events-admin-list > li").filter({ hasText: title });
    await row.getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("제목 · 한국어", { exact: true }).fill(title + " 수정");
    await page.getByLabel("URL 슬러그", { exact: true }).fill(slug + "-updated");
    await page.getByRole("button", { name: "사진 2 앞으로", exact: true }).click();
    const logout = await page.request.post("/api/admin/logout", { headers: { origin: baseURL ?? "" }, data: {} });
    expect(logout.ok()).toBeTruthy();
    const expiredBuffer = buffers[0];
    if (!expiredBuffer) throw new Error("Review image was not generated");
    await page.getByLabel("사진 여러 장 선택").setInputFiles({ name: "expired.png", mimeType: "image/png", buffer: expiredBuffer });
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
    await expect(page.getByText("2장 선택됨", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.")).toBeVisible();
    await expect(page.getByLabel("제목 · 한국어", { exact: true })).toHaveValue(title + " 수정");
    const { ADMIN_PASSWORD } = z.object({ ADMIN_PASSWORD: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
    await page.getByLabel("관리자 비밀번호", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const amended = z.object({ data: eventRecordSchema }).parse(await (await page.request.get(`/api/events/${id}`)).json()).data;
    expect(amended.title).toBe(title + " 수정");
    expect(amended.slug).toBe(slug + "-updated");
    const previousUrl = await page.request.get(`/en/programs/${slug}`, { maxRedirects: 0 });
    expect(previousUrl.status()).toBe(308);
    expect(previousUrl.headers().location).toBe(`/en/programs/${slug}-updated`);
    expect(amended.images).toEqual([...initial.images].reverse());
    await page.locator(".events-admin-list > li").filter({ hasText: title + " 수정" }).getByRole("button", { name: "삭제", exact: true }).click();
    await page.getByRole("dialog", { name: "항목 삭제", exact: true }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText("삭제했습니다.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/api/events/${id}`)).status()).toBe(404);
  } finally {
    if (id !== undefined) await deleteContentFixture(page.request, `/api/admin/events/${id}`, baseURL ?? "");
  }
});

test("하이라이트 기간과 비공개 상태를 저장하며 관리자 화면은 영어 경로에서도 한국어", async ({ page, baseURL }) => {
  const title = `[검토] 하이라이트 ${randomUUID()}`;
  const slug = `highlight-${randomUUID()}`;
  let id: number | undefined;
  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { name: "행사·하이라이트 관리", exact: true })).toBeVisible();
  await login(page);
  try {
    await page.getByRole("button", { name: "하이라이트", exact: true }).click();
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    await page.getByLabel("제목 · 한국어", { exact: true }).fill(title);
    await page.getByLabel("URL 슬러그", { exact: true }).fill(slug);
    await page.getByLabel("제목 · 영어", { exact: true }).fill("[Review] Highlight");
    await page.getByLabel("설명 · 한국어", { exact: true }).fill("검토용 하이라이트");
    await page.getByLabel("설명 · 영어", { exact: true }).fill("Local review highlight");
    await page.getByLabel("시작일", { exact: true }).fill("2026-09-01");
    await page.getByLabel("종료일", { exact: true }).fill("2026-09-03");
    await page.getByLabel("공개", { exact: true }).uncheck();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const items = z.object({ data: z.array(highlightRecordSchema) }).parse(await (await page.request.get("/api/admin/highlights")).json()).data;
    const record = items.find((item) => item.title === title);
    expect(record).toBeDefined();
    if (!record) throw new Error("Created review highlight missing");
    id = record.id;
    expect(record.slug).toBe(slug);
    expect(record.startDate).toBe("2026-09-01");
    expect(record.endDate).toBe("2026-09-03");
    expect((await page.request.get(`/api/highlights/${id}`)).status()).toBe(404);
    await page.locator(".events-admin-list > li").filter({ hasText: title }).getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/api/highlights/${id}`)).status()).toBe(200);
  } finally {
    if (id !== undefined) await deleteContentFixture(page.request, `/api/admin/highlights/${id}`, baseURL ?? "");
  }
});
