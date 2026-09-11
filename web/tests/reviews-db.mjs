import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import sharp from "sharp";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-reviews-"));
process.env.BCS_EVENTS_DB = path.join(directory, "events.db");
process.env.BCS_EVENTS_UPLOADS = path.join(directory, "images");
const { openDatabase, getDatabase } = await import("../src/server/events/db.ts");
const { listReviews, saveReview, deleteReview, getReviewSelection, saveReviewSelection, publicReviews } = await import("../src/server/reviews/index.ts");
const { reviewInputSchema, reviewSelectionInputSchema } = await import("../src/lib/reviews-contract.ts");
const { imageReferences } = await import("../src/server/events/image-references.ts");
const original = openDatabase(process.env.BCS_EVENTS_DB);
original.prepare("INSERT INTO notices (slug,title,description) VALUES ('legacy','Original','Preserve me')").run();
original.close();
const input = (record) => reviewInputSchema.parse(Object.fromEntries(Object.entries(record).filter(([key]) => !["id", "revision", "created_at", "updated_at"].includes(key))));
after(() => { getDatabase().close(); fs.rmSync(directory, { recursive: true, force: true }); });

test("public reads keep an empty database empty and edits never trigger seeding", async () => {
  assert.deepEqual(listReviews(true), []);
  assert.deepEqual(publicReviews(), { records: [], featured: null, home: [] });
  assert.deepEqual(getReviewSelection(), { featured_id: null, home_ids: [], revision: 1 });
  assert.equal(fs.existsSync(process.env.BCS_EVENTS_UPLOADS), false);
  assert.equal(getDatabase().prepare("SELECT title FROM notices WHERE slug='legacy'").get().title, "Original");
  const folder = path.join(process.env.BCS_EVENTS_UPLOADS, "uploads", "reviews");
  fs.mkdirSync(folder, { recursive: true });
  await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toFile(path.join(folder, "fixture.webp"));
  const records = ["first", "second", "third"].map((name, index) => saveReview(reviewInputSchema.parse({
    kind: "blog", url: `https://example.com/${name}`, author: "Fixture visitor", title: name, summary: "Synthetic review",
    slug: name, is_active: 1, image: index === 0 ? "/images/uploads/reviews/fixture.webp" : "",
  })));
  saveReviewSelection({ featured_id: records[0].id, home_ids: records.map(record => record.id) }, 1);
  deleteReview(records[2].id, records[2].revision);
  assert.equal(listReviews(true).length, 2);
  assert.ok(!listReviews(true).some(record => record.id === records[2].id));
});

test("stale save and delete cannot overwrite a newer review", () => {
  const target = listReviews(true).find(record => record.image);
  const saved = saveReview({ ...input(target), title: "먼저 저장" }, target.id, target.revision);
  assert.throws(() => saveReview({ ...input(target), title: "덮어쓰기" }, target.id, target.revision), { status: 409, code: "EDIT_CONFLICT" });
  assert.throws(() => deleteReview(target.id, target.revision), { status: 409, code: "EDIT_CONFLICT" });
  assert.equal(listReviews(true).find(r => r.id === target.id).title, saved.title);
});

test("selection revision protects the full selection and rejects duplicates and unavailable reviews", () => {
  const selection = getReviewSelection();
  const saved = saveReviewSelection({ featured_id: selection.featured_id, home_ids: selection.home_ids.slice(0, 2) }, selection.revision);
  assert.throws(() => saveReviewSelection({ featured_id: null, home_ids: [] }, selection.revision), { status: 409 });
  assert.throws(() => saveReviewSelection({ featured_id: 999999, home_ids: [] }, saved.revision), { code: "REVIEW_UNAVAILABLE" });
  const paper = listReviews().find(r => !r.image);
  assert.throws(() => saveReviewSelection({ featured_id: paper.id, home_ids: [] }, saved.revision), { code: "COVER_REQUIRED" });
  assert.equal(getReviewSelection().revision, saved.revision);
  assert.equal(reviewSelectionInputSchema.safeParse({ featured_id: null, home_ids: [1,1] }).success, false);
});

test("hiding removes selected reviews and images publicly while retaining backup references", () => {
  const featured = listReviews().find(r => r.id === getReviewSelection().featured_id);
  saveReview({ ...input(featured), is_active: 0 }, featured.id, featured.revision);
  assert.equal(publicReviews().featured, null);
  assert.ok(!publicReviews().home.some(r => r.id === featured.id));
  assert.ok(!listReviews().some(r => r.id === featured.id));
  assert.ok(!imageReferences(getDatabase(), true).includes(featured.image));
  assert.ok(imageReferences(getDatabase()).includes(featured.image));
});

test("boundary rejects executable links, invalid dates and missing image files", () => {
  const draft = { kind: "blog", title: "후기", author: "방문자", summary: "방문 소개", url: "https://example.com/review" };
  for (const patch of [{ url: "javascript:alert(1)" }, { url: "https://name:password@example.com" }, { image: "/images/uploads/../../secret.webp" }, { date: "2026-02-30" }, { summary: "" }]) {
    assert.equal(reviewInputSchema.safeParse({ ...draft, ...patch }).success, false);
  }
  assert.throws(() => saveReview(reviewInputSchema.parse({ ...draft, image: "/images/uploads/absent.webp" })), { code: "IMAGE_NOT_FOUND" });
});

test("article slugs keep old links, hide drafts and reserve deleted URLs", async () => {
  const { reviewBySlug } = await import("../src/server/reviews/index.ts");
  const draft = reviewInputSchema.parse({ kind: "blog", title: "Article", author: "Visitor", summary: "Summary", url: "https://example.com/article", slug: "coffee-visit", description: "## Afternoon\n\nAn editorial introduction.", is_active: 1 });
  const saved = saveReview(draft);
  assert.equal(reviewBySlug("coffee-visit").id, saved.id);
  const moved = saveReview({ ...draft, slug: "afternoon-coffee" }, saved.id, saved.revision);
  assert.equal(reviewBySlug("coffee-visit").slug, "afternoon-coffee");
  assert.throws(() => saveReview(draft), { code: "SLUG_CONFLICT" });
  const hidden = saveReview({ ...draft, slug: moved.slug, is_active: 0 }, moved.id, moved.revision);
  assert.equal(reviewBySlug("coffee-visit"), null);
  deleteReview(hidden.id, hidden.revision);
  assert.equal(reviewBySlug("afternoon-coffee"), null);
  assert.throws(() => saveReview(draft), { code: "SLUG_CONFLICT" });
});

test("article body images are validated and retained in backups but hidden publicly", () => {
  const folder = path.join(process.env.BCS_EVENTS_UPLOADS, "uploads", "reviews");
  fs.mkdirSync(folder, { recursive: true });
  fs.copyFileSync(path.join(folder, "fixture.webp"), path.join(folder, "body-only.webp"));
  const image = "/images/uploads/reviews/body-only.webp";
  const draft = { kind: "blog", title: "Body", author: "Visitor", summary: "Summary", url: "https://example.com/body", slug: "body-images", description: `![Scene][photo]\n\n[photo]: ${image}`, is_active: 1 };
  assert.equal(reviewInputSchema.safeParse({ ...draft, slug: "" }).success, false);
  assert.throws(() => saveReview(reviewInputSchema.parse({ ...draft, description: "![Missing](/images/uploads/missing.webp)" })), { code: "IMAGE_NOT_FOUND" });
  const saved = saveReview(reviewInputSchema.parse(draft));
  assert.ok(imageReferences(getDatabase(), true).includes(image));
  saveReview({ ...input(saved), is_active: 0 }, saved.id, saved.revision);
  assert.ok(!imageReferences(getDatabase(), true).includes(image));
  assert.ok(imageReferences(getDatabase()).includes(image));
});
