import { mkdir } from "node:fs/promises";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

const evidence = `${process.env.BCS_EVIDENCE_DIR ?? "../docs/checkpoints/evidence"}/public-site`;
const pages = [
  "",
  "/about",
  "/programs",
  "/experience",
  "/journal",
  "/visit",
  "/goods",
] as const;
const removedPages = ["/design-system"] as const;
const publicRowsSchema = z.object({ data: z.array(z.object({ id: z.number().int().positive() })) });

async function publicDetailPaths(request: APIRequestContext) {
  const [events, highlights] = await Promise.all([
    request.get("/api/events"),
    request.get("/api/highlights"),
  ]);
  expect(events.status()).toBe(200);
  expect(highlights.status()).toBe(200);
  const eventRows = publicRowsSchema.parse(await events.json()).data;
  const highlightRows = publicRowsSchema.parse(await highlights.json()).data;
  return [
    ...eventRows.map(({ id }) => `/programs/${id}`),
    ...highlightRows.map(({ id }) => `/journal/${id}`),
  ];
}

for (const locale of ["ko", "en"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [375, 768, 1280]) {
      for (const path of pages) {
        test(`${locale}${path || "/home"} ${theme} at ${width}px`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.addInitScript(
            (value) => localStorage.setItem("bcs-theme", value),
            theme,
          );
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));

          const response = await page.goto(`/${locale}${path}`);

          expect(response?.status()).toBe(200);
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator("h1")).toHaveCount(1);
          await expect(page.locator("h1")).toBeVisible();
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            "content",
            /noindex/,
          );
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(() =>
              Array.from(document.fonts).some(
                (font) => font.family.includes("Pretendard") && font.status === "loaded",
              ),
            ),
          ).toBe(true);
          for (const photo of await page.locator("img:visible").all()) {
            await photo.scrollIntoViewIfNeeded();
            await photo.evaluate((image: HTMLImageElement) => image.decode());
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          expect(errors).toEqual([]);
          await page.evaluate(() =>
            window.scrollTo({ top: 0, behavior: "instant" }),
          );
          await mkdir(evidence, { recursive: true });
          await page.screenshot({
            path: `${evidence}/${locale}-${path.slice(1) || "home"}-${theme}-${width}.png`,
            fullPage: true,
          });
        });
      }
    }
  }
}

test("mobile navigation, locale and theme preserve a usable destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/ko");
  const menu = page.getByRole("button", { name: "메뉴", exact: true });
  await menu.click();
  await expect(page.locator(".disclosure-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page.locator(".disclosure-panel").getByRole("button", { name: "공간과 체험", exact: true }).click();
  await page
    .locator(".disclosure-panel")
    .getByRole("link", { name: "공간과 체험 안내", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ko\/experience$/);
  await page
    .getByRole("link", { name: "EN · Switch to English", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/experience$/);
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("link", { name: "Wallet experience guide" }),
  ).toHaveAttribute("href", "https://bitcoincenterseoul.com/walletExperence");
});

test("program tabs support keyboard selection with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ko/programs");
  const first = page.getByRole("tab").first();
  await expect(page.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab").last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await page.keyboard.press("Home");
  await expect(first).toHaveAttribute("aria-selected", "true");
});

test("public metadata, search policy and unknown routes have explicit behavior", async ({
  page,
  request,
}) => {
  const response = await page.goto("/en/visit");
  expect(response?.headers().link ?? "").not.toContain('rel="alternate"');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://bitcoincenterseoul.com/en/visit",
  );
  await expect(page.locator('link[hreflang="ko"]')).toHaveAttribute(
    "href",
    "https://bitcoincenterseoul.com/ko/visit",
  );
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const detailPaths = await publicDetailPaths(request);
  const sitemapText = await sitemap.text();
  for (const locale of ["ko", "en"]) {
    for (const pathname of [...pages, ...detailPaths]) expect(sitemapText).toContain(`https://bitcoincenterseoul.com/${locale}${pathname}</loc>`);
  }
  for (const locale of ["ko", "en"]) {
    for (const path of removedPages) {
      expect((await request.get(`/${locale}${path}`)).status()).toBe(404);
    }
  }
  expect((await request.get("/ko/unknown-page")).status()).toBe(404);
});
