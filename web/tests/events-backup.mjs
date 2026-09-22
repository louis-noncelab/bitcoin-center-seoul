import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(webRoot, "scripts/events-backup.ts");
const image = "/images/uploads/2026-09/example.webp";
const secret = "test-only-private-session-hash";
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-backup-test-"));
  const database = path.join(root, "source.db");
  const images = path.join(root, "source-images");
  const output = path.join(root, "bundle");
  const temporary = path.join(root, "restore-temporary");
  fs.mkdirSync(path.join(images, "uploads/2026-09"), { recursive: true });
  fs.mkdirSync(temporary);
  fs.writeFileSync(path.join(images, image.slice("/images/".length)), "immutable-image");
  const db = new Database(database);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE events (id INTEGER PRIMARY KEY, title TEXT, image TEXT NOT NULL);
    CREATE TABLE highlights (id INTEGER PRIMARY KEY, image TEXT NOT NULL);
    CREATE TABLE content_images (kind TEXT, content_id INTEGER, position INTEGER, path TEXT);
    CREATE TABLE notices (id INTEGER PRIMARY KEY, title TEXT);
    CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER);
  `);
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.prepare("INSERT INTO events VALUES (1, 'latest WAL event', ?)").run(image);
  db.prepare("INSERT INTO content_images VALUES ('event', 1, 0, ?)").run(image);
  db.prepare("INSERT INTO notices VALUES (1, 'latest WAL notice')").run();
  db.prepare("INSERT INTO admin_sessions VALUES (?, 123)").run(secret);
  t.after(() => { db.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const run = (...args) => {
    assert.ok(fs.existsSync(cli), "The online backup CLI is not implemented yet");
    return spawnSync(process.execPath, ["--import", "tsx", cli, ...args], {
      cwd: webRoot, encoding: "utf8", timeout: 30_000,
      env: { PATH: process.env.PATH, TMPDIR: temporary },
    });
  };
  const backup = (...extra) => run("backup", "--database", database, "--images", images, "--output", output, ...extra);
  return { root, database, images, output, temporary, db, run, backup };
}

test("backs up committed WAL data, images and private files when the writer stays open", (t) => {
  // Given: uncheckpointed content and an open SQLite writer.
  const f = fixture(t);
  assert.ok(fs.statSync(`${f.database}-wal`).size > 0);
  const before = hash(f.database);
  // When: the real CLI creates an online backup.
  const result = f.backup();
  // Then: the full snapshot and matching image survive without changing the source.
  assert.equal(result.status, 0, result.stderr);
  const restored = new Database(path.join(f.output, "events.db"), { readonly: true });
  try {
    assert.equal(restored.prepare("SELECT title FROM events").get().title, "latest WAL event");
    assert.equal(restored.prepare("SELECT title FROM notices").get().title, "latest WAL notice");
    assert.equal(restored.prepare("SELECT token_hash FROM admin_sessions").get().token_hash, secret);
    assert.equal(restored.pragma("journal_mode", { simple: true }), "delete");
    assert.equal(restored.pragma("integrity_check", { simple: true }), "ok");
  } finally { restored.close(); }
  const manifest = JSON.parse(fs.readFileSync(path.join(f.output, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.files.map((entry) => entry.path).sort(), ["events.db", image.slice(1)]);
  assert.equal(fs.statSync(f.output).mode & 0o777, 0o700);
  for (const entry of manifest.files) {
    const filename = path.join(f.output, entry.path);
    assert.equal(hash(filename), entry.sha256);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
  }
  assert.equal(fs.statSync(path.join(f.output, "manifest.json")).mode & 0o777, 0o600);
  assert.equal(hash(f.database), before);
  assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
});

test("restores into a fresh temporary directory when a complete backup is verified", (t) => {
  // Given: a complete bundle and a still-open source database.
  const f = fixture(t);
  assert.equal(f.backup().status, 0);
  const before = hash(f.database);
  const temporaryBefore = fs.readdirSync(f.temporary);
  // When: a restoration drill is requested.
  const result = f.run("restore-check", "--backup", f.output);
  // Then: the drill succeeds, removes its scratch files and preserves the source.
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(f.temporary), temporaryBefore);
  assert.equal(hash(f.database), before);
  assert.equal(f.db.prepare("SELECT count(*) AS total FROM events").get().total, 1);
});

test("refuses overwrite when the output directory already exists", (t) => {
  // Given: a previously used destination.
  const f = fixture(t);
  fs.mkdirSync(f.output);
  fs.writeFileSync(path.join(f.output, "keep"), "previous-backup");
  // When: the same output is selected.
  const result = f.backup();
  // Then: existing files remain unchanged.
  assert.equal(result.status, 1);
  assert.equal(fs.readFileSync(path.join(f.output, "keep"), "utf8"), "previous-backup");
});

for (const condition of ["missing image", "external image symlink", "image-root destination"]) {
  test(`refuses an incomplete or unsafe backup when there is a ${condition}`, (t) => {
    // Given: an unsafe filesystem condition.
    const f = fixture(t);
    const source = path.join(f.images, image.slice("/images/".length));
    if (condition !== "image-root destination") fs.unlinkSync(source);
    if (condition === "external image symlink") fs.symlinkSync(f.database, source);
    const output = condition === "image-root destination" ? path.join(f.images, "bundle") : f.output;
    // When: a backup is requested.
    const result = f.run("backup", "--database", f.database, "--images", f.images, "--output", output);
    // Then: no usable or partial backup is left behind.
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(output), false);
  });
}

for (const condition of ["image tampering", "missing manifest entry", "traversal path"]) {
  test(`rejects restoration when the backup has ${condition}`, (t) => {
    // Given: an altered backup.
    const f = fixture(t);
    assert.equal(f.backup().status, 0);
    const temporaryBefore = fs.readdirSync(f.temporary);
    const filename = path.join(f.output, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (condition === "image tampering") fs.writeFileSync(path.join(f.output, image.slice(1)), "altered");
    if (condition === "missing manifest entry") manifest.files = manifest.files.filter((entry) => entry.path === "events.db");
    if (condition === "traversal path") manifest.files[0].path = "../source.db";
    fs.writeFileSync(filename, JSON.stringify(manifest));
    // When: the real restore drill parses and verifies it.
    const result = f.run("restore-check", "--backup", f.output);
    // Then: restoration fails and scratch files are cleaned up.
    assert.equal(result.status, 1);
    assert.deepEqual(fs.readdirSync(f.temporary), temporaryBefore);
  });
}

test("offers help and rejects invalid arguments without application configuration", (t) => {
  // Given: no application environment or environment files are loaded.
  const f = fixture(t);
  // When: help and invalid CLI inputs are supplied.
  const results = [f.run("--help"), f.run("backup", "--database", "relative.db"), f.run("--unknown")];
  // Then: help succeeds and invalid inputs fail without creating a bundle.
  assert.deepEqual(results.map((result) => result.status), [0, 1, 1]);
  assert.equal(fs.existsSync(f.output), false);
});

test("backs up collection, visitor reviews and inline Markdown images, including unpublished items", (t) => {
  const f = fixture(t);
  const cover = "/images/uploads/2026-09/cover.webp";
  const inline = "/images/uploads/2026-09/inline.webp";
  const review = "/images/uploads/2026-09/review.webp";
  for (const url of [cover, inline, review]) fs.writeFileSync(path.join(f.images, url.slice("/images/".length)), "backup-fixture");
  f.db.exec("CREATE TABLE collection_items (id INTEGER PRIMARY KEY, images TEXT, description TEXT, descriptionEn TEXT, is_active INTEGER)");
  f.db.prepare("INSERT INTO collection_items VALUES (1, ?, ?, '', 0)").run(JSON.stringify([cover]), `![사진][photo]\n\n[photo]: ${inline}`);
  f.db.exec("CREATE TABLE visit_reviews (id INTEGER PRIMARY KEY, image TEXT, is_active INTEGER)");
  f.db.prepare("INSERT INTO visit_reviews VALUES (1, ?, 0)").run(review);
  const result = f.backup();
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.output, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.files.map(({ path }) => path).sort(), ["events.db", image.slice(1), cover.slice(1), inline.slice(1), review.slice(1)].sort());
  const restored = f.run("restore-check", "--backup", f.output);
  assert.equal(restored.status, 0, restored.stderr);
});

test("backs up shared product uploads even when no SQLite content references them", (t) => {
  const f = fixture(t);
  const productImage = "/images/uploads/2026-09/postgres-product.webp";
  fs.writeFileSync(path.join(f.images, productImage.slice("/images/".length)), "product-only-image");
  assert.equal(f.backup().status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.output, "manifest.json"), "utf8"));
  assert.ok(manifest.files.some((file) => file.path === productImage.slice(1)));
  assert.equal(f.run("restore-check", "--backup", f.output).status, 0);
});
