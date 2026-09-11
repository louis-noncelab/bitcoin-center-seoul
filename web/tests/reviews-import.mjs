import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import Database from "better-sqlite3";
import sharp from "sharp";
import { openDatabase } from "../src/server/events/db.ts";

const photo = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toBuffer();
const review = (key, patch = {}) => ({ key, kind: "blog", url: `https://example.com/${key}`, author: "Test visitor", title: `Test ${key}`, summary: "Synthetic test review", slug: key, is_active: 1, ...patch });
async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-review-import-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bundle = path.join(root, "bundle");
  const db = path.join(root, "events.db");
  const uploads = path.join(root, "images");
  fs.mkdirSync(path.join(bundle, "images/uploads/reviews"), { recursive: true });
  fs.writeFileSync(path.join(bundle, "images/uploads/reviews/cover.webp"), photo);
  fs.writeFileSync(path.join(bundle, "images/uploads/reviews/body.webp"), photo);
  const content = { version: 1, reviews: [review("first", { image: "/images/uploads/reviews/cover.webp", description: "![Body][image]\n\n[image]: /images/uploads/reviews/body.webp" }), review("second")], selection: { featured_key: "first", home_keys: ["first", "second"] } };
  const write = () => fs.writeFileSync(path.join(bundle, "reviews.json"), JSON.stringify(content));
  write();
  const database = openDatabase(db);
  database.prepare("INSERT INTO notices (slug,title,description) VALUES ('existing','Existing notice','Preserve')").run();
  database.close();
  const run = (...args) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/reviews-import.ts", "--bundle", bundle, "--db", db, "--uploads", uploads, ...args], { cwd: process.cwd(), encoding: "utf8" });
  const inspect = callback => { const connection = new Database(db); try { return callback(connection); } finally { connection.close(); } };
  return { root, bundle, db, uploads, content, write, run, inspect };
}
function success(result) { assert.equal(result.status, 0, result.stderr); }
function rejected(result, code) { assert.equal(result.status, 1, result.stdout); assert.match(result.stderr, new RegExp(code)); }

test("dry-run reads a legacy schema without creating tables, directories or changing database bytes", async t => {
  const f = await fixture(t);
  f.inspect(db => db.exec("DROP TABLE visit_reviews; DROP TABLE review_selection; DROP TABLE review_slugs; PRAGMA journal_mode=DELETE"));
  const before = fs.readFileSync(f.db);
  const files = fs.readdirSync(f.root);
  const result = f.run();
  success(result);
  assert.match(result.stdout, /insert=2 unchanged=0 images=2/);
  assert.deepEqual(fs.readFileSync(f.db), before);
  assert.deepEqual(fs.readdirSync(f.root), files);
  assert.equal(fs.existsSync(f.uploads), false);
  f.inspect(db => assert.equal(db.prepare("SELECT count(*) AS count FROM sqlite_schema WHERE name='visit_reviews'").get().count, 0));
  success(f.run("--apply"));
  f.inspect(db => assert.equal(db.prepare("SELECT count(*) AS count FROM visit_reviews").get().count, 2));
});

test("explicit import copies cover and body images, preserves content, and repeats without writes", async t => {
  const f = await fixture(t);
  success(f.run("--apply"));
  const before = f.inspect(db => ({ records: db.prepare("SELECT * FROM visit_reviews ORDER BY id").all(), selection: db.prepare("SELECT * FROM review_selection").get() }));
  assert.equal(before.records.length, 2);
  assert.equal(before.selection.featured_id, before.records[0].id);
  assert.deepEqual(JSON.parse(before.selection.home_ids), before.records.map(record => record.id));
  assert.deepEqual(fs.readFileSync(path.join(f.uploads, "uploads/reviews/body.webp")), photo);
  const again = f.run("--apply");
  success(again);
  assert.match(again.stdout, /inserted=0 images_copied=0/);
  f.inspect(db => {
    assert.deepEqual(db.prepare("SELECT * FROM visit_reviews ORDER BY id").all(), before.records);
    assert.deepEqual(db.prepare("SELECT * FROM review_selection").get(), before.selection);
    assert.equal(db.prepare("SELECT title FROM notices WHERE slug='existing'").get().title, "Existing notice");
  });
});

test("duplicate keys, URLs, slugs and selection entries fail before writes", async t => {
  for (const field of ["key", "url", "slug", "selection"]) {
    const f = await fixture(t);
    if (field === "selection") f.content.selection.home_keys = ["first", "first"];
    else f.content.reviews[1][field] = f.content.reviews[0][field];
    f.write();
    rejected(f.run("--apply"), "DUPLICATE_BUNDLE_VALUE");
    assert.equal(fs.existsSync(f.uploads), false);
    f.inspect(db => assert.equal(db.prepare("SELECT count(*) AS count FROM visit_reviews").get().count, 0));
  }
});

test("changed records, edited selection and reserved deleted slugs are protected", async t => {
  for (const conflict of ["record", "selection", "deleted"]) {
    const f = await fixture(t);
    success(f.run("--apply"));
    f.inspect(db => {
      if (conflict === "record") db.exec("UPDATE visit_reviews SET title='Admin edit',revision=2 WHERE slug='first'");
      if (conflict === "selection") db.exec("UPDATE review_selection SET featured_id=NULL,home_ids='[]',revision=3");
      if (conflict === "deleted") db.exec("DELETE FROM visit_reviews WHERE slug='first'");
    });
    const before = f.inspect(db => ({ records: db.prepare("SELECT * FROM visit_reviews").all(), selection: db.prepare("SELECT * FROM review_selection").get() }));
    rejected(f.run("--apply"), conflict === "record" ? "REVIEW_CONTENT_CONFLICT" : conflict === "selection" ? "SELECTION_CONFLICT" : "SLUG_CONFLICT");
    f.inspect(db => {
      assert.deepEqual(db.prepare("SELECT * FROM visit_reviews").all(), before.records);
      assert.deepEqual(db.prepare("SELECT * FROM review_selection").get(), before.selection);
    });
  }
});

test("missing images, traversal, symlinks and differing destination bytes fail before insertion", async t => {
  for (const conflict of ["missing", "traversal", "source-link", "target-link", "different"]) {
    const f = await fixture(t);
    const cover = path.join(f.bundle, "images/uploads/reviews/cover.webp");
    if (conflict === "missing") fs.unlinkSync(cover);
    if (conflict === "traversal") { f.content.reviews[0].image = "/images/uploads/../../secret.webp"; f.write(); }
    if (conflict === "source-link") { fs.writeFileSync(path.join(f.root, "outside.webp"), photo); fs.unlinkSync(cover); fs.symlinkSync(path.join(f.root, "outside.webp"), cover); }
    if (conflict === "target-link") { fs.mkdirSync(f.uploads); fs.symlinkSync(path.join(f.bundle, "images/uploads"), path.join(f.uploads, "uploads")); }
    if (conflict === "different") { fs.mkdirSync(path.join(f.uploads, "uploads/reviews"), { recursive: true }); fs.writeFileSync(path.join(f.uploads, "uploads/reviews/cover.webp"), "existing bytes"); }
    rejected(f.run("--apply"), conflict === "missing" ? "INVALID_IMAGE_FILE" : conflict === "traversal" ? "INVALID_ARGUMENT_OR_BUNDLE" : conflict === "different" ? "IMAGE_CONTENT_CONFLICT" : "UNSAFE_IMAGE_PATH");
    f.inspect(db => assert.equal(db.prepare("SELECT count(*) AS count FROM visit_reviews").get().count, 0));
    if (conflict === "different") assert.equal(fs.readFileSync(path.join(f.uploads, "uploads/reviews/cover.webp"), "utf8"), "existing bytes");
  }
});

test("a failed insert rolls back every review and removes only newly copied images", async t => {
  const f = await fixture(t);
  fs.mkdirSync(path.join(f.uploads, "uploads/reviews"), { recursive: true });
  fs.writeFileSync(path.join(f.uploads, "uploads/reviews/cover.webp"), photo);
  f.inspect(db => db.exec("CREATE TRIGGER reject_second BEFORE INSERT ON visit_reviews WHEN NEW.slug='second' BEGIN SELECT RAISE(ABORT, 'test failure'); END"));
  rejected(f.run("--apply"), "IMPORT_IO_OR_DATABASE_FAILED");
  f.inspect(db => assert.equal(db.prepare("SELECT count(*) AS count FROM visit_reviews").get().count, 0));
  assert.deepEqual(fs.readFileSync(path.join(f.uploads, "uploads/reviews/cover.webp")), photo);
  assert.equal(fs.existsSync(path.join(f.uploads, "uploads/reviews/body.webp")), false);
});

test("dry-run sees committed live WAL changes instead of stale main-file content", async t => {
  const f = await fixture(t);
  success(f.run("--apply"));
  const writer = new Database(f.db);
  try {
    writer.pragma("wal_autocheckpoint=0");
    writer.exec("UPDATE visit_reviews SET title='Live WAL edit',revision=revision+1 WHERE slug='first'");
    rejected(f.run(), "REVIEW_CONTENT_CONFLICT");
    assert.equal(writer.prepare("SELECT title FROM visit_reviews WHERE slug='first'").get().title, "Live WAL edit");
  } finally { writer.close(); }
});
