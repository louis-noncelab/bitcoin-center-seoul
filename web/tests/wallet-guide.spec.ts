import { expect, test } from "@playwright/test";

const models = ["SeedSigner", "Jade Plus", "Krux", "Keystone 3 Pro", "Coldcard Q", "Coconut Vault"];

for (const [index, model] of models.entries()) {
  test(`guides ${model} through all five phases and supports back and restart`, async ({ page }) => {
    // Given: a local English guide and an installed learning wallet.
    await page.goto("/en/experience/wallet");
    await page.getByRole("button", { name: "Let's Get Started", exact: true }).click();
    const os = index % 2 === 0 ? "Android" : "iPhone";
    await page.getByRole("radio", { name: os, exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("link", { name: "Open app store" })).toHaveAttribute("href", index % 2 === 0 ? /play\.google\.com/ : /apps\.apple\.com/);
    await expect(page.getByRole("img", { name: "App download QR code" })).toBeVisible();
    await page.getByRole("button", { name: "I've completed the download" }).click();
    await page.getByRole("radio", { name: model, exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    // When: the visitor follows the selected model, including a backwards step.
    await expect(page.locator(".wallet-guide").getByRole("heading", { level: 2 })).toContainText("1 / 5");
    await expect(page.locator(".wallet-instructions li").first()).toContainText(model === "Jade Plus" ? "Jade" : model === "Keystone 3 Pro" ? "Keystone" : model === "Coldcard Q" ? "Coldcard" : model);
    await expect(page.getByRole("note")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(page.locator(".wallet-guide").getByRole("heading", { level: 2 })).toContainText("1 / 5");
    for (let phase = 2; phase <= 5; phase++) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.locator(".wallet-guide").getByRole("heading", { level: 2 })).toContainText(`${phase} / 5`);
      await expect(page.locator("#wallet-step-title")).toBeFocused();
      if (phase === 3) {
        await expect(page.getByRole("img", { name: "Learning network receiving address QR code" })).toBeVisible();
        await expect(page.locator("code")).toHaveText("bcrt1qxdyjf6h5d6qxap4n2dap97q4j5ps6ua8jkxz0z");
      }
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Congratulations!" })).toBeVisible();
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    // Then: restart clears selections and the guide remains local.
    await page.getByRole("button", { name: "Let's Get Started", exact: true }).click();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await expect(page.locator('a[href*="bitcoincenterseoul.com/walletExperence"]')).toHaveCount(0);
  });
}

test("serves Korean guide metadata and redirects published legacy URLs locally", async ({ page }) => {
  // Given: the originally published unprefixed guide URL.
  await page.goto("/walletExperence");
  // When: the locale-aware alias resolves.
  await expect(page).toHaveURL(/\/ko\/experience\/wallet$/);
  // Then: Korean content and canonical preview metadata are present.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("하드월렛 체험하기");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ko\/experience\/wallet$/);
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", /\/en\/experience\/wallet$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/en/walletExperence");
  await expect(page).toHaveURL(/\/en\/experience\/wallet$/);
});

test("experience links open the local guide in both locales", async ({ page }) => {
  for (const locale of ["ko", "en"]) {
    // Given: the public experience page.
    await page.goto(`/${locale}/experience`);
    // When: the visitor opens the guide action.
    await page.locator(`main a[href="/${locale}/experience/wallet"]`).click();
    // Then: the route retains the visitor's locale.
    await expect(page).toHaveURL(new RegExp(`/${locale}/experience/wallet$`));
  }
});

test("supports keyboard selection and retry on a small dark reduced-motion screen", async ({ page }) => {
  // Given: a phone-size dark screen with reduced motion.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("bcs-theme", "dark"));
  await page.goto("/ko/experience/wallet");
  await page.getByRole("button", { name: "시작해볼까요?" }).click();
  await page.getByRole("radio", { name: "안드로이드", exact: true }).focus();
  // When: native radio keyboard controls select the OS and the visitor requests help.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "아이폰", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: "다운로드를 완료했습니다." }).click();
  await page.getByRole("radio", { name: "SeedSigner", exact: true }).check();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  for (let phase = 0; phase < 5; phase++) await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: "아니오", exact: true }).click();
  // Then: help is accessible, back returns to the result question, and no horizontal scroll is required.
  await expect(page.locator("#wallet-step-title")).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.locator(".wallet-panel").evaluate((panel) => panel.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.getByRole("button", { name: "네", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
