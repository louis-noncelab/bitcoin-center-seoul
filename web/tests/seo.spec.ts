import { expect, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

const origin = "https://bitcoincenterseoul.com";
const sections = ["", "/about", "/programs", "/experience", "/journal", "/visit"] as const;
const brands = { ko: "비트코인 센터 서울", en: "Bitcoin Center Seoul" } as const;
const publicRowsSchema = z.object({ data: z.array(z.object({ id: z.number().int().positive(), slug: z.string().default("") })) });

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
});

async function publicDetailPaths(request: APIRequestContext) {
  const [events, highlights, notices, collection, reviews] = await Promise.all([
    request.get("/api/events"),
    request.get("/api/highlights"),
    request.get("/api/notices"),
    request.get("/api/collection"),
    request.get("/ko/reviews"),
  ]);
  expect(events.status()).toBe(200);
  expect(highlights.status()).toBe(200);
  expect(notices.status()).toBe(200);
  expect(collection.status()).toBe(200);
  expect(reviews.status()).toBe(200);
  const eventRows = publicRowsSchema.parse(await events.json()).data;
  const highlightRows = publicRowsSchema.parse(await highlights.json()).data;
  const noticeRows = publicRowsSchema.parse(await notices.json()).data;
  const collectionRows = z.object({ data: z.array(z.object({ id: z.number(), slug: z.string(), kind: z.enum(["book", "artwork", "boardgame", "goods"]) })) }).parse(await collection.json()).data;
  const reviewPaths = [...new Set([...((await reviews.text()).matchAll(/href="\/ko(\/reviews\/[^"?#]+)"/g))].map((match) => match[1]))];
  return [
    ...reviewPaths,
    ...collectionRows.map(({ id, slug, kind }) => `${kind === "boardgame" ? "/experience/board-game" : kind === "goods" ? "/goods" : "/collection"}/${slug || id}`),
    ...noticeRows.map(({ slug }) => `/notices/${slug}`),
    ...eventRows.map(({ id, slug }) => `/programs/${slug || id}`),
    ...highlightRows.map(({ id, slug }) => `/journal/${slug || id}`),
  ];
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale} public titles identify distinct pages in the page language`, async ({ request }) => {
    const responses = await Promise.all(sections.map((path) => request.get(`/${locale}${path}`)));
    const titles = await Promise.all(responses.map(async (response) => {
      expect(response.status()).toBe(200);
      return (await response.text()).match(/<title>([^<]+)<\/title>/)?.[1];
    }));

    expect(titles[0]).toMatch(new RegExp(`^${brands[locale]} \\| `));
    expect(new Set(titles).size).toBe(sections.length);
    for (const title of titles) {
      expect(title).toContain(brands[locale]);
      expect(title?.split(brands[locale])).toHaveLength(2);
    }
  });

  test(`${locale} rendered metadata preserves locale URLs and preview exclusion`, async ({ page }) => {
    for (const path of sections) {
      await page.goto(`/${locale}${path}`);

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/${locale}${path}`);
      for (const [language, routeLocale] of [["ko", "ko"], ["en", "en"], ["x-default", "ko"]]) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${language}"]`)).toHaveAttribute("href", `${origin}/${routeLocale}${path}`);
      }
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", brands[locale]);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", await page.title());
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", await page.title());
    }
  });

  test(`${locale} home organization data agrees with the visible identity`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const script = page.locator('script[type="application/ld+json"]');
    await expect(script).toHaveCount(1);
    const data = JSON.parse(await script.innerText());
    const email = page.locator('.footer-actions a[href^="mailto:"]');
    const telephone = page.locator('.footer-actions a[href^="tel:"]');
    const phoneNumber = await telephone.getAttribute("title");
    await expect(email).toHaveAccessibleName(/hello@noncelab\.com/);
    await expect(telephone).toHaveAccessibleName(/702-1718/);
    expect(phoneNumber).toBe("+82-2-702-1718");
    await expect(telephone).toHaveAttribute("href", `tel:${phoneNumber?.replaceAll("-", "")}`);

    expect(data["@context"]).toBe("https://schema.org");
    const identity = data["@graph"].find((node: { "@type": string }) => node["@type"] === "LocalBusiness");
    expect(identity).toMatchObject({
      "@type": "LocalBusiness",
      "@id": `${origin}/#organization`,
      name: brands[locale],
      alternateName: brands[locale === "ko" ? "en" : "ko"],
      url: origin,
      logo: `${origin}/brand/bcs-horizontal-color.png`,
      description: await page.locator('meta[name="description"]').getAttribute("content"),
      email: (await email.getAttribute("href"))?.slice("mailto:".length),
      telephone: phoneNumber,
      address: { "@type": "PostalAddress", addressCountry: "KR", postalCode: "04056" },
      openingHoursSpecification: { opens: "12:00", closes: "20:00" },
    });
    expect(identity.sameAs).toEqual(await page.locator('.footer-actions a[href^="https:"]').evaluateAll((links) => links.map((link) => link.getAttribute("href"))));
    expect(data["@graph"]).toContainEqual(expect.objectContaining({ "@type": "WebSite", "@id": `${origin}/#website`, publisher: { "@id": `${origin}/#organization` } }));
    await expect(page.locator("h1")).toHaveText(brands[locale]);
    await page.goto(`/${locale}/visit`);
    const visitData = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(visitData).toEqual(data);
  });

  test(`${locale} discovery links are readable, aligned and usable on mobile`, async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/about", "/programs", "/experience", "/journal", "/visit", "/experience/wallet"]) {
      await page.goto(`/${locale}${path}`);
      const links = page.locator(".explore-links a");
      await expect(links).toHaveCount(3);
      const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
      expect(new Set(hrefs).size).toBe(3);
      for (const href of hrefs) {
        expect(href).toMatch(new RegExp(`^/${locale}/`));
        expect(href).not.toBe(`/${locale}${path}`);
        expect((await request.get(href!)).status()).toBe(200);
      }
    }
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
        const cards = await page.locator(".explore-links a").evaluateAll((nodes) => nodes.map((node) => {
          const { width, height, y } = node.getBoundingClientRect();
          return { width, height, y };
        }));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const card of cards) expect(card.height).toBeGreaterThanOrEqual(44);
        if (width >= 768) {
          expect(new Set(cards.map((card) => Math.round(card.width))).size).toBe(1);
          expect(new Set(cards.map((card) => Math.round(card.height))).size).toBe(1);
          expect(new Set(cards.map((card) => Math.round(card.y))).size).toBe(1);
        }
      }
    }
    const first = page.locator(".explore-links a").first();
    const destination = await first.getAttribute("href");
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
  });
}

test("the sitemap keeps the same Korean fallback for every locale pair", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const xml = await response.text();
  const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const productResponse = await request.get("/api/products");
  const shopPaths = productResponse.status() === 200
    ? ["/shop", ...z.object({ data: z.array(z.object({ slug: z.string().min(1) })) }).parse(await productResponse.json()).data.map((product) => `/shop/${product.slug}`)]
    : [];
  const details = await publicDetailPaths(request);
  const paths = [...sections, "/news", "/collection", "/goods", "/reviews", "/experience/board-game", "/experience/wallet", "/notices", "/business-info", "/privacy-policy", "/terms-of-service", "/refund-policy", ...shopPaths, ...details];

  expect(response.status()).toBe(200);
  const locations = entries.map((entry) => entry.match(/<loc>([^<]+)<\/loc>/)![1]!);
  expect(new Set(locations).size).toBe(entries.length);
  for (const location of locations) {
    expect(locations).toContain(location.replace(/\/(ko|en)(\/|$)/, (_, locale, suffix) => `/${locale === "ko" ? "en" : "ko"}${suffix}`));
  }
  expect(xml).not.toMatch(/<loc>[^<]*\/(?:cart|checkout|orders|payments)(?:\/|<)/);
  for (const locale of ["ko", "en"]) {
    for (const path of paths) {
      const entry = entries.find((value) => value.includes(`<loc>${origin}/${locale}${path}</loc>`));
      expect(entry).toBeDefined();
      if (details.includes(path)) {
        const modified = entry?.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
        expect(modified).toBeDefined();
        expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(Number.isFinite(Date.parse(modified!))).toBe(true);
        expect(Date.parse(modified!)).toBeLessThanOrEqual(Date.now());
      }
      for (const [language, routeLocale] of [["ko", "ko"], ["en", "en"], ["x-default", "ko"]]) {
        expect(entry).toContain(`hreflang="${language}" href="${origin}/${routeLocale}${path}"`);
      }
    }
  }
});
