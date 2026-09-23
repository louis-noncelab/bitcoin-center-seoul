import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { collectionRecordSchema } from "@/lib/collection-contract";
import { deleteContentFixture } from "./content-cleanup";

const recordsSchema = z.object({ data: z.array(collectionRecordSchema) });
const evidence = ".local/events-review/purchase-links";
async function capture(page: Page, options: { path: string; fullPage?: boolean }) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ ...options, animations: "disabled" });
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ ...options, animations: "disabled", path: options.path.replace(".png", "-dark.png") });
  await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value ?? "light"), theme);
}

for (const kind of ["book", "goods"] as const) {
  test(`${kind}: exhibition points at the shop and rejects an external purchase link`, async ({ page, baseURL }) => {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("Run through npm run review -- test.");
    const origin = baseURL ?? "";
    const title = `검증용 ${kind === "book" ? "도서" : "굿즈"} ${randomUUID()}`;
    const slug = `purchase-${randomUUID()}`;
    const path = kind === "goods" ? "goods" : "collection";
    let id: number | undefined;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    expect((await page.request.post("/api/admin/login", { headers: { origin }, data: { password } })).status()).toBe(200);
    await mkdir(evidence, { recursive: true });
    try {
      await page.goto("/ko/admin/collection");
      await page.getByRole("button", { name: "항목 등록", exact: true }).click();
      await page.getByRole("radio", { name: kind === "book" ? "도서" : "굿즈", exact: true }).check();
      await expect(page.getByLabel("구매하기 링크 (선택)", { exact: true })).toHaveCount(0);
      await page.getByLabel("제목", { exact: true }).fill(title);
      await page.getByLabel("URL 슬러그 (공개 보드게임 필수)", { exact: true }).fill(slug);
      await page.getByLabel("소개 (선택)", { exact: true }).fill("센터에서 만나는 비트코인. 구매는 상점에서 합니다.");
      const buffer = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#ff8000" } }).png().toBuffer();
      await page.locator('.events-gallery-field input[type="file"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer });
      await expect(page.locator(".events-gallery-editor img")).toHaveCount(1);
      await page.getByLabel("공개", { exact: true }).check();
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
      const item = recordsSchema.parse(await (await page.request.get("/api/admin/collection")).json()).data.find(record => record.slug === slug);
      if (!item) throw new Error("Saved item missing.");
      id = item.id;
      expect(item).toMatchObject({ purchaseUrl: "", soldOut: false });
      const { id: savedId, revision, created_at, updated_at, ...input } = item;
      expect(savedId).toBe(id); expect(created_at).toBeTruthy(); expect(updated_at).toBeTruthy();
      expect((await page.request.put(`/api/admin/collection/${id}`, { headers: { origin, "If-Match": `"${revision}"` }, data: { ...input, purchaseUrl: "https://pay.example.com/item" } })).status()).toBe(400);
      expect((await page.request.patch(`/api/admin/collection/${id}`, { headers: { origin, "If-Match": `"${revision}"` }, data: { soldOut: true } })).status()).toBe(400);
      expect((await page.request.get(`/ko/${kind === "goods" ? "collection" : "goods"}/${slug}`)).status()).toBe(404);
      for (const locale of ["ko", "en"] as const) {
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`/${locale}/${path}${kind === "book" ? "?kind=book" : ""}`);
          const card = page.locator(".review-card").filter({ hasText: title });
          await expect(card).toBeVisible();
          const buy = card.getByRole("link", { name: locale === "ko" ? "상점 둘러보기" : "Browse the shop", exact: true });
          await expect(buy).toHaveAttribute("href", `/${locale}/shop`);
          await expect(card.locator("a[target='_blank']")).toHaveCount(0);
          await card.scrollIntoViewIfNeeded();
          await capture(page, { path: `${evidence}/${kind}-${locale}-${width}-list.png` });
          await card.locator(".review-card-link").click();
          await expect(page).toHaveURL(`/${locale}/${path}/${slug}`);
          await expect(page.locator("main h1")).toHaveText(title);
          await expect(page.locator("main").getByRole("link", { name: locale === "ko" ? "상점 둘러보기" : "Browse the shop", exact: true })).toHaveAttribute("href", `/${locale}/shop`);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await capture(page, { path: `${evidence}/${kind}-${locale}-${width}-detail.png`, fullPage: true });
        }
      }
      await page.goto("/ko/admin/collection");
      await expect(page.getByRole("switch", { name: `${title} 품절`, exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally {
      if (id !== undefined) await deleteContentFixture(page.request, `/api/admin/collection/${id}`, origin);
    }
  });
}

test("sold-out PATCH enforces authentication, origin, shape and revision", async ({ request, baseURL }) => {
  const origin = baseURL ?? "";
  const path = "/api/admin/collection/999999";
  expect((await request.patch(path, { headers: { origin }, data: { soldOut: true } })).status()).toBe(401);
  expect((await request.post("/api/admin/login", { headers: { origin }, data: { password: process.env.ADMIN_PASSWORD } })).status()).toBe(200);
  expect((await request.patch(path, { headers: { origin: "https://attacker.invalid" }, data: { soldOut: true } })).status()).toBe(403);
  for (const data of [{ soldOut: "false" }, { soldOut: 1 }, { soldOut: true, title: "overwrite" }, {}]) {
    expect((await request.patch(path, { headers: { origin, "If-Match": '"1"' }, data })).status()).toBe(400);
  }
  expect((await request.patch(path, { headers: { origin }, data: { soldOut: true } })).status()).toBe(428);
  expect((await request.patch(path, { headers: { origin, "If-Match": '"1"' }, data: { soldOut: true } })).status()).toBe(404);
});
