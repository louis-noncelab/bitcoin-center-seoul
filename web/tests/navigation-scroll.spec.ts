import { randomUUID } from "node:crypto";
import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { deleteContentFixture } from "./content-cleanup";
import { reviewRuntime } from "./helpers/review-runtime";

let admin: APIRequestContext;
let origin: string;
const highlightIds: number[] = [];

test.beforeAll(async ({ baseURL }) => {
  const runtime = await reviewRuntime();
  expect(baseURL).toBe(runtime.APP_ORIGIN);
  origin = runtime.APP_ORIGIN;
  admin = await request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).status()).toBe(200);
  const prefix = randomUUID();
  for (let index = 0; index < 25; index++) {
    const response = await admin.post("/api/admin/highlights", { data: {
      slug: `navigation-scroll-${prefix}-${index}`, tags: [], title: `[검토] 저널 탐색 ${index}`, titleEn: `[Review] Journal navigation ${index}`,
      meta: "", metaEn: "", category: "행사", categoryEn: "Event", date: "2026-01-01", startDate: "", endDate: "",
      host: "", hostEn: "", description: "합성 저널 페이지 기록", descriptionEn: "Synthetic journal page record",
      image: "", images: [], link: "", icon: "calendar", sort_order: 0, is_active: 1,
    } });
    expect(response.status()).toBe(201);
    highlightIds.push(z.object({ data: z.object({ id: z.number().int().positive() }) }).parse(await response.json()).data.id);
  }
});

test.afterAll(async () => {
  if (!admin) return;
  try {
    for (const id of highlightIds) await deleteContentFixture(admin, `/api/admin/highlights/${id}`, origin);
  } finally {
    await admin.dispose();
  }
});

async function scrollFrames(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        function sample() {
          samples.push(window.scrollY);
          if (samples.length === 12) resolve(samples);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
  );
}

for (const locale of ["ko", "en"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`${locale} navigation keeps the page top with motion ${reducedMotion}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.emulateMedia({ reducedMotion });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);

      for (const section of ["programs", "experience", "collection", "goods", "news", "visit"]) {
        await page.locator(`.desktop-navigation a[href="/${locale}/${section}"]`).click();
        await expect(page).toHaveURL(`/${locale}/${section}`);
        await expect(page.locator("main h1")).toBeVisible();
        expect(await scrollFrames(page), `Unexpected scroll after ${section} navigation`).toEqual(Array(12).fill(0));
      }

      await page.locator(`.desktop-navigation a[href="/${locale}/visit"]`).click();
      expect(await scrollFrames(page), "Clicking the current page must keep the top").toEqual(Array(12).fill(0));

      await page.locator(".site-wordmark").click();
      await expect(page).toHaveURL(`/${locale}`);
      expect(await scrollFrames(page), "The wordmark must return to the page top").toEqual(Array(12).fill(0));

      await page.locator(".language-control:visible").click();
      await expect(page).toHaveURL(`/${locale === "ko" ? "en" : "ko"}`);
      expect(await scrollFrames(page), "Changing locale must keep the page top").toEqual(Array(12).fill(0));
    });
  }
}

test("history restores the previous reading position", async ({ page }) => {
  await page.goto("/ko/about");
  await page.evaluate(() => document.fonts.ready);
  const nextPage = page.locator('.footer-navigation a[href="/ko/visit"]');
  await nextPage.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const previousScroll = await page.evaluate(() => window.scrollY);
  expect(previousScroll).toBeGreaterThan(300);

  await nextPage.click();
  await expect(page).toHaveURL("/ko/visit");
  await page.goBack();
  await expect(page).toHaveURL("/ko/about");
  await expect.poll(() => page.evaluate(
    (previous) => window.scrollY - Math.min(previous, document.documentElement.scrollHeight - innerHeight),
    previousScroll,
  )).toBe(0);
});

test("the keyboard skip link keeps its intentional hash and focus", async ({ page }) => {
  await page.goto("/ko/about");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/ko/about#main");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page.locator("#main")).toBeInViewport();
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`floating back-to-top appears after scrolling and hides again with ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/ko");
    const top = page.locator(".back-to-top");
    await expect(top).toBeHidden();
    await expect(top).toHaveAttribute("tabindex", "-1");
    await page.mouse.wheel(0, 120);
    await expect(top).toBeVisible();
    await expect(top).toHaveAttribute("aria-hidden", "false");
    await expect(top).toHaveCSS("position", "fixed");
    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(top).toBeHidden();
    await expect(page.locator("#main")).toBeFocused();
    await expect(page.locator(".footer-collaboration")).toHaveAttribute("href", "mailto:hello@noncelab.com");
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale} journal can jump directly to a distant page without pre-scrolling`, async ({ page }) => {
    // Given a reader at the pagination controls
    await page.goto(`/${locale}/journal`);
    const input = page.locator("#journal-page");
    const lastPage = Number(await input.getAttribute("max"));
    expect(lastPage).toBeGreaterThan(2);
    await input.fill(String(lastPage));
    const form = page.locator(".journal-page-jump");
    await form.scrollIntoViewIfNeeded();
    // When the native form navigates directly to the last page
    const frames = await form.evaluate((element) => new Promise<{ y: number; url: string }[]>((resolve) => {
      const samples = [{ y: scrollY, url: location.href }];
      const start = performance.now();
      function sample(now: number) {
        samples.push({ y: scrollY, url: location.href });
        if (now - start > 650) resolve(samples);
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      if (element instanceof HTMLFormElement) element.requestSubmit();
    }));
    // Then the new page, selection and field agree, while the outgoing page stayed still
    await expect(page).toHaveURL(new RegExp(`/${locale}/journal\\?page=${lastPage}$`));
    await expect(input).toHaveValue(String(lastPage));
    await expect(page.locator('.journal-pagination [aria-current="page"]')).toHaveText(String(lastPage));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const first = frames[0];
    expect(first?.y).toBeGreaterThan(0);
    if (first) expect(frames.filter(({ y, url }) => url === first.url && y !== first.y)).toEqual([]);
  });
}

test("journal jump rejects out-of-range and fractional pages before navigation", async ({ page }) => {
  // Given the current journal page and its native page bounds
  await page.goto("/ko/journal");
  const input = page.locator("#journal-page");
  const lastPage = Number(await input.getAttribute("max"));
  for (const value of ["0", String(lastPage + 1), "1.5", ""]) {
    // When a reader submits an invalid page number
    await input.fill(value);
    await page.locator('.journal-page-jump button[type="submit"]').click();
    // Then native validation keeps the reader on the current page
    expect(await input.evaluate((element) => element instanceof HTMLInputElement && element.validity.valid)).toBe(false);
    await expect(page).toHaveURL(/\/ko\/journal$/);
  }
});

test("journal history returns to the card's reading position", async ({ page }) => {
  await page.goto("/ko/journal?page=2");
  const link = page.locator(".highlight-card-link").last();
  await link.scrollIntoViewIfNeeded();
  const previousScroll = await page.evaluate(() => scrollY);
  expect(previousScroll).toBeGreaterThan(300);
  const target = await link.getAttribute("href");
  expect(target).toBeTruthy();

  await link.click();
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await page.goBack();

  await expect(page).toHaveURL("/ko/journal?page=2");
  await expect.poll(() => page.evaluate(
    (previous) => scrollY - Math.min(previous, document.documentElement.scrollHeight - innerHeight),
    previousScroll,
  )).toBe(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`journal pagination and cards leave the current reading position intact until routing with ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/ko/journal");
    for (const selector of ['.journal-pagination a[rel="next"]', '.highlight-card-link']) {
      const link = page.locator(selector).last();
      await link.scrollIntoViewIfNeeded();
      const target = await link.getAttribute("href");
      expect(target).toBeTruthy();
      const frames = await link.evaluate((element) => new Promise<{ y: number; url: string }[]>((resolve) => {
        const samples: { y: number; url: string }[] = [{ y: scrollY, url: location.href }];
        const start = performance.now();
        function sample(now: number) {
          samples.push({ y: scrollY, url: location.href });
          if (now - start > 650) resolve(samples);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        if (element instanceof HTMLAnchorElement) element.click();
      }));
      await expect(page).toHaveURL(new RegExp(`${target?.replace("?", "\\?")}$`));
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const first = frames[0];
      expect(first?.y).toBeGreaterThan(0);
      if (first) {
        expect(frames.filter(({ y, url }) => url === first.url && y !== first.y), "The old page must stay still while the next route loads").toEqual([]);
      }
    }
    await expect(page.locator(".event-detail")).toHaveCSS("transform", "none");
    await expect(page.locator(".detail-heading")).toHaveCSS("transform", "none");
  });
}
