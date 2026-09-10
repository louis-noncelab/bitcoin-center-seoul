import { expect, test } from "@playwright/test";

for (const scenario of [
  { language: "en-US,en;q=0.9", country: "KR", locale: "en" },
  { language: "ko-KR,ko;q=0.9", country: "US", locale: "ko" },
  { language: "ja-JP,ja;q=0.9,en;q=0.7", country: "JP", locale: "en" },
  { language: "fr-FR,fr;q=0.9", country: "FR", locale: "ko" },
]) {
  test(`first visit uses ${scenario.language} independently of country`, async ({ request }) => {
    // Given a visitor without a saved language preference
    // When the visitor opens an unprefixed URL
    const response = await request.get("/journal?page=2", { maxRedirects: 0, headers: {
      "Accept-Language": scenario.language, "X-Vercel-IP-Country": scenario.country,
    } });
    // Then browser language determines the locale and the query survives
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`/${scenario.locale}/journal?page=2`);
  });
}

test("explicit URLs win over a saved language and browser settings", async ({ request }) => {
  // Given conflicting browser and saved preferences
  // When the visitor follows an explicit English URL
  const response = await request.get("/en/visit", { maxRedirects: 0, headers: {
    "Accept-Language": "ko-KR", Cookie: "NEXT_LOCALE=ko",
  } });
  // Then the requested locale renders without a redirect
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('lang="en"');
});

test("a manual language choice survives a later unprefixed visit", async ({ browser, baseURL }) => {
  // Given a browser whose preferred language is English
  const context = await browser.newContext({ locale: "en-US", baseURL: baseURL ?? "http://127.0.0.1:3102" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    // When the visitor chooses Korean then returns through the root URL
    await page.locator(".language-control").click();
    await expect(page).toHaveURL(/\/ko$/);
    await page.goto("/");
    // Then the explicit preference remains in use
    await expect(page).toHaveURL(/\/ko$/);
    const cookie = (await context.cookies()).find((item) => item.name === "NEXT_LOCALE");
    expect(cookie?.value).toBe("ko");
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
  } finally {
    await context.close();
  }
});
