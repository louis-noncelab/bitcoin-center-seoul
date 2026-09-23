import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import "./helpers/pg-content-env.mjs";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-reviews-"));
process.env.BCS_EVENTS_DB = path.join(directory, "events.db");
process.env.BCS_EVENTS_UPLOADS = path.join(directory, "images");
const { openDatabase, getDatabase } = await import("../src/server/events/db.ts");
const { prisma } = await import("../src/server/db.ts");
const { listReviews, saveReview, deleteReview, getReviewSelection, saveReviewSelection, publicReviews } = await import("../src/server/reviews/index.ts");
const { reviewInputSchema, reviewSelectionInputSchema } = await import("../src/lib/reviews-contract.ts");
const { referencedImagePaths } = await import("../src/server/events/content-images.ts");
const original = openDatabase(process.env.BCS_EVENTS_DB);
original.prepare("INSERT INTO notices (slug,title,description) VALUES ('legacy','Original','Preserve me')").run();
original.close();
const input = (record) => reviewInputSchema.parse(Object.fromEntries(Object.entries(record).filter(([key]) => !["id", "revision", "created_at", "updated_at"].includes(key))));
before(async () => {
  await prisma.reviewSlug.deleteMany();
  await prisma.visitReview.deleteMany();
  await prisma.reviewSelection.update({ where: { id: 1 }, data: { featuredId: null, homeIds: "[]", revision: 1 } });
});
after(async () => {
  await prisma.reviewSlug.deleteMany();
  await prisma.visitReview.deleteMany();
  await prisma.reviewSelection.update({ where: { id: 1 }, data: { featuredId: null, homeIds: "[]", revision: 1 } });
  await prisma.$disconnect();
  getDatabase().close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("public reads keep an empty database empty and edits never trigger seeding", async () => {
  assert.deepEqual(await listReviews(true), []);
  assert.deepEqual(await publicReviews(), { records: [], featured: null, home: [] });
  assert.deepEqual(await getReviewSelection(), { featured_id: null, home_ids: [], revision: 1 });
  assert.equal(fs.existsSync(process.env.BCS_EVENTS_UPLOADS), false);
  assert.equal(getDatabase().prepare("SELECT title FROM notices WHERE slug='legacy'").get().title, "Original");
  const folder = path.join(process.env.BCS_EVENTS_UPLOADS, "uploads", "reviews");
  fs.mkdirSync(folder, { recursive: true });
  await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toFile(path.join(folder, "fixture.webp"));
  const records = await Promise.all(["first", "second", "third"].map((name, index) => saveReview(reviewInputSchema.parse({
    kind: "blog", url: `https://example.com/${name}`, author: "Fixture visitor", title: name, summary: "Synthetic review",
    slug: name, is_active: 1, image: index === 0 ? "/images/uploads/reviews/fixture.webp" : "",
  }))));
  await saveReviewSelection({ featured_id: records[0].id, home_ids: records.map(record => record.id) }, 1);
  await deleteReview(records[2].id, records[2].revision);
  assert.equal((await listReviews(true)).length, 2);
  assert.ok(!(await listReviews(true)).some(record => record.id === records[2].id));
});

test("stale save and delete cannot overwrite a newer review", async () => {
  const target = (await listReviews(true)).find(record => record.image);
  const saved = await saveReview({ ...input(target), title: "먼저 저장" }, target.id, target.revision);
  await assert.rejects(saveReview({ ...input(target), title: "덮어쓰기" }, target.id, target.revision), { status: 409, code: "EDIT_CONFLICT" });
  await assert.rejects(deleteReview(target.id, target.revision), { status: 409, code: "EDIT_CONFLICT" });
  assert.equal((await listReviews(true)).find(r => r.id === target.id).title, saved.title);
});

test("selection revision protects the full selection and rejects duplicates and unavailable reviews", async () => {
  const selection = await getReviewSelection();
  const saved = await saveReviewSelection({ featured_id: selection.featured_id, home_ids: selection.home_ids.slice(0, 2) }, selection.revision);
  await assert.rejects(saveReviewSelection({ featured_id: null, home_ids: [] }, selection.revision), { status: 409 });
  await assert.rejects(saveReviewSelection({ featured_id: 999999, home_ids: [] }, saved.revision), { code: "REVIEW_UNAVAILABLE" });
  const paper = (await listReviews()).find(r => !r.image);
  await assert.rejects(saveReviewSelection({ featured_id: paper.id, home_ids: [] }, saved.revision), { code: "COVER_REQUIRED" });
  assert.equal((await getReviewSelection()).revision, saved.revision);
  assert.equal(reviewSelectionInputSchema.safeParse({ featured_id: null, home_ids: [1,1] }).success, false);
});

test("hiding removes selected reviews and images publicly while retaining backup references", async () => {
  const selection = await getReviewSelection();
  const featured = (await listReviews()).find(r => r.id === selection.featured_id);
  await saveReview({ ...input(featured), is_active: 0 }, featured.id, featured.revision);
  assert.equal((await publicReviews()).featured, null);
  assert.ok(!(await publicReviews()).home.some(r => r.id === featured.id));
  assert.ok(!(await listReviews()).some(r => r.id === featured.id));
  assert.ok(!(await referencedImagePaths(true)).includes(featured.image));
  assert.ok((await referencedImagePaths()).includes(featured.image));
});

test("boundary rejects executable links, invalid dates and missing image files", async () => {
  const draft = { kind: "blog", title: "후기", author: "방문자", summary: "방문 소개", url: "https://example.com/review" };
  for (const patch of [{ url: "javascript:alert(1)" }, { url: "https://name:password@example.com" }, { image: "/images/uploads/../../secret.webp" }, { date: "2026-02-30" }, { summary: "" }]) {
    assert.equal(reviewInputSchema.safeParse({ ...draft, ...patch }).success, false);
  }
  await assert.rejects(saveReview(reviewInputSchema.parse({ ...draft, image: "/images/uploads/absent.webp" })), { code: "IMAGE_NOT_FOUND" });
});

test("article slugs keep old links, hide drafts and reserve deleted URLs", async () => {
  const { reviewBySlug } = await import("../src/server/reviews/index.ts");
  const draft = reviewInputSchema.parse({ kind: "blog", title: "Article", author: "Visitor", summary: "Summary", url: "https://example.com/article", slug: "coffee-visit", description: "## Afternoon\n\nAn editorial introduction.", is_active: 1 });
  const saved = await saveReview(draft);
  assert.equal((await reviewBySlug("coffee-visit")).id, saved.id);
  const moved = await saveReview({ ...draft, slug: "afternoon-coffee" }, saved.id, saved.revision);
  assert.equal((await reviewBySlug("coffee-visit")).slug, "afternoon-coffee");
  await assert.rejects(saveReview(draft), { code: "SLUG_CONFLICT" });
  const hidden = await saveReview({ ...draft, slug: moved.slug, is_active: 0 }, moved.id, moved.revision);
  assert.equal(await reviewBySlug("coffee-visit"), null);
  await deleteReview(hidden.id, hidden.revision);
  assert.equal(await reviewBySlug("afternoon-coffee"), null);
  await assert.rejects(saveReview(draft), { code: "SLUG_CONFLICT" });
});

test("article body images are validated and retained in backups but hidden publicly", async () => {
  const folder = path.join(process.env.BCS_EVENTS_UPLOADS, "uploads", "reviews");
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "body-only.webp"), "body");
  const image = "/images/uploads/reviews/body-only.webp";
  const draft = { kind: "blog", title: "Body", author: "Visitor", summary: "Summary", url: "https://example.com/body", slug: "body-images", description: `![Scene][photo]\n\n[photo]: ${image}`, is_active: 1 };
  assert.equal(reviewInputSchema.safeParse({ ...draft, slug: "" }).success, false);
  await assert.rejects(() => saveReview(reviewInputSchema.parse({ ...draft, description: "![Missing](/images/uploads/missing.webp)" })), { code: "IMAGE_NOT_FOUND" });
  const saved = await saveReview(reviewInputSchema.parse(draft));
  const stored = "/images/uploads/reviews/body-images/body-only.webp";
  assert.equal(saved.description.includes(stored), true);
  assert.ok((await referencedImagePaths(true)).includes(stored));
  await saveReview({ ...input(saved), is_active: 0 }, saved.id, saved.revision);
  assert.ok(!(await referencedImagePaths(true)).includes(stored));
  assert.ok((await referencedImagePaths()).includes(stored));
});
