import { expect, test } from "@playwright/test";

test("reselecting an admin list keeps its rows while editor navigation still protects drafts", async ({ page, baseURL }) => {
  expect(baseURL).toBe("http://127.0.0.1:3102");
  expect((await page.request.post("/api/admin/login", { headers: { origin: baseURL ?? "" }, data: { password: process.env.ADMIN_PASSWORD } })).status()).toBe(200);
  await page.goto("/ko/admin");
  const list = page.locator(".events-admin-list");
  await expect(list).toBeVisible();
  const originalList = await list.elementHandle();
  let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/admin/events") requests++; });
  const events = page.getByRole("navigation", { name: "콘텐츠 관리" }).getByRole("button", { name: "행사", exact: true });
  await events.click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(await originalList?.evaluate(element => element.isConnected)).toBe(true);
  expect(requests).toBe(0);

  await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
  await page.getByLabel("제목 · 한국어", { exact: true }).fill("저장하지 않은 초안");
  await events.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByLabel("제목 · 한국어", { exact: true })).toHaveValue("저장하지 않은 초안");
  await events.click();
  await dialog.getByRole("button", { name: "버리기", exact: true }).click();
  await expect(list).toBeVisible();
  await expect(page.locator(".events-form")).toHaveCount(0);
});
