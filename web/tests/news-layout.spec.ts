import { randomInt, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { deleteContentFixture } from "./content-cleanup";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

const newsPaths = ["/reviews", "/news", "/notices", "/journal", "/news?view=media", "/guestbook"];
const fixturePaths: string[] = [];
let admin: APIRequestContext | undefined;
let fixtureOrigin: string;

test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ baseURL }) => {
  if (process.env.NEWS_LAYOUT_READ_ONLY === "true") return;
  fixtureOrigin = reviewOrigin(baseURL);
  const runtime = await reviewRuntime();
  expect(runtime.APP_ORIGIN).toBe(fixtureOrigin);
  admin = await request.newContext({ baseURL: fixtureOrigin, extraHTTPHeaders: { origin: fixtureOrigin } });
  expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).status()).toBe(200);
  const upload = await admin.post("/api/admin/images", { multipart: { file: {
    name: "news-layout.webp", mimeType: "image/webp", buffer: await readFile(new URL("../public/images/space-tour/library.webp", import.meta.url)),
  } } });
  expect(upload.status()).toBe(200);
  const image = z.object({ data: z.object({ images: z.array(z.string()).min(1) }) }).parse(await upload.json()).data.images[0]!;
  const number = randomInt(1_000_000, 2_000_000);
  for (let index = 0; index < 3; index++) {
    const response = await admin.post("/api/admin/guestbook", { data: {
      entryNumber: number + index, volume: index + 1, is_active: 1,
      visitorName: index === 2 ? "긴 이름과 방문 날짜가 없어도 정렬되어야 하는 방문자" : index === 1 ? "" : "방문자",
      visitDate: index === 2 ? "" : "2026-10-15",
      body: index === 2 ? "비트코인 이야기를 나누며 즐겁게 보냈어요.\n".repeat(80) + "<script>literal text</script>" : "센터에서 책을 읽고 이야기를 나눴어요.",
      bodyEn: index === 1 ? "A lovely place to meet and learn about Bitcoin. ".repeat(50) : "",
      images: index === 1 ? [image] : [],
    } });
    expect(response.status()).toBe(201);
    fixturePaths.push(`/api/admin/guestbook/${z.object({ data: z.object({ id: z.number() }) }).parse(await response.json()).data.id}`);
  }
  for (const time of ["13:00~16:00", "19:00 ~ 21:00", "18:30~21:00"]) {
    const response = await admin.post("/api/admin/events", { data: {
      slug: `layout-${randomUUID()}`, title: "비트코인 모임", titleEn: "Bitcoin meetup", date: "2099-10-16", time,
      venueType: "center", location: "", locationEn: "", description: "시간 줄바꿈 확인", descriptionEn: "Check event time wrapping",
      image: time.includes(" ") ? image : "", images: time.includes(" ") ? [image] : [], link: "",
    } });
    expect(response.status()).toBe(201);
    fixturePaths.push(`/api/admin/events/${z.object({ data: z.object({ id: z.number() }) }).parse(await response.json()).data.id}`);
  }
});

test.afterAll(async () => {
  if (!admin) return;
  try { for (const path of fixturePaths) await deleteContentFixture(admin, path, fixtureOrigin); }
  finally { await admin.dispose(); }
});

async function loaded(page: Page, path: string) {
  expect((await page.goto(path))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
});

for (const locale of ["ko", "en"]) {
  test(`${locale} news lists share the visitor stories frame at every screen size`, async ({ page }) => {
    test.setTimeout(90_000);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      let reference: { x: number; width: number } | undefined;
      for (const path of newsPaths) {
        await loaded(page, `/${locale}${path}`);
        const navigation = page.locator(".news-navigation");
        const box = (await navigation.boundingBox())!;
        reference ??= box;
        expect(Math.abs(box.x - reference.x), path).toBeLessThan(1);
        expect(Math.abs(box.width - reference.width), path).toBeLessThan(1);
        await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
        const content = page.locator(".news-page-section, .notices-list, .guestbook-list").first();
        if (await content.count()) {
          const contentBox = (await content.boundingBox())!;
          expect(Math.abs(contentBox.x - box.x), path).toBeLessThan(1);
          expect(Math.abs(contentBox.width - box.width), path).toBeLessThan(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  });

  test(`${locale} guestbook cards stay aligned while a complete note is read`, async ({ page }) => {
    await loaded(page, `/${locale}/guestbook`);
    const cards = page.locator(".guestbook-list article");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    expect(await cards.count()).toBeLessThanOrEqual(12);
    for (const [width, columns] of [[1440, 3], [768, 2], [375, 1]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      const boxes = await cards.evaluateAll((nodes) => nodes.map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }));
      const row = boxes.filter((box) => Math.abs(box.y - boxes[0]!.y) < 1);
      expect(row).toHaveLength(columns);
      for (const box of row) {
        expect(Math.abs(box.width - row[0]!.width)).toBeLessThan(1);
        expect(Math.abs(box.height - row[0]!.height)).toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const first = cards.first();
    const fullText = await first.locator(".guestbook-body").textContent();
    const before = await first.boundingBox();
    const summary = first.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const reader = page.getByRole("dialog");
    await expect(reader).toBeVisible();
    await expect(reader.locator(".guestbook-body")).toHaveText(fullText!);
    await expect(first.locator(".guestbook-excerpt")).toBeVisible();
    expect(await first.boundingBox()).toEqual(before);
    await page.keyboard.press("Escape");
    await expect(reader).not.toBeVisible();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Space");
    await expect(reader).toBeVisible();
    await reader.getByRole("button").click();
    await expect(reader).not.toBeVisible();
    const photoButton = cards.locator(".guestbook-thumbnail").first();
    await expect(photoButton).toBeVisible();
    const photo = photoButton.locator("img");
    await expect(photo).toHaveJSProperty("complete", true);
    expect(await photo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const source = await photo.getAttribute("src");
    await photoButton.focus();
    await page.keyboard.press("Enter");
    await expect(reader).toBeVisible();
    await expect(reader.locator(".guestbook-photos img").first()).toHaveAttribute("src", source!);
    await page.keyboard.press("Escape");
    await expect(reader).not.toBeVisible();
    await expect(photoButton).toBeFocused();
  });
}

test("existing guestbook fragment links open the right note and photos on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loaded(page, "/ko/guestbook");
  const cards = page.locator(".guestbook-list article");
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  const photoCard = cards.filter({ has: page.locator(".guestbook-photo-count") }).first();
  const target = await photoCard.count() ? photoCard : cards.first();
  const id = await target.getAttribute("id");
  const body = await target.locator(".guestbook-body").textContent();
  await page.goto("about:blank");
  await loaded(page, `/ko/guestbook#${id}`);
  const reader = page.getByRole("dialog");
  await expect(reader).toBeVisible();
  await expect(reader.locator(".guestbook-body")).toHaveText(body!);
  const bounds = (await reader.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(812);
  for (const image of await reader.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty("complete", true);
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const otherId = await cards.evaluateAll((nodes, current) => nodes.find((node) => node.id !== current)!.id, id);
  await page.evaluate((hash) => { location.hash = hash; }, otherId);
  await expect(page.locator(`#${otherId} dialog`)).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
});

test("a guestbook note can still be read without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: baseURL! });
  const page = await context.newPage();
  try {
    await page.route("**/*", (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
    await page.goto("/ko/guestbook");
    const first = page.locator(".guestbook-list article").first();
    await expect(first).toHaveCount(1);
    await expect(first.locator(".guestbook-body")).not.toBeVisible();
    await first.locator("summary").click();
    await expect(first.locator(".guestbook-body")).toBeVisible();
  } finally { await context.close(); }
});

test("a note opened before scripts load transfers to the reader and closes cleanly", async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await page.route("**/*.js*", async (route) => { await scriptsReady; await route.fallback(); });
  await page.goto("/ko/guestbook", { waitUntil: "commit" });
  const first = page.locator(".guestbook-list article").first();
  try {
    await expect(first).toBeVisible();
    await first.locator("summary").click();
    await expect(first.locator("details")).toHaveAttribute("open", "");
  } finally { releaseScripts(); }
  const reader = page.getByRole("dialog");
  await expect(reader).toBeVisible();
  await expect(first.locator("details")).not.toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(reader).not.toBeVisible();
  await expect(first.locator(".guestbook-body")).not.toBeVisible();
});

test("event time ranges keep every digit on one line", async ({ page }) => {
  await loaded(page, "/ko/programs");
  expect(await page.locator(".event-card-time").count()).toBeGreaterThan(0);
  for (const width of [320, 375, 768, 1024, 1120, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const times = await page.locator(".event-card-time").evaluateAll((nodes) => nodes.filter((node) => /^\d{1,2}:\d{2}\s*[~–-]\s*\d{1,2}:\d{2}$/.test(node.textContent!)).map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return { time: node.textContent, lines: new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.y))).size };
    }));
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) expect(time.lines, `${width}px: ${time.time}`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
