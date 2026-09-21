import { expect, test } from "@playwright/test";
import { inspectSlide } from "./disclosure-motion";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { reviewAdminSchema, reviewKinds, reviewRecordSchema } from "@/lib/reviews-contract";

const endpoint = "/api/admin/reviews";
const headers = { origin: "http://127.0.0.1:3102" };
const created: number[] = [];
let counts = new Map<string, number>();
let total = 0;

test.beforeAll(async ({ request }) => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Run through npm run review -- test.");
  expect((await request.post("/api/admin/login", { headers, data: { password } })).status()).toBe(200);
  for (let index = 0; index < 13; index++) {
    const key = randomUUID();
    const response = await request.post(endpoint, { headers, data: {
      kind: reviewKinds[index % reviewKinds.length], title: `Fixture ${key}`, author: "Test visitor",
      url: `https://example.com/${key}`, summary: "Synthetic visitor story", is_active: 1,
      slug: `fixture-${key}`, description: "A synthetic story used for browser verification.",
    } });
    expect(response.status()).toBe(201);
    created.push(z.object({ data: reviewRecordSchema }).parse(await response.json()).data.id);
  }
  const records = z.object({ data: reviewAdminSchema }).parse(await (await request.get(endpoint)).json()).data.records.filter(record => record.is_active);
  total = records.length;
  counts = new Map(reviewKinds.map(kind => [kind, records.filter(record => record.kind === kind).length]));
});

test.afterAll(async ({ request }) => {
  if (!created.length) return;
  await request.post("/api/admin/login", { headers, data: { password: process.env.ADMIN_PASSWORD } });
  const records = z.object({ data: reviewAdminSchema }).parse(await (await request.get(endpoint)).json()).data.records;
  for (const record of records.filter(record => created.includes(record.id))) {
    expect((await request.delete(`${endpoint}/${record.id}`, { headers: { ...headers, "If-Match": `"${record.revision}"` } })).status()).toBe(200);
  }
});

test("all visitor sources remain browsable with filters, expansion and browser history", async ({ page }) => {
  await page.goto("/ko/reviews");
  await expect(page.locator(".review-card:visible")).toHaveCount(12);
  await page.locator(".review-more summary").click();
  await expect(page.locator(".review-card:visible")).toHaveCount(total);
  const links = await page.locator(".review-card-link").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(new Set(links).size).toBe(total);
  for (const [kind, count] of counts) {
    await page.locator(`.review-filter[href*="type=${kind}"]`).click();
    await expect(page.locator(".review-card")).toHaveCount(count);
    await expect(page.locator(`.review-filter[href*="type=${kind}"]`)).toHaveAttribute("aria-current", "true");
    if (kind === "cafe") await expect(page.getByText("카페 로그인 필요", { exact: true })).toHaveCount(0);
  }
  await page.goBack();
  await expect(page.locator('.review-filter[href*="type=video"]')).toHaveAttribute("aria-current", "true");
  await expect(page.locator(".review-card")).toHaveCount(counts.get("video") ?? 0);
});

test("English metadata, safe originals and invalid filter fallback", async ({ page }) => {
  await page.goto("/en/reviews?type=unknown");
  await expect(page).toHaveTitle(/Visitor stories/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/reviews$/);
  await expect(page.locator(".review-card")).toHaveCount(total);
  for (const link of await page.locator(".review-card-link").all()) {
    const href = await link.getAttribute("href");
    if (href?.startsWith("/en/reviews/")) {
      await expect(link).not.toHaveAttribute("target", "_blank");
      continue;
    }
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("filters and remaining stories work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ...(baseURL ? { baseURL } : {}) });
  const page = await context.newPage();
  await page.goto("/ko/reviews");
  await page.locator(".review-more summary").click();
  await expect(page.locator(".review-card:visible")).toHaveCount(total);
  await page.locator('.review-filter[href*="type=cafe"]').click();
  await expect(page.locator(".review-card:visible")).toHaveCount(counts.get("cafe") ?? 0);
  await context.close();
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale} more stories slide open and closed, with reduced motion fallback`, async ({ page }, info) => {
    await page.setViewportSize({ width: locale === "ko" ? 375 : 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/reviews`);
    const details = page.locator(".review-more");
    const summary = details.locator("summary");
    const content = details.locator(".sliding-details-content");
    await summary.evaluate(element => element.scrollIntoView({ block: "start" }));
    await inspectSlide(page, details, async () => {
      const before = await summary.evaluate(element => element.getBoundingClientRect().top);
      const bounds = await summary.boundingBox();
      if (!bounds) throw new Error("Review summary unavailable");
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      const after = await summary.evaluate(element => element.getBoundingClientRect().top);
      expect(Math.abs(after - before)).toBeLessThan(2);
    }, `${locale}-reviews`, info);
    await expect(details).not.toHaveAttribute("open");
    await expect(content).toHaveAttribute("inert", "");
    await summary.click();
    await summary.click();
    await summary.click();
    await expect(summary).toHaveAttribute("aria-expanded", "true");
    await expect(content).not.toHaveAttribute("inert");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await summary.click();
    await expect(details).not.toHaveAttribute("open");
    expect(await details.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await summary.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
