import { expect, test } from "@playwright/test";

test("outgoing program content stays inert during a tab transition", async ({ page }) => {
  // Given a program selector with enough transition time to inspect the overlap.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ko/programs");
  await page.addStyleTag({ content: ".selection-panel { --duration-control: 10s; --duration-image: 10s; }" });
  const tabs = page.getByRole("tab");
  const panels = page.locator(".selection-panel");

  // When the visitor selects the next program.
  await tabs.nth(1).click();

  // Then both plates can crossfade, but only the selected program is accessible.
  await expect(panels.nth(0)).toBeVisible();
  await expect(panels.nth(0)).toHaveAttribute("inert", "");
  await expect(panels.nth(0)).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  expect(await panels.nth(0).locator("a").evaluate((link) => {
    link.focus();
    return document.activeElement === link;
  })).toBe(false);
});

test("repeated selection settles immediately when reduced motion changes", async ({ page }) => {
  // Given an active crossfade that is interrupted by keyboard selection.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/programs");
  await page.addStyleTag({ content: ".selection-panel { --duration-control: 10s; --duration-image: 10s; }" });
  const tabs = page.getByRole("tab");
  await tabs.nth(1).click();
  await tabs.nth(1).press("Home");
  await tabs.nth(0).press("End");

  // When the operating system enables reduced motion while content is moving.
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Then the latest selection is the only visible panel, with no residual motion.
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".selection-panel:not([hidden])")).toHaveCount(1);
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(page.locator(".selection-background")).toHaveCSS("transform", "none");
  const active = page.getByRole("tabpanel");
  await expect(active.locator(".center-photo")).toHaveCSS("opacity", "1");
  await expect(active.locator(".center-photo")).toHaveCSS("transform", "none");
  expect(await active.evaluate((panel) => panel.getAnimations({ subtree: true }).length)).toBe(0);
});

test("server-rendered content remains visible without JavaScript", async ({ browser }) => {
  // Given a browser that cannot run the enhancement code.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    // When the home page is loaded directly from the server.
    await page.goto("/ko");

    // Then the photograph and first program are available without hydration.
    await expect(page.locator(".hero-photo .center-photo")).toHaveCSS("opacity", "1");
    await expect(page.locator("#hero-title")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.locator(".program-explorer").getByRole("tabpanel")).toHaveCount(1);
    await expect(page.locator(".program-explorer .selection-panel").first()).toBeVisible();
  } finally {
    await context.close();
  }
});
