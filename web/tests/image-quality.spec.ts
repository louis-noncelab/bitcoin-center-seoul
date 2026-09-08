import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const photos = [
  { path: "/ko", selector: ".hero-photo img" },
  { path: "/ko/about", selector: ".about-detail .media-frame img" },
  { path: "/ko", selector: ".goods-photo img" },
  { path: "/ko", selector: ".goods-detail-photo img" },
  { path: "/ko/experience", selector: ".experience-gallery > :first-child img" },
  { path: "/ko/experience", selector: ".experience-object img" },
  { path: "/ko/programs", selector: ".selection-panel:not([hidden]) img" },
  { path: "/ko/about", selector: ".about-detail > img" },
  { path: "/ko/goods", selector: ".goods-detail > img" },
  { path: "/ko/design-system", selector: ".media-studies img" },
];

for (const dpr of [1, 2]) {
  test.describe(`image quality at DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });

    test("cover crops have enough decoded pixels", async ({ page }) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
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
