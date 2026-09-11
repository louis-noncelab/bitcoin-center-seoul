import { expect, test } from "@playwright/test";

function scriptPolicy(policy: string) {
  const directive = policy.split(";").find((value) => value.trim().startsWith("script-src "));
  expect(directive).toBeDefined();
  const nonce = directive?.match(/'nonce-([A-Za-z0-9+/=_-]+)'/)?.[1];
  expect(nonce).toBeDefined();
  expect(directive).toContain("'strict-dynamic'");
  expect(directive).not.toMatch(/'unsafe-(?:inline|eval)'/);
  return nonce;
}

test("HTML permits only Maps and privacy-enhanced YouTube embed endpoints for client navigation", async ({ request }) => {
  for (const path of ["/ko/visit", "/en/visit", "/ko/about", "/ko/admin"]) {
    const response = await request.get(path);
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy.split(";").find((directive) => directive.trim().startsWith("frame-src "))?.trim())
      .toBe("frame-src https://www.google.com/maps/embed https://www.youtube-nocookie.com/embed/");
    scriptPolicy(policy);
  }
});

test("home videos load third-party frames only after play and stop when selection changes", async ({ page }) => {
  const embeds: string[] = [];
  await page.route("https://www.youtube-nocookie.com/embed/**", async (route) => {
    embeds.push(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Player boundary fixture</title>" });
  });
  for (const locale of ["ko", "en"]) {
    await page.goto(`/${locale}`);
    const section = page.locator("#videos");
    const rows = section.locator(".center-videos-item");
    await expect(rows).toHaveCount(3);
    await expect(section.locator("iframe")).toHaveCount(0);
    const before = embeds.length;
    await rows.nth(1).click();
    await expect(rows.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(section.locator("iframe")).toHaveCount(0);
    expect(embeds).toHaveLength(before);
    await section.locator(".center-videos-poster").focus();
    await page.keyboard.press("Enter");
    await expect(section.locator("iframe")).toHaveAttribute("src", /\/oJNES8yse00\?autoplay=1/);
    await expect.poll(() => embeds.length).toBe(before + 1);
    await expect(section.locator("iframe")).toBeFocused();
    await rows.nth(2).click();
    await expect(section.locator("iframe")).toHaveCount(0);
    await expect(section.locator(".center-videos-poster")).toHaveAttribute("href", "https://www.youtube.com/watch?v=lIuNoBffEMo");
  }
});

test("admin pages and endpoints always opt out of search indexing", async ({ request }) => {
  for (const path of ["/ko/admin", "/en/admin", "/ko/admin/notices", "/en/admin/notices"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(await response.text()).toMatch(/<meta name="robots" content="noindex, nofollow"\s*\/?\s*>/);
  }
  for (const path of ["/admin", "/admin/auth", "/ko/admin/missing", "/api/admin/session"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  const publicPage = await request.get("/ko/about");
  expect(publicPage.headers()["x-robots-tag"]).toBeUndefined();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/admin(?:\/|<)/);
});

for (const path of ["/ko/about", "/en/about", "/ko/admin", "/ko/notices"]) {
  test(`HTML has fresh trusted nonces when requesting ${path}`, async ({ request }) => {
    // Given client-supplied headers that must never authorize a script
    const headers = { "x-nonce": "attacker", "content-security-policy": "script-src 'nonce-attacker'" };
    // When the same document is requested twice
    const responses = await Promise.all([request.get(path, { headers }), request.get(path, { headers })]);
    const nonces = [];
    for (const response of responses) {
      // Then every executable script uses the fresh response nonce and HTML is not shared-cacheable
      expect(response.status()).toBe(200);
      const policy = response.headers()["content-security-policy"] ?? "";
      const nonce = scriptPolicy(policy);
      nonces.push(nonce);
      expect(nonce).not.toBe("attacker");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'none'");
      expect(policy).toContain("form-action 'self'");
      expect(response.headers()["cache-control"]).toMatch(/private|no-store/);
      expect(response.headers()["strict-transport-security"]).toBeUndefined();
      expect(policy).not.toContain("upgrade-insecure-requests");
      const scripts = [...(await response.text()).matchAll(/<script\b([^>]*)>/g)];
      expect(scripts.length).toBeGreaterThan(0);
      for (const [, attributes] of scripts) {
        if (attributes?.includes('type="application/ld+json"')) continue;
        expect(attributes).toContain(`nonce="${nonce}"`);
      }
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });
}

test("prefetch headers preserve locale routing and the document policy", async ({ request }) => {
  // Given a locale-prefixed request with link-prefetch headers
  // When the document is requested
  const response = await request.get("/en/about", {
    headers: { "next-router-prefetch": "1", purpose: "prefetch" },
  });
  // Then middleware still supplies the English document and a fresh nonce
  expect(response.status()).toBe(200);
  scriptPolicy(response.headers()["content-security-policy"] ?? "");
  expect(await response.text()).toContain('<html lang="en"');
});

for (const path of ["/api/events", "/robots.txt", "/brand/bcs-horizontal-color.png"]) {
  test(`non-HTML cannot execute scripts when requesting ${path}`, async ({ request }) => {
    // Given a public resource or API outside locale routing
    // When it is requested directly
    const response = await request.get(path);
    // Then its response policy disables active content without changing the route
    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["strict-transport-security"]).toBeUndefined();
  });
}

test("unknown dotted paths retain the HTML security policy", async ({ request }) => {
  // Given a path that is not a static resource or valid localized page
  // When its 404 document is rendered
  const response = await request.get("/ko/missing.page", { maxRedirects: 0 });
  // Then a dot cannot bypass the document policy
  expect(response.status()).toBe(404);
  scriptPolicy(response.headers()["content-security-policy"] ?? "");
});

test("themes and locale navigation hydrate under the production policy", async ({ page }) => {
  // Given a returning visitor with a saved dark theme
  await page.addInitScript(() => localStorage.setItem("bcs-theme", "dark"));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|hydration|refused to/i.test(message.text())) errors.push(message.text());
  });
  // When the visitor opens, navigates, switches language, and changes the theme
  await page.goto("/ko/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('.desktop-navigation a[href="/ko/experience"]').click();
  await expect(page).toHaveURL(/\/ko\/experience$/);
  await page.getByRole("link", { name: "EN · Switch to English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/experience$/);
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  // Then hydration, client navigation, localized SEO, and the saved theme remain usable
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://bitcoincenterseoul.com/en/experience");
  await expect(page.locator('link[hreflang="ko"]')).toHaveAttribute("href", "https://bitcoincenterseoul.com/ko/experience");
  expect(await page.evaluate(() => localStorage.getItem("bcs-theme"))).toBe("light");
  expect(errors).toEqual([]);
});

test("an injected script cannot execute without a trusted nonce", async ({ page }) => {
  // Given an untrusted script inserted into the actual HTML response
  const injection = '<script nonce="attacker">document.documentElement.dataset.untrustedScript = "executed"</script>';
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (event) => {
    document.documentElement.dataset.blockedScript = event.effectiveDirective;
  }));
  await page.route("**/en/about", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<body([^>]*)>/, `<body$1>${injection}`);
    expect(body).toContain(injection);
    await route.fulfill({ response, body });
  });
  // When the browser parses the page with its original CSP header
  await page.goto("/en/about");
  // Then it blocks the injected script while legitimate hydration succeeds
  await expect(page.locator("html")).toHaveAttribute("data-blocked-script", "script-src-elem");
  await expect(page.locator("html")).not.toHaveAttribute("data-untrusted-script", "executed");
  await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toBeEnabled();
});
