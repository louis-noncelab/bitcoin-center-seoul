import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { collectionRecordSchema, type CollectionRecord } from "@/lib/collection-contract";
import { deleteContentFixture } from "./content-cleanup";

const labels = { book: "도서", goods: "굿즈", boardgame: "보드게임", artwork: "작품" } as const;
const kinds = ["book", "goods", "boardgame", "artwork"] as const;
const rowsSchema = z.object({ data: z.array(collectionRecordSchema) });
const evidence = ".local/events-review/collection-filters";

test("kind filters limit purchasing to books and goods and follow saved kind changes", async ({ page, baseURL }) => {
  expect(baseURL).toBe("http://127.0.0.1:3102");
  const database = process.env.BCS_EVENTS_DB;
  if (!database) throw new Error("Run with the isolated review command.");
  const origin = baseURL ?? "";
  const headers = { origin };
  expect((await page.request.post("/api/admin/login", { headers, data: { password: process.env.ADMIN_PASSWORD } })).status()).toBe(200);
  const image = await sharp({ create: { width: 40, height: 60, channels: 3, background: "#ff8000" } }).png().toBuffer();
  const upload = await page.request.post("/api/admin/images", { headers, multipart: { files: { name: "filter.png", mimeType: "image/png", buffer: image } } });
  const uploaded = z.object({ data: z.object({ images: z.array(z.string()) }) }).parse(await upload.json());
  const records: CollectionRecord[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await mkdir(evidence, { recursive: true });
  try {
    for (const kind of kinds) {
      const data = { kind, title: `필터 검증 ${labels[kind]} ${randomUUID()}`, slug: `filter-${randomUUID()}`, images: uploaded.data.images, is_active: 1 };
      const created = await page.request.post("/api/admin/collection", { headers, data });
      expect(created.status()).toBe(201);
      const record = collectionRecordSchema.parse((await created.json()).data);
      records.push(record);
      if (kind === "boardgame" || kind === "artwork") {
        expect((await page.request.post("/api/admin/collection", { headers, data: { ...data, slug: `rejected-${randomUUID()}`, purchaseUrl: "https://pay.example.com/item" } })).status()).toBe(400);
        expect((await page.request.put(`/api/admin/collection/${record.id}`, { headers: { ...headers, "If-Match": `"${record.revision}"` }, data: { ...data, soldOut: true } })).status()).toBe(400);
        expect((await page.request.patch(`/api/admin/collection/${record.id}`, { headers: { ...headers, "If-Match": `"${record.revision}"` }, data: { soldOut: true } })).status()).toBe(400);
        const db = new Database(database);
        try { db.prepare("UPDATE collection_items SET purchaseUrl = ?, soldOut = 1 WHERE id = ?").run("https://pay.example.com/legacy", record.id); }
        finally { db.close(); }
        for (const locale of ["ko", "en"]) {
          const path = kind === "boardgame" ? "experience/board-game" : "collection";
          await page.goto(`/${locale}/${path}/${record.slug}`);
          await expect(page.locator('a[href="https://pay.example.com/legacy"], .collection-sold-out')).toHaveCount(0);
        }
      }
    }
    await page.goto("/ko/admin/collection");
    const filters = page.getByRole("navigation", { name: "종류별 필터" });
    for (const record of records) {
      await filters.getByRole("button", { name: labels[record.kind], exact: true }).click();
      await expect(filters.getByRole("button", { name: labels[record.kind], exact: true })).toHaveAttribute("aria-pressed", "true");
      const row = page.locator(".events-admin-list > li").filter({ hasText: record.title });
      await expect(row).toBeVisible();
      for (const other of records.filter(other => other.id !== record.id)) await expect(page.locator(".events-admin-list > li").filter({ hasText: other.title })).toHaveCount(0);
      await expect(row.getByRole("switch")).toHaveCount(record.kind === "book" || record.kind === "goods" ? 1 : 0);
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
          await page.screenshot({ path: `${evidence}/${record.kind}-${width}-${theme}.png`, animations: "disabled" });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.getByRole("button", { name: "항목 등록", exact: true }).click();
      await expect(page.getByRole("radio", { name: labels[record.kind], exact: true })).toBeChecked();
      if (record.kind === "book" || record.kind === "goods") await expect(page.getByLabel("구매하기 링크 (선택)", { exact: true })).toBeVisible();
      else {
        await expect(page.getByLabel("구매하기 링크 (선택)", { exact: true })).toBeHidden();
        await expect(page.locator('input[name="soldOut"]')).toBeDisabled();
      }
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
          await page.screenshot({ path: `${evidence}/${record.kind}-editor-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
        }
      }
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await expect(filters.getByRole("button", { name: labels[record.kind], exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    const book = records.find(record => record.kind === "book");
    if (!book) throw new Error("Missing book fixture.");
    await filters.getByRole("button", { name: "도서", exact: true }).click();
    await page.locator(".events-admin-list > li").filter({ hasText: book.title }).getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("구매하기 링크 (선택)", { exact: true }).fill("https://pay.example.com/unsaved");
    await page.locator('input[name="soldOut"]').check();
    await page.getByRole("radio", { name: "작품", exact: true }).check();
    await expect(page.getByLabel("구매하기 링크 (선택)", { exact: true })).toBeHidden();
    await page.getByRole("radio", { name: "굿즈", exact: true }).check();
    await expect(page.getByLabel("구매하기 링크 (선택)", { exact: true })).toHaveValue("https://pay.example.com/unsaved");
    await expect(page.locator('input[name="soldOut"]')).toBeChecked();
    await page.getByRole("radio", { name: "작품", exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(filters.getByRole("button", { name: "작품", exact: true })).toHaveAttribute("aria-pressed", "true");
    const saved = rowsSchema.parse(await (await page.request.get("/api/admin/collection")).json()).data.find(record => record.id === book.id);
    expect(saved).toMatchObject({ kind: "artwork", purchaseUrl: "", soldOut: false });
    await filters.getByRole("button", { name: "전체", exact: true }).click();
    for (const record of records) await expect(page.locator(".events-admin-list > li").filter({ hasText: record.title })).toBeVisible();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
        await page.screenshot({ path: `${evidence}/all-${width}-${theme}.png`, animations: "disabled" });
      }
    }
    expect(errors).toEqual([]);
  } finally {
    for (const record of records) await deleteContentFixture(page.request, `/api/admin/collection/${record.id}`, origin);
  }
});
