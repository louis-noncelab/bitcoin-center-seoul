import { deleteContentFixture } from "./content-cleanup";
import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { centerStatusLabels, seoulDate } from "@/lib/center-status";

test("automatic status and daily exceptions keep authentication, live updates and Seoul expiry", async ({ page, request, baseURL }) => {
  const password = process.env.ADMIN_PASSWORD;
  const databasePath = process.env.BCS_EVENTS_DB;
  if (!password || !databasePath || process.env.BCS_EVENTS_REVIEW !== "true") throw new Error("Use the isolated review runner.");
  const headers = { origin: baseURL ?? "" };
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(seoulDate(new Date("2026-12-31T14:59:59Z"))).toBe("2026-12-31");
  expect(seoulDate(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  expect((await request.put("/api/admin/center-status", { headers, data: { override: "open" } })).status()).toBe(401);
  await page.goto("/ko/admin");
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  const controls = page.getByRole("group", { name: "오늘의 운영 예외" });
  await expect(controls).toBeVisible();
  const saved = (await (await request.get("/api/center-status")).json()).data;
  let eventId: number | undefined;
  try {
    expect((await page.request.put("/api/admin/center-status", { headers: { origin: "https://attacker.invalid" }, data: { override: "open" } })).status()).toBe(403);
    for (const invalid of [{ override: "event" }, { override: 1 }, {}, { status: "open" }, { override: "open", date: "2099-01-01" }]) {
      expect((await page.request.put("/api/admin/center-status", { headers, data: invalid })).status()).toBe(400);
    }
    await controls.getByRole("button", { name: "임시 휴무", exact: true }).click();
    await expect(page.getByText("오늘의 운영 설정을 저장했습니다.", { exact: true })).toBeVisible();
    const response = await request.get("/api/center-status");
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect((await response.json()).data).toMatchObject({ status: "closed", override: "closed", date: seoulDate() });
    const html = await (await request.get("/ko")).text();
    expect(html).toContain('data-status="closed"');
    await page.goto("/ko");
    await expect(page.locator(".operating-status")).toHaveText("운영 종료");
    await expect(page.locator("#home-calendar")).toBeVisible();
    await expect(page.locator("#home-news h2")).toHaveText("비센서 소식");
    const created = await page.request.post("/api/admin/events", { headers, data: { title: "상태 검증용 임시 밋업", titleEn: "Temporary status test meetup", date: seoulDate(), time: "00:00 ~ 24:00", location: "비트코인 센터 서울", locationEn: "Bitcoin Center Seoul", description: "자동 상태 검증 후 삭제", descriptionEn: "Deleted after automatic status verification", image: "", images: [], link: "" } });
    expect(created.status()).toBe(201);
    eventId = (await created.json()).data.id;
    expect((await (await request.get("/api/center-status")).json()).data.status).toBe("closed");
    expect((await page.request.put("/api/admin/center-status", { headers, data: { override: "open" } })).status()).toBe(200);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator(".operating-status")).toHaveText("밋업 중");
    await deleteContentFixture(page.request, `/api/admin/events/${eventId}`, baseURL ?? "");
    eventId = undefined;
    await page.request.put("/api/admin/center-status", { headers, data: { override: null } });
    const automatic = (await (await request.get("/api/center-status")).json()).data;
    expect(["open", "event", "closed"]).toContain(automatic.status);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator(".operating-status")).toHaveAttribute("data-status", automatic.status);
    await page.locator(".operating-status").click();
    await expect(page).toHaveURL("/ko/visit");
    const db = new Database(databasePath);
    try { db.prepare("INSERT INTO center_opening_overrides (date, status) VALUES ('2000-01-01', 'closed') ON CONFLICT(date) DO UPDATE SET status = 'closed'").run(); } finally { db.close(); }
    await page.goto("/en");
    await expect(page.locator(".operating-status")).toHaveAttribute("data-status", automatic.status);
    expect((await (await request.get("/api/center-status")).json()).data.override).toBe(null);
    await page.goto("/ko/admin");
    await expect(controls.getByRole("button", { name: "정상 운영", exact: true })).toBeEnabled();
    await page.request.post("/api/admin/logout", { headers, data: {} });
    await controls.getByRole("button", { name: "정상 운영", exact: true }).click();
    await expect(page.locator(".events-reauth")).toBeVisible();
    await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.locator(".events-reauth")).toHaveCount(0);
    await controls.getByRole("button", { name: "자동", exact: true }).click();
    await expect(page.getByText("오늘의 운영 설정을 저장했습니다.", { exact: true })).toBeVisible();
  } finally {
    await page.request.post("/api/admin/login", { headers, data: { password } });
    if (eventId) await deleteContentFixture(page.request, `/api/admin/events/${eventId}`, baseURL ?? "");
    expect((await page.request.put("/api/admin/center-status", { headers, data: { override: saved.override } })).status()).toBe(200);
    const db = new Database(databasePath);
    try { db.prepare("DELETE FROM center_opening_overrides WHERE date = '2000-01-01'").run(); } finally { db.close(); }
  }
});

test("header refreshes at a server boundary even when the visitor clock is wrong", async ({ page }) => {
  const snapshot = { date: "2026-09-10", override: null, holiday: null, checkedAt: "2026-09-10T04:59:58.000Z", nextChangeAt: "2026-09-10T05:00:00.000Z" };
  let reads = 0;
  await page.route("**/api/center-status", (route) => route.fulfill({ json: { data: { ...snapshot, status: ++reads === 1 ? "open" : "event" } } }));
  await page.clock.install({ time: new Date("2099-01-01T00:00:00Z") });
  await page.goto("/ko");
  await expect(page.locator(".operating-status")).toHaveText(centerStatusLabels.ko.open);
  await page.clock.fastForward(2_500);
  await expect(page.locator(".operating-status")).toHaveText(centerStatusLabels.ko.event);
  expect(reads).toBeGreaterThan(1);
});
