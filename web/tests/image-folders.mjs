import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-image-folders-"));
process.env.BCS_EVENTS_UPLOADS = root;
const { placeImagesInSlugFolder, rewriteImagePaths } = await import("../src/server/events/images.ts");

test("a slug collects attached images into that post's folder", async () => {
  const source = path.join(root, "uploads", "2026-09");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "cover.webp"), "cover");
  fs.writeFileSync(path.join(source, "room.webp"), "room");
  const originals = ["/images/uploads/2026-09/cover.webp", "/images/uploads/2026-09/room.webp"];
  const kept = await placeImagesInSlugFolder("events", "", originals);
  assert.deepEqual(kept.images, originals);
  assert.equal(fs.existsSync(path.join(source, "cover.webp")), true);

  const placed = await placeImagesInSlugFolder("events", "saturday-meetup", originals);
  assert.deepEqual(placed.images, [
    "/images/uploads/events/saturday-meetup/cover.webp",
    "/images/uploads/events/saturday-meetup/room.webp",
  ]);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/saturday-meetup/cover.webp")), true);
  assert.equal(fs.existsSync(path.join(source, "cover.webp")), false);
  assert.equal(rewriteImagePaths(`![사진](${originals[0]})`, originals, placed.images), "![사진](/images/uploads/events/saturday-meetup/cover.webp)");

  const again = await placeImagesInSlugFolder("events", "saturday-meetup", placed.images);
  assert.deepEqual(again.images, placed.images);

  const renamed = await placeImagesInSlugFolder("events", "weekend-meetup", placed.images);
  assert.deepEqual(renamed.images, [
    "/images/uploads/events/weekend-meetup/cover.webp",
    "/images/uploads/events/weekend-meetup/room.webp",
  ]);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/saturday-meetup/cover.webp")), false);
  assert.equal(fs.existsSync(path.join(root, "uploads/events/weekend-meetup/room.webp")), true);
});

test.after(() => fs.rmSync(root, { recursive: true, force: true }));
