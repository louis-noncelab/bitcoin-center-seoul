import { expect, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

const origin = "https://bitcoincenterseoul.com";
const sections = ["", "/about", "/programs", "/experience", "/journal", "/visit"] as const;
const brands = { ko: "비트코인 센터 서울", en: "Bitcoin Center Seoul" } as const;
const publicRowsSchema = z.object({ data: z.array(z.object({ id: z.number().int().positive(), slug: z.string().default("") })) });

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
  const collectionRows = z.object({ data: z.array(z.object({ id: z.number(), slug: z.string(), kind: z.enum(["book", "artwork", "boardgame"]) })) }).parse(await collection.json()).data;
  const reviewPaths = [...new Set([...((await reviews.text()).matchAll(/href="\/ko(\/reviews\/[^"?#]+)"/g))].map((match) => match[1]))];
  return [
    ...reviewPaths,
    ...collectionRows.map(({ id, slug, kind }) => `${kind === "boardgame" ? "/experience/board-game" : "/collection"}/${slug || id}`),
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

    expect(titles[0]).toBe(brands[locale]);
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
    const identity: unknown = JSON.parse(await script.innerText());
    const email = page.locator('.footer-actions a[href^="mailto:"]');
    const telephone = page.locator('footer a[href^="tel:"]');
    const phoneNumber = await telephone.getAttribute("title");
    await expect(email).toHaveAccessibleName(/hello@noncelab\.com/);
    await expect(telephone).toHaveAccessibleName(/702-1718/);
    expect(phoneNumber).toBe("+82-2-702-1718");
    await expect(telephone).toHaveAttribute("href", `tel:${phoneNumber?.replaceAll("-", "")}`);

    expect(identity).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: brands[locale],
      alternateName: brands[locale === "ko" ? "en" : "ko"],
      url: origin,
      description: await page.locator('meta[name="description"]').getAttribute("content"),
      email: (await email.getAttribute("href"))?.slice("mailto:".length),
      telephone: phoneNumber,
    });
    await expect(page.locator("h1")).toHaveText(brands[locale]);
  });
}

test("the sitemap keeps the same Korean fallback for every locale pair", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const xml = await response.text();
  const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const paths = [...sections, "/news", "/collection", "/goods", "/reviews", "/experience/board-game", "/experience/wallet", "/notices", ...await publicDetailPaths(request)];

  expect(response.status()).toBe(200);
  expect(entries).toHaveLength(paths.length * 2);
  for (const locale of ["ko", "en"]) {
    for (const path of paths) {
      const entry = entries.find((value) => value.includes(`<loc>${origin}/${locale}${path}</loc>`));
      expect(entry).toBeDefined();
      for (const [language, routeLocale] of [["ko", "ko"], ["en", "en"], ["x-default", "ko"]]) {
        expect(entry).toContain(`hreflang="${language}" href="${origin}/${routeLocale}${path}"`);
      }
    }
  }
});
