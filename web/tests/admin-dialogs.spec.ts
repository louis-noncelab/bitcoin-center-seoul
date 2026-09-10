import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { noticeRecordSchema } from "../src/lib/notices-contract";

test.use({ viewport: { width: 375, height: 812 } });

async function authenticate(page: Page, origin: string) {
  const { ADMIN_PASSWORD } = z.object({ ADMIN_PASSWORD: z.string() }).parse(JSON.parse(await readFile(new URL("../.local/events-review/runtime.json", import.meta.url), "utf8")));
  const response = await page.request.post("/api/admin/login", { headers: { origin }, data: { password: ADMIN_PASSWORD } });
  expect(response.ok()).toBe(true);
}

for (const theme of ["light", "dark"]) {
  test(`작성 취소·분류 변경·로그아웃·관리 이동을 취소하면 초안과 포커스를 보존한다 · ${theme}`, async ({ page, baseURL }) => {
    // Given an authenticated administrator with an unsaved draft.
    await authenticate(page, baseURL ?? "");
    await page.addInitScript((value) => localStorage.setItem("bcs-theme", value), theme);
    await page.emulateMedia({ reducedMotion: theme === "dark" ? "reduce" : "no-preference" });
    let nativeDialogs = 0;
    page.on("dialog", (dialog) => { nativeDialogs += 1; void dialog.dismiss(); });
    await page.goto("/ko/admin");
    await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
    const title = page.getByLabel("제목 · 한국어", { exact: true });
    await title.fill("보존해야 할 초안");
    const dialog = page.getByRole("dialog", { name: "변경사항을 버릴까요?", exact: true });
    const actions = [
      { trigger: page.getByRole("button", { name: "취소", exact: true }), dismissal: "button" },
      { trigger: page.getByRole("button", { name: "하이라이트", exact: true }), dismissal: "escape" },
      { trigger: page.getByRole("button", { name: "로그아웃", exact: true }), dismissal: "outside" },
      { trigger: page.getByRole("link", { name: "공지사항", exact: true }), dismissal: "button" },
    ];
    // When each potentially destructive action is dismissed instead of confirmed.
    for (const action of actions) {
      await action.trigger.click();
      await expect(dialog).toBeVisible();
      const cancel = dialog.getByRole("button", { name: "취소", exact: true });
      const discard = dialog.getByRole("button", { name: "버리기", exact: true });
      await expect(cancel).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(discard).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(cancel).toBeFocused();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      if (bounds) { expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(375); }
      for (const button of [cancel, discard]) expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      if (theme === "dark") await expect(dialog).toHaveCSS("transition-duration", "0s");
      else expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration)).toContain("0.24s");
      if (action.dismissal === "escape") await page.keyboard.press("Escape");
      else if (action.dismissal === "outside") await page.mouse.click(2, 2);
      else await cancel.click();
      // Then the draft, current route, and initiating focus remain intact.
      await expect(dialog).not.toBeVisible();
      await expect(title).toHaveValue("보존해야 할 초안");
      await expect(page).toHaveURL("/ko/admin");
      await expect(action.trigger).toBeFocused();
    }
    expect(nativeDialogs).toBe(0);
    expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(true);
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await dialog.getByRole("button", { name: "버리기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "행사 목록", exact: true })).toBeVisible();
    expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
  });
}

test("공지 초안과 삭제는 취소·Escape·바깥 클릭으로 유지되고 명시적 삭제만 한 번 전송한다", async ({ page, baseURL }) => {
  // Given one private review notice and its authenticated administrator.
  const origin = baseURL ?? "";
  await authenticate(page, origin);
  const input = { slug: `dialog-${randomUUID()}`, title: `[검토] 대화상자 ${randomUUID()}`, description: "대화상자 검토용 비공개 공지", is_active: 0 };
  const created = await page.request.post("/api/admin/notices", { headers: { origin }, data: input });
  expect(created.status()).toBe(201);
  const record = z.object({ data: noticeRecordSchema }).parse(await created.json()).data;
  let removed = false;
  let deletionRequests = 0;
  page.on("request", (request) => { if (request.method() === "DELETE" && request.url().endsWith(`/api/admin/notices/${record.id}`)) deletionRequests += 1; });
  try {
    await page.goto("/ko/admin/notices");
    const row = page.locator(".events-admin-list > li").filter({ hasText: input.title });
    await row.getByRole("button", { name: "수정", exact: true }).click();
    const title = page.getByLabel("제목", { exact: true });
    await title.fill(`${input.title} 초안`);
    // When leaving a notice draft is dismissed, its text is retained.
    await page.getByRole("link", { name: "행사·하이라이트 관리", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
    await expect(title).toHaveValue(`${input.title} 초안`);
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(title).toHaveValue(`${input.title} 초안`);
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "버리기", exact: true }).click();
    const trigger = row.getByRole("button", { name: "삭제", exact: true });
    const dialog = page.getByRole("dialog", { name: "공지 삭제", exact: true });
    // When the same deletion is dismissed by every supported route.
    for (const dismissal of ["button", "escape", "outside"]) {
      await trigger.click();
      await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeFocused();
      if (dismissal === "escape") await page.keyboard.press("Escape");
      else if (dismissal === "outside") await page.mouse.click(2, 2);
      else await dialog.getByRole("button", { name: "취소", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(row).toBeVisible();
      await expect(trigger).toBeFocused();
      expect(deletionRequests).toBe(0);
    }
    // Then only the explicit affirmative action can issue a deletion, even if repeated.
    await trigger.click();
    await dialog.getByRole("button", { name: "삭제", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect(page.getByText("삭제했습니다.", { exact: true })).toBeVisible();
    removed = true;
    await expect(row).toHaveCount(0);
    expect(deletionRequests).toBe(1);
  } finally {
    if (!removed) await page.request.delete(`/api/admin/notices/${record.id}`, { headers: { origin } });
  }
});
