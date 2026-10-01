import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

async function login(page: Page, baseURL: string | undefined) {
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  const response = await page.request.post(origin + "/api/admin/login", { headers: { origin }, data: { password: ADMIN_PASSWORD } });
  expect(response.status()).toBe(200);
  await page.goto(origin + "/ko/admin/settings");
  await expect(page.getByRole("heading", { name: "결제 받기" })).toBeVisible();
  return origin;
}

test("address setup stays with the payment choice and preserves another draft", async ({ page, baseURL }) => {
  const origin = await login(page, baseURL);
  const initialResponse = await page.request.get(origin + "/api/admin/settings");
  expect(initialResponse.ok()).toBe(true);
  const initial = (await initialResponse.json()).data;
  const address = "ux-" + randomUUID().replaceAll("-", "").slice(0, 12) + "@example.com";
  const email = page.getByLabel("주문 알림 이메일");
  let created = "";
  try {
    await email.fill("ux-draft@example.com");
    await page.getByRole("radio", { name: /라이트닝 주소/ }).check();
    await expect(page.getByLabel("결제금을 받을 주소")).toBeVisible();
    await page.getByLabel("구분할 이름").fill("UX 검토용");
    await page.getByLabel("라이트닝 주소", { exact: true }).fill(address);
    await page.getByRole("button", { name: "주소 추가하고 선택" }).click();
    await expect(page.getByText("주소를 등록하고 선택했습니다.", { exact: false })).toBeVisible();
    const selected = page.getByLabel("결제금을 받을 주소");
    created = await selected.inputValue();
    expect(created).toBeTruthy();
    await expect(email).toHaveValue("ux-draft@example.com");
    await expect(page.getByRole("radio", { name: /라이트닝 주소/ })).toBeChecked();

    await page.getByRole("navigation", { name: "관리자 메뉴" }).getByRole("link", { name: "운영 현황" }).click();
    await expect(page.getByRole("dialog", { name: "변경사항을 버릴까요?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
    await expect(email).toHaveValue("ux-draft@example.com");

    await page.getByRole("button", { name: "설정 저장" }).click();
    await expect(page.getByText("결제와 운영 설정을 저장했습니다.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("결제금을 받을 주소")).toHaveValue(created);
    await expect(page.getByText("현재 수신")).toBeVisible();
    const unsavedLabel = page.getByLabel("구분할 이름");
    await unsavedLabel.fill("등록 전 초안");
    await page.getByRole("navigation", { name: "관리자 메뉴" }).getByRole("link", { name: "운영 현황" }).click();
    await expect(page.getByRole("dialog", { name: "변경사항을 버릴까요?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
    await expect(unsavedLabel).toHaveValue("등록 전 초안");
    const blocked = await page.request.delete(origin + "/api/admin/lightning-addresses/" + created, { headers: { origin }, data: {} });
    expect(blocked.status()).toBe(409);
  } finally {
    const current = (await (await page.request.get(origin + "/api/admin/settings")).json()).data;
    const restored = await page.request.patch(origin + "/api/admin/settings", { headers: { origin }, data: {
      expectedUpdatedAt: current.updatedAt,
      paymentProvider: initial.paymentProvider,
      btcPriceSource: initial.btcPriceSource,
      fixedKrwPerBtc: initial.fixedKrwPerBtc,
      productDisplayUnit: initial.productDisplayUnit,
      guestPurchaseAllowed: initial.guestPurchaseAllowed,
      maintenanceMode: initial.maintenanceMode,
      lightningAddressId: initial.lightningAddressId,
      notificationChannel: initial.notificationChannel,
      notificationWebhook: "",
      notificationEmail: initial.notificationEmail,
    } });
    expect(restored.ok()).toBe(true);
    if (created) {
      const deleted = await page.request.delete(origin + "/api/admin/lightning-addresses/" + created, { headers: { origin }, data: {} });
      expect(deleted.ok()).toBe(true);
    }
  }
});

test("a stale settings form cannot overwrite another administrator's save", async ({ browser, baseURL }) => {
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  const first = await browser.newContext();
  const second = await browser.newContext();
  const headers = { origin };
  try {
    for (const context of [first, second]) {
      expect((await context.request.post(origin + "/api/admin/login", { headers, data: { password: ADMIN_PASSWORD } })).status()).toBe(200);
    }
    const page = await second.newPage();
    await page.goto(origin + "/ko/admin/settings");
    await expect(page.getByRole("heading", { name: "결제 받기" })).toBeVisible();
    const initial = (await (await first.request.get(origin + "/api/admin/settings")).json()).data;
    const data = {
      expectedUpdatedAt: initial.updatedAt,
      paymentProvider: initial.paymentProvider,
      btcPriceSource: initial.btcPriceSource,
      fixedKrwPerBtc: initial.fixedKrwPerBtc,
      productDisplayUnit: initial.productDisplayUnit,
      guestPurchaseAllowed: initial.guestPurchaseAllowed,
      maintenanceMode: initial.maintenanceMode,
      lightningAddressId: initial.lightningAddressId,
      notificationChannel: initial.notificationChannel,
      notificationWebhook: "",
      notificationEmail: initial.notificationEmail,
    };
    let created = "";
    try {
      const email = page.getByLabel("주문 알림 이메일");
      await email.fill("second-admin@example.com");
      await page.getByRole("radio", { name: /라이트닝 주소/ }).check();
      const updated = await first.request.patch(origin + "/api/admin/settings", { headers, data: { ...data, notificationEmail: "first-admin@example.com" } });
      expect(updated.status()).toBe(200);
      await page.getByLabel("구분할 이름").fill("동시 저장 검토");
      await page.getByLabel("라이트닝 주소", { exact: true }).fill("stale-" + randomUUID().slice(0, 12) + "@example.com");
      await page.getByRole("button", { name: "주소 추가하고 선택" }).click();
      await expect(page.getByText("주소를 등록하고 선택했습니다.", { exact: false })).toBeVisible();
      created = await page.getByLabel("결제금을 받을 주소").inputValue();
      expect(created).toBeTruthy();
      const response = page.waitForResponse((item) => item.url() === origin + "/api/admin/settings" && item.request().method() === "PATCH");
      await page.getByRole("button", { name: "설정 저장" }).click();
      const rejected = await response;
      expect(rejected.status()).toBe(409);
      await expect(page.locator(".events-error[role='alert']")).toContainText("다른 관리자가 설정을 먼저 저장했습니다.");
      await expect(email).toHaveValue("second-admin@example.com");
      const latest = (await (await first.request.get(origin + "/api/admin/settings")).json()).data;
      expect(latest.notificationEmail).toBe("first-admin@example.com");
    } finally {
      const latest = (await (await first.request.get(origin + "/api/admin/settings")).json()).data;
      const restored = await first.request.patch(origin + "/api/admin/settings", { headers, data: { ...data, expectedUpdatedAt: latest.updatedAt } });
      expect(restored.status()).toBe(200);
      if (created) expect((await first.request.delete(origin + "/api/admin/lightning-addresses/" + created, { headers, data: {} })).status()).toBe(200);
    }
  } finally {
    await first.close();
    await second.close();
  }
});

test("deleting an address while another admin selects it returns a clear conflict", async ({ page, baseURL }) => {
  const origin = await login(page, baseURL);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !/_test(?:$|[/?#])/.test(databaseUrl)) throw new Error("Use an isolated test database");
  const initial = (await (await page.request.get(origin + "/api/admin/settings")).json()).data;
  const created = await page.request.post(origin + "/api/admin/lightning-addresses", {
    headers: { origin },
    data: { label: "경합 검토", address: "race-" + randomUUID().slice(0, 12) + "@example.com" },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.id as string;
  const blocker = new Client({ connectionString: databaseUrl });
  const observer = new Client({ connectionString: databaseUrl });
  await blocker.connect();
  await observer.connect();
  async function waitForBlockedQuery(table: string) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = await observer.query(
        "SELECT 1 FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE $1 LIMIT 1",
        ["%" + table + "%"],
      );
      if (result.rowCount) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Expected concurrent write to wait on " + table);
  }
  try {
    await blocker.query("BEGIN");
    await blocker.query('SELECT id FROM "LightningAddress" WHERE id = $1 FOR UPDATE', [id]);
    const deleting = page.request.delete(origin + "/api/admin/lightning-addresses/" + id, { headers: { origin }, data: {} });
    await waitForBlockedQuery("LightningAddress");
    const saving = page.request.patch(origin + "/api/admin/settings", { headers: { origin }, data: {
      expectedUpdatedAt: initial.updatedAt,
      paymentProvider: "LNURL", btcPriceSource: initial.btcPriceSource,
      fixedKrwPerBtc: initial.fixedKrwPerBtc, productDisplayUnit: initial.productDisplayUnit,
      guestPurchaseAllowed: initial.guestPurchaseAllowed, maintenanceMode: initial.maintenanceMode,
      lightningAddressId: id, notificationChannel: initial.notificationChannel,
      notificationWebhook: "", notificationEmail: initial.notificationEmail,
    } });
    await waitForBlockedQuery("SiteSetting");
    await blocker.query("COMMIT");
    const [deleted, saved] = await Promise.all([deleting, saving]);
    expect(deleted.status()).toBe(200);
    expect(saved.status()).toBe(400);
    const current = (await (await page.request.get(origin + "/api/admin/settings")).json()).data;
    expect(current.lightningAddressId).not.toBe(id);
  } finally {
    await blocker.query("ROLLBACK").catch(() => {});
    await blocker.end();
    await observer.end();
    const current = (await (await page.request.get(origin + "/api/admin/settings")).json()).data;
    await page.request.patch(origin + "/api/admin/settings", { headers: { origin }, data: {
      expectedUpdatedAt: current.updatedAt,
      paymentProvider: initial.paymentProvider, btcPriceSource: initial.btcPriceSource,
      fixedKrwPerBtc: initial.fixedKrwPerBtc, productDisplayUnit: initial.productDisplayUnit,
      guestPurchaseAllowed: initial.guestPurchaseAllowed, maintenanceMode: initial.maintenanceMode,
      lightningAddressId: initial.lightningAddressId, notificationChannel: initial.notificationChannel,
      notificationWebhook: "", notificationEmail: initial.notificationEmail,
    } });
    await page.request.delete(origin + "/api/admin/lightning-addresses/" + id, { headers: { origin }, data: {} });
  }
});

test("mobile menu opens below its trigger and keeps controls aligned", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, baseURL);
  const trigger = page.getByRole("button", { name: "메뉴 열기" });
  await trigger.click();
  const navigation = page.getByRole("navigation", { name: "관리자 메뉴" });
  await expect(navigation).toBeVisible();
  const triggerBox = await page.getByRole("button", { name: "메뉴 닫기" }).boundingBox();
  const menuBox = await page.locator("#admin-sidebar").boundingBox();
  expect(triggerBox && menuBox && menuBox.y >= triggerBox.y + triggerBox.height).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  const visibleLink = navigation.getByRole("link", { name: "운영 현황" });
  await expect(visibleLink).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();

  await page.getByRole("radio", { name: /라이트닝 주소/ }).check();
  const heights = await page.locator(".admin-settings .form-control input, .admin-settings .menu-select-control").evaluateAll((nodes) =>
    nodes.filter((node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden")
      .map((node) => Math.round(node.getBoundingClientRect().height)));
  expect(heights.length).toBeGreaterThan(2);
  expect(new Set(heights)).toEqual(new Set([48]));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
