import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";
import { z } from "zod";
import { deleteContentFixture } from "./content-cleanup";
import { reviewRuntime } from "./helpers/review-runtime";

const staticPhotos = [
  { path: "/ko", selector: ".home-space-collage img" },
  { path: "/ko/about", selector: ".about-detail .media-frame img" },
  { path: "/ko/experience", selector: ".experience-gallery > :first-child img" },
  { path: "/ko/experience", selector: ".experience-object img" },
  { path: "/ko/about", selector: ".selection-panel:not([hidden]) img" },
  { path: "/ko", selector: ".home-space-collage img:first-child" },
];
const publicRowsSchema = z.object({
  data: z.array(z.object({ id: z.number().int().positive(), images: z.array(z.string()) })),
});
const createdSchema = z.object({ data: z.object({ id: z.number().int().positive() }) });
const uploadedSchema = z.object({ data: z.object({ images: z.array(z.string()).length(1) }) });
const fixtureDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() + 7 * 86_400_000));

test.describe("public image crops", () => {
  let admin: APIRequestContext;
  let origin: string;
  let eventId: number | undefined;
  let highlightId: number | undefined;

  test.beforeAll(async ({ baseURL }) => {
    const runtime = await reviewRuntime();
    expect(baseURL).toBe(runtime.APP_ORIGIN);
    origin = runtime.APP_ORIGIN;
    admin = await request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
    expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).status()).toBe(200);
    const image = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#f38b28" } }).webp().toBuffer();
    const upload = async (name: string) => {
      const response = await admin.post("/api/admin/images", { multipart: { files: { name, mimeType: "image/webp", buffer: image } } });
      expect(response.status()).toBe(200);
      return uploadedSchema.parse(await response.json()).data.images[0];
    };
    const eventImage = await upload("image-quality-event.webp");
    const highlightImage = await upload("image-quality-highlight.webp");
    const slug = `image-quality-${randomUUID()}`;
    const event = await admin.post("/api/admin/events", { data: {
      slug, title: "[검토] 이미지 품질 행사", titleEn: "[Review] Image quality event", date: fixtureDate, time: "12:00",
      venueType: "center", location: "", locationEn: "", description: "합성 검토 이미지", descriptionEn: "Synthetic review image",
      image: eventImage, images: [eventImage], link: "", tags: [],
    } });
    expect(event.status()).toBe(201);
    eventId = createdSchema.parse(await event.json()).data.id;
    const highlight = await admin.post("/api/admin/highlights", { data: {
      slug: `${slug}-highlight`, title: "[검토] 이미지 품질 기록", titleEn: "[Review] Image quality journal", date: fixtureDate,
      description: "합성 검토 이미지", descriptionEn: "Synthetic review image", image: highlightImage, images: [highlightImage], is_active: 1, tags: [],
      meta: "", metaEn: "", category: "행사", categoryEn: "Event", startDate: "", endDate: "", host: "", hostEn: "",
      link: "", icon: "calendar", sort_order: 0,
    } });
    expect(highlight.status()).toBe(201);
    highlightId = createdSchema.parse(await highlight.json()).data.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    try {
      if (highlightId) await deleteContentFixture(admin, `/api/admin/highlights/${highlightId}`, origin);
      if (eventId) await deleteContentFixture(admin, `/api/admin/events/${eventId}`, origin);
    } finally {
      await admin.dispose();
    }
  });

for (const dpr of [1, 2, 3]) {
  test.describe(`image quality at DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });

    test("cover crops have enough decoded pixels", async ({ page, request }) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const [eventResponse, highlightResponse] = await Promise.all([
        request.get("/api/events"),
        request.get("/api/highlights"),
      ]);
      expect(eventResponse.status()).toBe(200);
      expect(highlightResponse.status()).toBe(200);
      const event = publicRowsSchema.parse(await eventResponse.json()).data.sort((left, right) => left.id - right.id).find(({ images }) => images.length > 0);
      const highlight = publicRowsSchema.parse(await highlightResponse.json()).data.sort((left, right) => left.id - right.id).find(({ images }) => images.length > 0);
      expect(event).toBeDefined();
      expect(highlight).toBeDefined();
      const photos = [
        ...staticPhotos,
        { path: "/ko/programs", selector: ".event-card-photo img" },
        { path: "/ko/journal", selector: ".highlight-card-photo img" },
        { path: `/ko/programs/${event?.id}`, selector: ".gallery-photo img" },
        { path: `/ko/journal/${highlight?.id}`, selector: ".gallery-photo img" },
      ];
      const measurements = [];
      try {
        for (const width of [375, 768, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          for (const { path, selector } of photos) {
            await page.goto(path);
            await page.evaluate(() => document.fonts.ready);
            const photo = page.locator(selector).last();
            await photo.scrollIntoViewIfNeeded();
            const pixels = await photo.evaluate(async (element: HTMLImageElement) => {
              await element.decode();
              const decoded = new Image();
              decoded.src = element.currentSrc;
              await decoded.decode();
              const frame = element.getBoundingClientRect();
              return {
                display: [frame.width, frame.height],
                decoded: [decoded.naturalWidth, decoded.naturalHeight],
                scale: Math.max(
                  frame.width * devicePixelRatio / decoded.naturalWidth,
                  frame.height * devicePixelRatio / decoded.naturalHeight,
                ),
              };
            });
            measurements.push({ path, selector, width, dpr, ...pixels });
            expect.soft(pixels.scale, `${path} at ${width}px / DPR ${dpr}`).toBeLessThanOrEqual(1.01);
          }
        }
      } finally {
        const evidence = process.env.BCS_EVIDENCE_DIR ?? "../docs/checkpoints/evidence";
        await mkdir(evidence, { recursive: true });
        await writeFile(
          `${evidence}/image-quality-dpr${dpr}.json`,
          JSON.stringify(measurements, null, 2),
        );
      }
    });
  });
}
});
