import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { eventRecordSchema } from "../src/lib/events-contract";
import { noticeRecordSchema } from "../src/lib/notices-contract";

type Photo = { readonly name: string; readonly mimeType: string; readonly buffer: Buffer };

async function signIn(page: Page) {
  const { ADMIN_PASSWORD } = z.object({ ADMIN_PASSWORD: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toHaveCount(0);
}

async function choosePhotos(page: Page, label: string, files: readonly Photo[]) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: `${label} 사진 첨부`, exact: true }).click();
  await (await chooser).setFiles([...files]);
}

async function dropPhoto(page: Page, field: Locator, photo: Photo) {
  const transfer = await page.evaluateHandle(({ name, mimeType, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], name, { type: mimeType }));
    return data;
  }, { name: photo.name, mimeType: photo.mimeType, base64: photo.buffer.toString("base64") });
  try {
    await field.dispatchEvent("dragover", { dataTransfer: transfer });
    expect(await field.evaluate((element, dataTransfer) => !element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer })), transfer)).toBe(true);
  } finally { await transfer.dispose(); }
}

test("본문 사진 버튼과 드래그 업로드가 입력 위치·작성 중인 글·동시 업로드를 보존한다", async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  const slug = `inline-${randomUUID()}`;
  const release: (() => void)[] = [];
  let id: number | undefined;
  await page.goto("/ko/admin");
  await signIn(page);
  await page.route("**/api/admin/images", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => release.push(resolve));
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    await page.getByLabel("제목 · 한국어", { exact: true }).fill(`[검토] 본문 사진 ${slug}`);
    await page.getByLabel("URL 슬러그", { exact: true }).fill(slug);
    await page.getByLabel("제목 · 영어", { exact: true }).fill("[Review] Inline photos");
    await page.getByLabel("행사 날짜", { exact: true }).fill("2026-10-10");
    const korean = page.getByLabel("설명 · 한국어", { exact: true });
    const english = page.getByLabel("설명 · 영어", { exact: true });
    await korean.fill("앞 문단\n\n뒤 문단");
    await english.fill("Before\n\nAfter");
    const buffer = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#ff6b0a" } }).png().toBuffer();
    const portrait = await sharp({ create: { width: 40, height: 80, channels: 3, background: "#32699f" } }).png().toBuffer();
    const photos = [
      { name: "inside[one].png", mimeType: "image/png", buffer },
      { name: "inside-two.png", mimeType: "image/png", buffer: portrait },
    ];
    await korean.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(4, 4));
    await choosePhotos(page, "설명 · 한국어", photos);
    await expect.poll(() => release.length).toBe(1);
    await korean.focus();
    await korean.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(0, 0));
    await korean.pressSequentially("작성 중 · ");
    await english.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(6, 6));
    await dropPhoto(page, english, { name: "dropped.png", mimeType: "image/png", buffer });
    await expect.poll(() => release.length).toBe(2);
    await page.getByLabel("사진 여러 장 선택", { exact: true }).setInputFiles({ name: "cover.png", mimeType: "image/png", buffer });
    await expect.poll(() => release.length).toBe(3);
    const save = page.getByRole("button", { name: "저장", exact: true });
    await expect(save).toBeDisabled();
    await expect(page.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    release[0]?.();
    await expect(korean).toHaveValue(/!\[inside\\\[one\\\]\]\(\/images\/uploads\//);
    await expect(save).toBeDisabled();
    release[1]?.();
    await expect(english).toHaveValue(/!\[dropped\]\(\/images\/uploads\//);
    await expect(save).toBeDisabled();
    release[2]?.();
    await expect(page.getByText("1장 선택됨", { exact: true })).toBeVisible();
    await expect(save).toBeEnabled();
    const body = await korean.inputValue();
    expect(body.startsWith("작성 중 · 앞 문단\n\n![")).toBe(true);
    expect(body.endsWith("뒤 문단")).toBe(true);
    expect((body.match(/!\[/g) ?? [])).toHaveLength(2);
    await save.click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const record = z.object({ data: z.array(eventRecordSchema) }).parse(await (await page.request.get("/api/events")).json()).data.find((item) => item.slug === slug);
    if (!record) throw new Error("Inline photo review event missing");
    id = record.id;
    expect(record.description).toBe(body.trim());
    expect(record.images).toHaveLength(1);
    expect(record.descriptionEn).toMatch(/^Before\n\n!\[dropped\]/);
    await page.goto(`/ko/programs/${slug}`);
    await expect(page.locator(".event-description img")).toHaveCount(2);
    await expect(page.locator(".photo-gallery img")).toHaveCount(1);
    await expect(page.locator(".event-description img").first()).toHaveAttribute("alt", "inside[one]");
    for (const photo of await page.locator(".event-description img").all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect.poll(() => photo.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      const ratios = await photo.evaluate((element: HTMLImageElement) => ({ rendered: element.width / element.height, natural: element.naturalWidth / element.naturalHeight }));
      expect(ratios.rendered).toBeCloseTo(ratios.natural, 2);
    }
  } finally {
    for (const resume of release) resume();
    await page.unrouteAll({ behavior: "wait" });
    if (id !== undefined) await page.request.delete(`/api/admin/events/${id}`, { headers: { origin: baseURL ?? "" } });
  }
});

test("본문 글자 제한과 세션 만료 후 사진 재시도가 글을 보존한다", async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  const slug = `inline-notice-${randomUUID()}`;
  let id: number | undefined;
  let uploads = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/admin/images" && request.method() === "POST") uploads += 1; });
  await page.goto("/ko/admin/notices");
  await signIn(page);
  try {
    await page.getByRole("button", { name: "공지 등록", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill(`[검토] 본문 첨부 ${slug}`);
    await page.getByLabel("URL 슬러그", { exact: true }).fill(slug);
    const body = page.getByLabel("본문", { exact: true });
    const editor = page.locator(".markdown-editor").filter({ has: body });
    const fullText = "가".repeat(19_990);
    await body.fill(fullText);
    const buffer = await sharp({ create: { width: 40, height: 60, channels: 3, background: "#32699f" } }).png().toBuffer();
    const photo = { name: "notice.png", mimeType: "image/png", buffer };
    await choosePhotos(page, "본문", [photo]);
    await expect(editor.getByRole("alert")).toContainText("20,000자를 초과합니다");
    await expect(body).toHaveValue(fullText);
    expect(uploads).toBe(1);
    await body.fill("앞 문단\n\n뒤 문단");
    await editor.getByRole("button", { name: "사진 첨부 다시 시도", exact: true }).click();
    await expect(body).toHaveValue(/!\[notice\]\(\/images\/uploads\//);
    expect(uploads).toBe(1);
    const preserved = await body.inputValue();
    expect(preserved).toContain("앞 문단\n\n뒤 문단");
    const logout = await page.request.post("/api/admin/logout", { headers: { origin: baseURL ?? "" }, data: {} });
    expect(logout.ok()).toBe(true);
    await choosePhotos(page, "본문", [{ ...photo, name: "after-login.png" }]);
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
    await expect(body).toHaveValue(preserved);
    await expect(page.getByRole("button", { name: "저장", exact: true })).toBeDisabled();
    await signIn(page);
    await editor.getByRole("button", { name: "사진 첨부 다시 시도", exact: true }).click();
    await expect(body).toHaveValue(/!\[after-login\]\(\/images\/uploads\//);
    expect(uploads).toBe(3);
    expect(await body.inputValue()).toContain(preserved);
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const record = z.object({ data: z.array(noticeRecordSchema) }).parse(await (await page.request.get("/api/admin/notices")).json()).data.find((item) => item.slug === slug);
    if (!record) throw new Error("Inline photo review notice missing");
    id = record.id;
    await page.goto(`/ko/notices/${slug}`);
    await expect(page.locator(".event-description img")).toHaveCount(2);
    await expect(page.locator(".event-description")).toContainText("앞 문단");
    await expect(page.locator(".event-description")).toContainText("뒤 문단");
  } finally {
    if (id !== undefined) await page.request.delete(`/api/admin/notices/${id}`, { headers: { origin: baseURL ?? "" } });
  }
});

test("업로드 중 페이지를 떠나면 경고하고 늦은 응답이 새 초안에 들어가지 않는다", async ({ page }) => {
  let resume: () => void = () => {};
  let waiting = false;
  let warned = false;
  await page.goto("/ko/admin");
  await signIn(page);
  await page.route("**/api/admin/images", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => { resume = resolve; waiting = true; });
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    const buffer = await sharp({ create: { width: 60, height: 40, channels: 3, background: "#ff6b0a" } }).png().toBuffer();
    await choosePhotos(page, "설명 · 한국어", [{ name: "abandoned.png", mimeType: "image/png", buffer }]);
    await expect.poll(() => waiting).toBe(true);
    page.once("dialog", async (dialog) => { warned = dialog.type() === "beforeunload"; await dialog.accept(); });
    const aborted = page.waitForEvent("requestfailed", { predicate: (request) => new URL(request.url()).pathname === "/api/admin/images" });
    await page.getByRole("link", { name: "비트코인 센터 서울 홈", exact: true }).click();
    await expect(page).toHaveURL("/ko");
    resume();
    expect((await aborted).failure()?.errorText).toBeTruthy();
    expect(warned).toBe(true);
    await page.unrouteAll({ behavior: "wait" });
    await page.goto("/ko/admin");
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    await expect(page.getByLabel("설명 · 한국어", { exact: true })).toHaveValue("");
    await expect(page.getByRole("button", { name: "저장", exact: true })).toBeEnabled();
  } finally {
    resume();
    await page.unrouteAll({ behavior: "wait" });
  }
});
