import { deleteContentFixture } from "./content-cleanup";
import { randomUUID } from "node:crypto";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";
import { eventRecordSchema, highlightRecordSchema } from "../src/lib/events-contract";
import { reviewRuntime } from "./helpers/review-runtime";

const responseSchema = <T extends z.ZodType>(schema: T) => z.object({ data: schema });
const seoulToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const futureEventDate = (() => {
  const date = new Date(`${seoulToday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
})();

test.describe.serial("events-only public pages", () => {
  let admin: APIRequestContext;
  let eventId: number;
  let highlightId: number;
  const eventSlug = `public-event-${randomUUID()}`;
  const highlightSlug = `public-record-${randomUUID()}`;
  const eventTitleKo = `[검토] 공개 행사 ${randomUUID()}`;
  const eventTitleEn = `[Review] Public event ${randomUUID()}`;
  const highlightTitleKo = `[검토] 공개 기록 ${randomUUID()}`;
  const highlightTitleEn = `[Review] Public record ${randomUUID()}`;

  test.beforeAll(async ({ baseURL }) => {
    const runtime = await reviewRuntime();
    const reviewOrigin = baseURL ?? runtime.APP_ORIGIN;
    expect(reviewOrigin).toBe(runtime.APP_ORIGIN);
    admin = await request.newContext({ baseURL: reviewOrigin, extraHTTPHeaders: { origin: reviewOrigin } });
    expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).ok()).toBeTruthy();

    const event = responseSchema(eventRecordSchema).parse(await (await admin.post("/api/admin/events", { data: {
      slug: `${eventSlug}-old`, title: eventTitleKo, titleEn: eventTitleEn, date: futureEventDate, time: "19:00", venueType: "center", location: "비트코인 센터 서울", locationEn: "Bitcoin Center Seoul", description: "외부 안내 링크가 있는 공개 행사입니다.", descriptionEn: "A public event with an external information link.", image: "", link: "https://example.com/event", images: [],
    } })).json()).data;
    const { id: createdEventId, revision: eventRevision, ...eventInput } = event;
    eventId = createdEventId;
    expect((await admin.put(`/api/admin/events/${eventId}`, { headers: { "If-Match": `"${eventRevision}"` }, data: { ...eventInput, slug: eventSlug } })).ok()).toBeTruthy();

    const highlight = responseSchema(highlightRecordSchema).parse(await (await admin.post("/api/admin/highlights", { data: {
      slug: `${highlightSlug}-old`, title: highlightTitleKo, titleEn: highlightTitleEn, meta: "공개 검토 기록", metaEn: "Public review record", category: "밋업", categoryEn: "Meetup", date: "2099.09.09", startDate: "", endDate: "", host: "비트코인 센터 서울", hostEn: "Bitcoin Center Seoul", description: "실제 공개 데이터 경로를 검토하는 기록입니다.", descriptionEn: "A record used to review the real public data path.", image: "", link: "https://example.com/highlight", icon: "", sort_order: 0, is_active: 1, images: [],
    } })).json()).data;
    const { id: createdHighlightId, revision: highlightRevision, ...highlightInput } = highlight;
    highlightId = createdHighlightId;
    expect((await admin.put(`/api/admin/highlights/${highlightId}`, { headers: { "If-Match": `"${highlightRevision}"` }, data: { ...highlightInput, slug: highlightSlug } })).ok()).toBeTruthy();
  });

  test.afterAll(async ({ baseURL }) => {
    if (!admin) return;
    try {
      try {
        if (eventId) await deleteContentFixture(admin, `/api/admin/events/${eventId}`, baseURL ?? (await reviewRuntime()).APP_ORIGIN);
      } finally {
        if (highlightId) await deleteContentFixture(admin, `/api/admin/highlights/${highlightId}`, baseURL ?? (await reviewRuntime()).APP_ORIGIN);
      }
    } finally {
      await admin.dispose();
    }
  });

  test("shows a real event and its safe external link without commerce destinations", async ({ page }) => {
    // Given a published event created through the real admin API
    // When a Korean visitor opens the program list and detail
    await page.goto("/ko/programs");
    const eventLink = page.locator(`.event-card[href="/ko/programs/${eventSlug}"]`);

    // Then the record is linked by its canonical slug and commerce is absent
    await expect(eventLink).toHaveCount(1);
    await expect(eventLink).toHaveAttribute("href", `/ko/programs/${eventSlug}`);
    await expect(page.locator('a[href*="/cart"], a[href*="/checkout"], a[href*="/account"], a[href*="/booking"], a[href*="/payments"]')).toHaveCount(0);
    await eventLink.click();
    await expect(page.getByRole("heading", { name: eventTitleKo, exact: true })).toBeVisible();
    const booking = page.locator(".event-detail a.event-booking-link");
    await expect(booking).toHaveAccessibleName(`${eventTitleKo} 참여하기 외부 사이트 (새 창)`);
    await expect(booking).toHaveAttribute("href", "https://example.com/event");
    await expect(booking).toHaveAttribute("target", "_blank");
    await expect(booking).toHaveAttribute("rel", /^(?=.*\bnoopener\b)(?=.*\bnoreferrer\b).+$/);
  });

  test("shows only the active highlight and preserves its detail route across locales", async ({ page }) => {
    // Given an active bilingual highlight
    // When an English visitor opens the journal and its detail page
    await page.goto("/en/journal");
    const highlightLink = page.getByRole("link").filter({ hasText: highlightTitleEn });
    await expect(highlightLink).toHaveAttribute("href", `/en/journal/${highlightSlug}`);
    await highlightLink.click();

    // Then the published content, original link, and locale-preserving control are present
    await expect(page.getByRole("heading", { name: highlightTitleEn, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Read the original/ })).toHaveAttribute("href", "https://example.com/highlight");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("link", { name: /한국어로 전환/ }).click();
    await expect(page).toHaveURL(new RegExp(`/ko/journal/${highlightSlug}$`));
    await expect(page.getByRole("heading", { name: highlightTitleKo, exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/ko/journal/${highlightSlug}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`/en/journal/${highlightSlug}$`));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`/ko/journal/${highlightSlug}$`));
  });

  test("permanently redirects numeric and previous paths to each localized canonical slug", async ({ request: publicRequest }) => {
    // Given event and highlight slugs changed once through the admin API
    const records = [
      { section: "programs", id: eventId, slug: eventSlug },
      { section: "journal", id: highlightId, slug: highlightSlug },
    ];
    // When visitors request each original numeric path or previous slug
    for (const record of records) {
      for (const locale of ["ko", "en"]) {
        for (const previous of [record.id, `${record.slug}-old`]) {
          const response = await publicRequest.get(`/${locale}/${record.section}/${previous}`, { maxRedirects: 0 });
          // Then the permanent redirect points directly to the current localized path
          expect(response.status()).toBe(308);
          expect(response.headers().location).toBe(`/${locale}/${record.section}/${record.slug}`);
        }
      }
    }
  });

  test("publishes canonical slugs in the sitemap without numeric or old alias duplicates", async ({ request: publicRequest }) => {
    // Given published records with both numeric and previous-slug aliases
    // When a crawler requests the sitemap
    const response = await publicRequest.get("/sitemap.xml");
    const sitemap = await response.text();
    // Then only the localized canonical URLs are advertised
    expect(response.ok()).toBeTruthy();
    for (const locale of ["ko", "en"]) {
      expect(sitemap).toContain(`/${locale}/programs/${eventSlug}</loc>`);
      expect(sitemap).toContain(`/${locale}/journal/${highlightSlug}</loc>`);
      expect(sitemap).not.toContain(`/${locale}/programs/${eventId}</loc>`);
      expect(sitemap).not.toContain(`/${locale}/journal/${highlightId}</loc>`);
    }
    expect(sitemap).not.toContain(`${eventSlug}-old`);
    expect(sitemap).not.toContain(`${highlightSlug}-old`);
  });

  test("keeps the numeric URL canonical when an event slug is cleared", async ({ page, request: publicRequest }) => {
    // Given an event whose custom slug is cleared through the admin API
    const { id, revision, ...input } = responseSchema(eventRecordSchema).parse(await (await admin.get(`/api/admin/events/${eventId}`)).json()).data;
    expect((await admin.put(`/api/admin/events/${id}`, { headers: { "If-Match": `"${revision}"` }, data: { ...input, slug: "" } })).ok()).toBeTruthy();
    // When a visitor opens its numeric URL
    const response = await page.goto(`/ko/programs/${id}`);
    // Then that URL renders normally and the previous slug redirects back to it
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/ko/programs/${id}$`));
    const alias = await publicRequest.get(`/ko/programs/${eventSlug}`, { maxRedirects: 0 });
    expect(alias.status()).toBe(308);
    expect(alias.headers().location).toBe(`/ko/programs/${id}`);
  });

  test("hides inactive highlights through numeric, canonical, and previous slug paths", async ({ request: publicRequest }) => {
    // Given a formerly published highlight that the admin makes inactive
    const { id, revision, ...input } = responseSchema(highlightRecordSchema).parse(await (await admin.get(`/api/admin/highlights/${highlightId}`)).json()).data;
    expect((await admin.put(`/api/admin/highlights/${id}`, { headers: { "If-Match": `"${revision}"` }, data: { ...input, is_active: 0 } })).ok()).toBeTruthy();
    // When visitors request any known path
    for (const path of [id, highlightSlug, `${highlightSlug}-old`]) {
      const response = await publicRequest.get(`/ko/journal/${path}`, { maxRedirects: 0 });
      // Then no route exposes the inactive content or redirects to it
      expect(response.status()).toBe(404);
      expect(await response.text()).not.toContain(highlightTitleKo);
    }
  });

  test("paginates the review journal with distinct records, localized links and canonical metadata", async ({ page, request: publicRequest }) => {
    // Given more than one page of scoped active highlights in the isolated review dataset
    const paginationIds: number[] = [];
    try {
      for (let index = 0; index < 13; index += 1) {
        const record = responseSchema(highlightRecordSchema).parse(await (await admin.post("/api/admin/highlights", { data: {
          slug: `pagination-${randomUUID()}`, title: `[검토] 페이지 ${index}`, titleEn: `[Review] Page ${index}`,
          meta: "", metaEn: "", category: "행사", categoryEn: "Event", date: "2099.09.09", startDate: "", endDate: "",
          host: "", hostEn: "", description: "페이지 검토", descriptionEn: "Pagination review", image: "", link: "",
          icon: "calendar", sort_order: 0, is_active: 1, images: [],
        } })).json()).data;
        paginationIds.push(record.id);
      }
    const records = responseSchema(z.array(highlightRecordSchema)).parse(await (await publicRequest.get("/api/highlights")).json()).data;
    expect(records.length).toBeGreaterThan(12);
    const lastPage = Math.ceil(records.length / 12);
    // When a visitor opens the first page and follows its next link
    await page.goto("/ko/journal");
    const cards = page.locator(".highlight-card-link");
    await expect(cards).toHaveCount(12);
    const firstLinks = await cards.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    await page.getByRole("navigation", { name: "현장 스케치 페이지" }).getByRole("link", { name: "다음", exact: true }).click();
    // Then page two has separate records, its own metadata and query-preserving language navigation
    await expect(page).toHaveURL(/\/ko\/journal\?page=2$/);
    await expect(cards).toHaveCount(Math.min(12, records.length - 12));
    const nextLinks = await cards.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(nextLinks.some((link) => firstLinks.includes(link))).toBe(false);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ko\/journal\?page=2$/);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", /\/en\/journal\?page=2$/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/ko\/journal\?page=2$/);
    await page.getByRole("button", { name: "메뉴", exact: true }).click();
    await page.getByRole("link", { name: /Switch to English/ }).click();
    await expect(page).toHaveURL(/\/en\/journal\?page=2$/);
    await expect(page.getByRole("navigation", { name: "Highlights pagination" }).locator('[aria-current="page"]')).toHaveText("2");
    await page.goto(`/en/journal?page=${lastPage}`);
    await expect(cards).toHaveCount(records.length - (lastPage - 1) * 12);
    await expect(page.getByRole("navigation", { name: "Highlights pagination" }).getByRole("link", { name: "Next", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      for (const id of paginationIds) await deleteContentFixture(admin, `/api/admin/highlights/${id}`, (await reviewRuntime()).APP_ORIGIN);
    }
  });

  test("normalizes invalid journal pages and clamps large pages before querying records", async ({ request: publicRequest }) => {
    // Given the active review record count determines the last valid page
    const records = responseSchema(z.array(highlightRecordSchema)).parse(await (await publicRequest.get("/api/highlights")).json()).data;
    const lastPage = Math.max(1, Math.ceil(records.length / 12));
    // When malformed or out-of-range page queries arrive
    for (const query of ["page=0", "page=-1", "page=1.5", "page=abc", "page=", "page=2&page=3", "page=1"]) {
      const response = await publicRequest.get(`/ko/journal?${query}`, { maxRedirects: 0 });
      // Then malformed queries and explicit page one normalize to the base URL
      expect(response.status()).toBe(307);
      expect(response.headers().location).toBe("/ko/journal");
    }
    const response = await publicRequest.get("/en/journal?page=999999999999999999999999999999", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`/en/journal${lastPage === 1 ? "" : `?page=${lastPage}`}`);
  });

});
test("visit map replaces the address button and fits narrow and wide columns", async ({ page }) => {
  for (const locale of ["ko", "en"]) {
    await page.goto(`/${locale}/visit`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".visit-address .button")).toHaveCount(0);
    await expect(page.locator(".visit-map iframe")).toHaveAttribute("src", new RegExp(`^https://www\\.google\\.com/maps/embed\\?.*!1s${locale}`));
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await page.locator(".visit-map").boundingBox();
      const address = await page.locator(".visit-address dd").boundingBox();
      expect(bounds?.width).toBeGreaterThan(0);
      expect(bounds?.width).toBeCloseTo(address?.width ?? 0, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
