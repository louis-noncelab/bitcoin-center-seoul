import { expect, test } from "@playwright/test";

for (const locale of ["ko", "en"] as const) {
  for (const width of [375, 1440]) test(`${locale} collaboration dialog at ${width}px keeps entries on error and resets after receipt`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    let attempts = 0;
    await page.route("**/api/collaboration", async (route) => {
      attempts += 1;
      const body: unknown = route.request().postDataJSON();
      expect(body).toMatchObject({ locale, type: "community", name: "Test Proposer", email: "proposal@example.invalid", consent: true });
      await route.fulfill({ status: attempts === 1 ? 500 : 201, contentType: "application/json", body: attempts === 1
        ? JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "다시 시도해 주세요. / Try again." } })
        : JSON.stringify({ data: { received: true } }) });
    });
    await page.goto(`/${locale}`);
    const trigger = page.locator(".footer-collaboration");
    const dialog = page.locator(".collaboration-dialog");
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("#collaboration-name")).toBeFocused();
    await expect(dialog.getByRole("button", { name: locale === "ko" ? "제안 보내기" : "Send proposal" })).toBeInViewport();
    for (let index = 0; index < 6; index += 1) await page.keyboard.press("Tab");
    const privacy = dialog.locator(".collaboration-consent a");
    await expect(privacy).toBeFocused();
    const privacyUnobscured = await privacy.evaluate((link) => {
      const scrollRegion = document.querySelector(".collaboration-fields-scroll");
      const actions = document.querySelector(".collaboration-dialog .dialog-actions");
      if (!scrollRegion || !actions) return false;
      const linkBox = link.getBoundingClientRect();
      const scrollBox = scrollRegion.getBoundingClientRect();
      return linkBox.top >= scrollBox.top && linkBox.bottom <= scrollBox.bottom && scrollBox.bottom < actions.getBoundingClientRect().top;
    });
    expect(privacyUnobscured).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.locator("#collaboration-name").fill("Test Proposer");
    await page.locator("#collaboration-email").fill("proposal@example.invalid");
    await page.locator("#collaboration-type").selectOption("community");
    await page.locator("#collaboration-message").fill("A community Bitcoin workshop proposal.");
    await expect(dialog.locator('a[href$="/privacy-policy"]')).toBeVisible();
    await dialog.getByRole("button", { name: locale === "ko" ? "제안 보내기" : "Send proposal" }).click();
    expect(attempts).toBe(0);
    await dialog.locator('input[name="consent"]').check();
    await dialog.getByRole("button", { name: locale === "ko" ? "제안 보내기" : "Send proposal" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(page.locator("#collaboration-name")).toHaveValue("Test Proposer");
    await dialog.getByRole("button", { name: locale === "ko" ? "제안 보내기" : "Send proposal" }).click();
    await expect(dialog.getByRole("status")).toBeVisible();
    expect(attempts).toBe(2);
    await expect(dialog.getByRole("button", { name: locale === "ko" ? "닫기" : "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await trigger.click();
    await expect(page.locator("#collaboration-name")).toHaveValue("");
  });
}
