import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { seoulDate } from "@/lib/center-status";

test("manual operating state is authenticated, refreshes publicly and expires on the Seoul date", async ({ page, request, baseURL }) => {
  const password = process.env.ADMIN_PASSWORD;
  const databasePath = process.env.BCS_EVENTS_DB;
  if (!password || !databasePath || process.env.BCS_EVENTS_REVIEW !== "true") throw new Error("Use the isolated review runner.");
  const headers = { origin: baseURL ?? "" };
  expect(seoulDate(new Date("2026-12-31T14:59:59Z"))).toBe("2026-12-31");
  expect(seoulDate(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  expect((await request.put("/api/admin/center-status", { headers, data: { status: "open" } })).status()).toBe(401);
  await page.goto("/ko/admin");
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  const controls = page.getByRole("group", { name: "운영 상태 선택" });
  await expect(controls).toBeVisible();
  const saved = (await (await request.get("/api/center-status")).json()).data;
  try {
    expect((await page.request.put("/api/admin/center-status", { headers: { origin: "https://attacker.invalid" }, data: { status: "open" } })).status()).toBe(403);
    for (const invalid of [{ status: "busy" }, { status: 1 }, {}, { status: "open", selected_on: "2099-01-01" }]) {
      expect((await page.request.put("/api/admin/center-status", { headers, data: invalid })).status()).toBe(400);
    }
    await controls.getByRole("button", { name: "운영 중", exact: true }).click();
    await expect(page.getByText("운영 상태를 저장했습니다.", { exact: true })).toBeVisible();
    const response = await request.get("/api/center-status");
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect((await response.json()).data).toEqual({ status: "open" });
    await page.goto("/ko");
    await expect(page.locator(".operating-status")).toHaveText("운영 중");
    expect(await page.locator(".section-frame").evaluateAll((elements) => elements.map((element) => element.id))).toEqual(["programs", "journal", "experience"]);
    await expect(page.locator('#journal h2').first()).toHaveText("현장 스케치");
    for (const [status, label] of [["event", "행사 진행 중"], ["closed", "운영 종료"]] as const) {
      expect((await page.request.put("/api/admin/center-status", { headers, data: { status } })).status()).toBe(200);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.locator(".operating-status")).toHaveText(label);
    }
    await page.locator(".operating-status").click();
    await expect(page).toHaveURL("/ko/visit");
    const db = new Database(databasePath);
    try { db.prepare("UPDATE center_status SET selected_on = '2000-01-01' WHERE id = 1").run(); } finally { db.close(); }
    await page.goto("/en");
    await expect(page.locator(".operating-status")).toHaveText("Visit info");
    expect((await (await request.get("/api/center-status")).json()).data).toEqual({ status: null });
    await page.goto("/ko/admin");
    await expect(controls.getByRole("button", { name: "운영 중", exact: true })).toBeEnabled();
    await page.request.post("/api/admin/logout", { headers, data: {} });
    await controls.getByRole("button", { name: "운영 중", exact: true }).click();
    await expect(page.locator(".events-reauth")).toBeVisible();
    await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.locator(".events-reauth")).toHaveCount(0);
    await controls.getByRole("button", { name: "표시 해제", exact: true }).click();
    await expect(page.getByText("운영 상태를 저장했습니다.", { exact: true })).toBeVisible();
  } finally {
    await page.request.post("/api/admin/login", { headers, data: { password } });
    expect((await page.request.put("/api/admin/center-status", { headers, data: saved })).status()).toBe(200);
  }
});
