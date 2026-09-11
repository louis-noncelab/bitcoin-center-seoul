import { expect, test } from "@playwright/test";

for (const locale of ["ko", "en"] as const) {
  test(`${locale} mobile navigation keeps the current destination and client routing`, async ({ page }) => {
    // Given a section route and its mobile navigation.
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/${locale}/about`);
    const menu = page.locator(".navigation-disclosure > button");
    await menu.click();
    const panel = page.locator(".disclosure-panel");
    await expect(panel.locator('[aria-current="page"]')).toHaveAttribute("href", `/${locale}/about`);
    await page.evaluate(() => {
      document.documentElement.dataset.navigationSession = "client";
    });

    // When a different destination is selected.
    await panel.locator(`.navigation-link[href="/${locale}/visit"]`).click();

    // Then it navigates without a document reload and reports the new page.
    await expect(page).toHaveURL(`/${locale}/visit`);
    await expect(page.locator("html")).toHaveAttribute("data-navigation-session", "client");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(panel.locator('[aria-current="page"]')).toHaveAttribute("href", `/${locale}/visit`);
  });
}

test("closing the menu immediately removes interaction while its exit finishes", async ({ page }) => {
  // Given an open menu with a deliberately long exit to inspect its boundary.
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ko/about");
  await page.addStyleTag({ content: ":root { --duration-menu-exit: 10s; }" });
  const menu = page.locator(".navigation-disclosure > button");
  const panel = page.locator(".disclosure-panel");
  await menu.click();
  await panel.locator("a").first().focus();

  // When Escape closes the disclosure.
  await page.keyboard.press("Escape");

  // Then focus returns immediately, the fading panel is inert, and it settles hidden.
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(panel).toHaveAttribute("inert", "");
  expect(await panel.evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
  await panel.locator("a").first().evaluate((element) => element.focus());
  await expect(menu).toBeFocused();
  await panel.evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
  await expect(panel).toBeHidden();
});

for (const dismissal of ["outside pointer", "focus leaving"] as const) {
  test(`the mobile menu closes after ${dismissal}`, async ({ page }) => {
    // Given an open mobile menu.
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/ko/about");
    const menu = page.locator(".navigation-disclosure > button");
    await menu.click();

    // When interaction moves outside the disclosure.
    if (dismissal === "outside pointer") await page.mouse.click(4, 450);
    else await page.locator("#main").focus();

    // Then the menu closes without moving focus back to the trigger.
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".disclosure-panel")).toBeHidden();
    if (dismissal === "focus leaving") await expect(page.locator("#main")).toBeFocused();
  });
}

test("reduced motion immediately settles the disclosure", async ({ page }) => {
  // Given reduced motion and a menu whose normal exit would be long.
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/about");
  await page.addStyleTag({ content: ":root { --duration-menu-exit: 10s; }" });
  const menu = page.locator(".navigation-disclosure > button");
  const panel = page.locator(".disclosure-panel");
  await menu.click();

  // When the menu closes.
  await page.keyboard.press("Escape");

  // Then no movement or delayed interactive surface remains.
  await expect(panel).toBeHidden({ timeout: 1000 });
  expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
  expect(await panel.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("a pending destination shows feedback until navigation commits", async ({ page }) => {
  let releaseResponse: (() => void) | undefined;
  const response = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route(/\/ko\/visit(?:\?|$)/, async (route) => {
    await response;
    await route.continue();
  });
  try {
    await page.goto("/ko/about");
    const destination = page.locator('.desktop-navigation a[href="/ko/visit"]');
    await destination.click({ noWaitAfter: true });

    await expect(destination.locator('[data-pending="true"]')).toBeVisible();
    await expect(page.locator('.desktop-navigation [aria-current="page"]')).toHaveAttribute("href", "/ko/about");
    releaseResponse?.();
    await expect(page).toHaveURL("/ko/visit");
    await expect(destination).toHaveAttribute("aria-current", "page");
    await expect(destination.locator('[data-pending="true"]')).toHaveCount(0);
  } finally {
    releaseResponse?.();
    await page.unrouteAll({ behavior: "wait" });
  }
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale} mobile utilities live below the navigation with filled selection`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${locale}/about?source=menu#space-tour`);
    const header = page.locator(".site-header");
    await expect(header.locator(".operating-status:visible")).toHaveCount(0);
    await expect(header.locator(".language-control:visible")).toHaveCount(0);
    await expect(header.locator(".theme-toggle:visible")).toHaveCount(0);
    const trigger = header.locator(".navigation-trigger");
    await trigger.click();
    const panel = header.locator(".disclosure-panel");
    const footer = panel.locator(".navigation-utilities");
    await expect(footer.locator(".operating-status")).toBeVisible();
    const current = panel.locator('.navigation-link[aria-current="page"]');
    expect(await current.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    expect(await current.locator(".navigation-feedback").evaluate((element) => getComputedStyle(element, "::after").display)).toBe("none");
    const listBox = await panel.locator("ul").boundingBox();
    const footerBox = await footer.boundingBox();
    if (!listBox || !footerBox) throw new Error("Menu layout unavailable");
    expect(footerBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height);
    const theme = footer.locator(".theme-toggle");
    const before = await theme.getAttribute("aria-pressed");
    await theme.click();
    await expect(theme).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const other = locale === "ko" ? "en" : "ko";
    await footer.locator(".language-control").click();
    await expect(page).toHaveURL(new RegExp(`/${other}/about\\?source=menu#space-tour$`));
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(panel).toHaveAttribute("inert", "");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(header.locator(".operating-status:visible")).toHaveCount(1);
    await expect(header.locator(".language-control:visible")).toHaveCount(1);
    await expect(header.locator(".theme-toggle:visible")).toHaveCount(1);
    await expect(trigger).toBeHidden();
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale} home photos remain navigable with reduced motion and lead to visit terms`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const hero = page.locator(".hero-photo");
    const photos = hero.locator(".photo-slide");
    const previous = hero.locator(".photo-controls button").first();
    await previous.click();
    await expect(photos.last()).toHaveAttribute("data-active", "true");
    await previous.press("ArrowRight");
    await expect(photos.first()).toHaveAttribute("data-active", "true");
    expect(await photos.first().evaluate(element => getComputedStyle(element).animationName)).toBe("none");
    const order = await page.locator("main > .container > section").evaluateAll(elements => elements.map(element => element.id));
    if (order.includes("reviews")) expect(order.indexOf("reviews")).toBeLessThan(order.indexOf("journal"));
    await page.locator(".hero-visit-link").click();
    await expect(page).toHaveURL(`/${locale}/visit`);
    await expect(page.locator(".visit-first dd")).toHaveCount(3);
    await expect(page.locator(".visit-first")).toContainText("3,000 sats");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}
