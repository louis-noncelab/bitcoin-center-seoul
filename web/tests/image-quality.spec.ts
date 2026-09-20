import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { z } from "zod";

const staticPhotos = [
  { path: "/ko", selector: ".home-space-collage img" },
  { path: "/ko/about", selector: ".about-detail .media-frame img" },
  { path: "/ko/experience", selector: ".experience-gallery > :first-child img" },
  { path: "/ko/experience", selector: ".experience-object img" },
  { path: "/ko/programs", selector: ".selection-panel:not([hidden]) img" },
  { path: "/ko/about", selector: ".about-detail > img" },
];
const publicRowsSchema = z.object({
  data: z.array(z.object({ id: z.number().int().positive(), images: z.array(z.string()) })),
});

for (const dpr of [1, 2]) {
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
      const event = publicRowsSchema.parse(await eventResponse.json()).data.find(({ images }) => images.length > 0);
      const highlight = publicRowsSchema.parse(await highlightResponse.json()).data.find(({ images }) => images.length > 0);
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
            expect(pixels.scale, `${path} at ${width}px / DPR ${dpr}`).toBeLessThanOrEqual(1.01);
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
