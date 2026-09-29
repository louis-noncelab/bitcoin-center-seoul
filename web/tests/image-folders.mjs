import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-image-folders-"));
process.env.BCS_EVENTS_UPLOADS = root;
const { deleteUnusedImages, placeImagesInSlugFolder, rewriteImagePaths } = await import("../src/server/events/images.ts");
const noReferences = new Set();

test("a slug collects attached images into that post's folder", async () => {
  const source = path.join(root, "uploads", "2026-09");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "cover.webp"), "cover");
  fs.writeFileSync(path.join(source, "room.webp"), "room");
  const originals = ["/images/uploads/2026-09/cover.webp", "/images/uploads/2026-09/room.webp"];
  const kept = await placeImagesInSlugFolder("events", "", originals);
  assert.deepEqual(kept.images, originals);
  assert.equal(fs.existsSync(path.join(source, "cover.webp")), true);

  const placed = await placeImagesInSlugFolder("events", "saturday-meetup", originals, noReferences);
  assert.deepEqual(placed.images, [
    "/images/uploads/events/saturday-meetup/cover.webp",
    "/images/uploads/events/saturday-meetup/room.webp",
  ]);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/saturday-meetup/cover.webp")), true);
  assert.equal(fs.existsSync(path.join(source, "cover.webp")), false);
  assert.equal(rewriteImagePaths(`![사진](${originals[0]})`, originals, placed.images), "![사진](/images/uploads/events/saturday-meetup/cover.webp)");

  const again = await placeImagesInSlugFolder("events", "saturday-meetup", placed.images, noReferences);
  assert.deepEqual(again.images, placed.images);

  const renamed = await placeImagesInSlugFolder("events", "weekend-meetup", placed.images, noReferences);
  assert.deepEqual(renamed.images, [
    "/images/uploads/events/weekend-meetup/cover.webp",
    "/images/uploads/events/weekend-meetup/room.webp",
  ]);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/saturday-meetup/cover.webp")), false);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/weekend-meetup/room.webp")), true);
});

test("reusing a published picture keeps both posts' image URLs available", async () => {
  const original = path.join(root, "uploads", "events", "first-post", "shared.webp");
  fs.mkdirSync(path.dirname(original), { recursive: true });
  fs.writeFileSync(original, "shared");
  const url = "/images/uploads/events/first-post/shared.webp";

  const placed = await placeImagesInSlugFolder("events", "second-post", [url], new Set([url]));
  assert.deepEqual(placed.images, ["/images/uploads/events/second-post/shared.webp"]);
  assert.equal(fs.existsSync(original), true, "the first post must retain its image");
  assert.equal(fs.existsSync(path.join(root, "uploads/events/second-post/shared.webp")), true);

  await placed.restore();
  assert.equal(fs.existsSync(original), true);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/second-post/shared.webp")), false);
});

test("a reused filename never overwrites an existing post image, including on rollback", async () => {
  const original = path.join(root, "uploads", "events", "first-post", "collision.webp");
  const existing = path.join(root, "uploads", "events", "second-post", "collision.webp");
  fs.mkdirSync(path.dirname(original), { recursive: true });
  fs.mkdirSync(path.dirname(existing), { recursive: true });
  fs.writeFileSync(original, "first");
  fs.writeFileSync(existing, "second");
  const url = "/images/uploads/events/first-post/collision.webp";

  const placed = await placeImagesInSlugFolder("events", "second-post", [url], new Set([url]));
  assert.notEqual(placed.images[0], "/images/uploads/events/second-post/collision.webp");
  assert.equal(fs.readFileSync(existing, "utf8"), "second");
  assert.equal(fs.readFileSync(path.join(root, placed.images[0].slice("/images/".length)), "utf8"), "first");

  await placed.restore();
  assert.equal(fs.readFileSync(existing, "utf8"), "second");
  assert.equal(fs.existsSync(original), true);
});

test("removing a picture deletes the file when nothing else uses it", async () => {
  const folder = path.join(root, "uploads", "events", "photo-drop");
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "gone.webp");
  fs.writeFileSync(file, "gone");
  const publicPath = "/images/uploads/events/photo-drop/gone.webp";
  await deleteUnusedImages([publicPath], new Set([publicPath]));
  assert.equal(fs.existsSync(file), true);
  await deleteUnusedImages([publicPath], new Set());
  assert.equal(fs.existsSync(file), false);
  assert.equal(fs.existsSync(folder), false);
});

test.after(() => fs.rmSync(root, { recursive: true, force: true }));
