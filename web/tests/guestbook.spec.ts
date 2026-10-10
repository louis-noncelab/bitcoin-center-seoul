import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";
import { guestbookRecordSchema } from "../src/lib/guestbook-contract";
import { z } from "zod";

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(10_000);
  await page.route(/https:\/\/(?:www\.)?googletagmanager\.com\//, (route) => route.abort());
});

test("방명록 등록, 이미지 변환, 공개와 비공개, 충돌과 세션 만료, 모바일 및 삭제", async ({ page, request, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  const visitorName = `[테스트] 방문자 ${randomUUID().slice(0, 8)}`;
  let id: number | undefined;
  const headers = { origin };
  const login = async () => {
    await page.getByLabel("관리자 비밀번호", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toHaveCount(0);
  };
  const records = async () => z.array(guestbookRecordSchema).parse((await (await page.request.get("/api/admin/guestbook")).json()).data);
  const current = async () => (await records()).find((entry) => entry.id === id)!;
  const row = () => page.locator(".events-admin-list > li").filter({ hasText: visitorName });
  expect((await request.get("/api/admin/guestbook")).status()).toBe(401);
  expect((await request.post("/api/admin/guestbook", { headers, data: {} })).status()).toBe(401);
  await page.goto("/ko/admin/guestbook");
  await login();
  await expect(page.getByRole("link", { name: "방명록", exact: true })).toHaveAttribute("aria-current", "page");
  try {
    expect((await page.request.post("/api/admin/guestbook", { headers: { origin: "https://example.com" }, data: {} })).status()).toBe(403);
    await page.getByRole("button", { name: "방명록 등록", exact: true }).click();
    await expect(page.getByRole("radio", { name: "비공개", exact: true })).toBeChecked();
    await page.getByLabel("방문 날짜", { exact: true }).fill("2026-10-09");
    await page.getByLabel("방문자명 (선택)").fill(visitorName);
    const body = "책을 읽다가 이야기를 나누고 왔습니다.\n다음에 친구와 함께 들를게요. <script>alert(1)</script>";
    await page.getByLabel("방명록 내용", { exact: true }).fill(body);
    const buffer = await sharp(new URL("../../public/images/what-we-do/lounge.jpeg", import.meta.url).pathname).resize(2000).jpeg().withExif({ IFD0: { Artist: "Test fixture" } }).toBuffer();
    await page.route("**/api/admin/images", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    await page.getByLabel("사진 여러 장 선택").setInputFiles({ name: "guestbook.jpg", mimeType: "image/jpeg", buffer });
    await expect(page.getByRole("progressbar", { name: "사진 업로드 및 변환 진행 중" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("admin-upload-progress.png"), fullPage: true });
    await expect(page.getByText("1장 선택됨", { exact: true })).toBeVisible();
    await page.route("**/api/admin/guestbook", async (route) => { if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("progressbar", { name: "방명록 처리 진행 중" })).toBeVisible();
    await expect(page.getByText("비공개로 저장했습니다.", { exact: true })).toBeVisible();
    const draft = (await records()).find((entry) => entry.visitorName === visitorName)!;
    id = draft.id;
    expect(draft.images[0]).toMatch(/\.webp$/);
    const photo = await page.request.get(draft.images[0]!);
    const metadata = await sharp(await photo.body()).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.exif).toBeUndefined();
    expect((await request.get(draft.images[0]!)).status()).toBe(404);
    expect(await (await request.get("/ko/guestbook")).text()).not.toContain(visitorName);
    expect((await page.request.put(`/api/admin/guestbook/${id}`, { headers, data: { visitDate: draft.visitDate, body } })).status()).toBe(428);
    await row().getByRole("button", { name: "수정", exact: true }).click();
    await page.getByRole("radio", { name: "공개", exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다. 사이트에 공개됩니다.", { exact: true })).toBeVisible();
    expect((await request.get(draft.images[0]!)).status()).toBe(200);
    for (const locale of ["ko", "en"]) {
      await page.goto(`/${locale}/guestbook`);
      await expect(page.locator(`#entry-${id} .guestbook-body`)).toHaveText(body);
      await expect(page.locator(`#entry-${id} script`)).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://bitcoincenterseoul.com/${locale}/guestbook`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
      await expect(page.locator(".guestbook-visit a")).toHaveAttribute("href", `/${locale}/visit`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`guestbook-${locale}-${theme}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko");
    await expect(page.locator(".guestbook-preview")).toContainText(visitorName);
    await page.goto("/ko/admin/guestbook");
    await row().getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("방명록 내용", { exact: true }).fill("저장 전 변경사항");
    await page.getByRole("link", { name: "공지사항", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("변경사항을 버릴까요?");
    await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
    const before = await current();
    const { revision } = before;
    const input = { visitDate: before.visitDate, visitorName: before.visitorName, body: before.body, bodyEn: before.bodyEn, images: before.images, is_active: before.is_active };
    expect((await page.request.put(`/api/admin/guestbook/${id}`, { headers: { ...headers, "if-match": `"${revision}"` }, data: { ...input, body: "다른 관리자가 먼저 저장", bodyEn: "A translated guestbook note." } })).status()).toBe(200);
    expect(await (await request.get("/en/guestbook")).text()).toContain("A translated guestbook note.");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".events-admin-workspace .events-error")).toContainText("다른 사람이 수정하거나 삭제했습니다.");
    await expect(page.getByLabel("방명록 내용", { exact: true })).toHaveValue("저장 전 변경사항");
    await page.getByRole("button", { name: "최신 내용 불러오기" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "버리기", exact: true }).click();
    await row().getByRole("button", { name: "수정", exact: true }).click();
    await page.getByRole("radio", { name: "비공개", exact: true }).check();
    await page.request.post("/api/admin/logout", { headers, data: {} });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".events-reauth")).toBeVisible();
    await login();
    await expect(page.getByRole("radio", { name: "비공개", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("비공개로 저장했습니다.", { exact: true })).toBeVisible();
    expect(await (await request.get("/ko")).text()).not.toContain(visitorName);
    expect((await request.get(draft.images[0]!)).status()).toBe(404);
    await row().getByRole("button", { name: "삭제", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제", exact: true }).click();
    await expect(row()).toHaveCount(0);
  } finally {
    if (id !== undefined) {
      const entry = await current();
      if (entry) await page.request.delete(`/api/admin/guestbook/${id}`, { headers: { ...headers, "if-match": `"${entry.revision}"` } });
    }
  }
});

test("페이지별 SSR, canonical, 다음 링크와 비공개 제외", async ({ page, request, baseURL }) => {
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  expect((await page.request.post("/api/admin/login", { headers: { origin }, data: { password: ADMIN_PASSWORD } })).status()).toBe(200);
  const ids: number[] = [];
  try {
    for (let index = 0; index < 13; index++) {
      const response = await page.request.post("/api/admin/guestbook", { headers: { origin }, data: { visitDate: "2026-10-08", body: `Pagination test ${index}`, is_active: 1 } });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).data.id);
    }
    const first = await request.get("/ko/guestbook");
    expect(await first.text()).toContain("Pagination test 12");
    await page.goto("/ko/guestbook");
    await expect(page.locator(".guestbook-list article")).toHaveCount(12);
    await page.getByRole("link", { name: "다음", exact: true }).click();
    await expect(page).toHaveURL(/guestbook\?page=2$/);
    await expect(page.locator(".guestbook-list article")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://bitcoincenterseoul.com/ko/guestbook?page=2");
    expect((await request.get("/ko/guestbook?page=-1")).status()).toBe(404);
    expect((await request.get("/ko/guestbook?page=3")).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/ko/guestbook");
  } finally {
    for (const id of ids) await page.request.delete(`/api/admin/guestbook/${id}`, { headers: { origin, "if-match": '"1"' } });
  }
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/ko/guestbook");
});
