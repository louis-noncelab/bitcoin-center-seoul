// Saving and deleting a post keeps its pictures in the slug folder and removes the file
// only when nothing else still refers to it.
// TEST_DATABASE_URL=postgresql://localhost/center_test npm run test:content
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import sharp from "sharp";

process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_DIR = "/tmp";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYMENT_PROVIDER = "zaprite";
process.env.PAYMENT_MODE = "review";
process.env.EMAIL_MODE = "capture";
process.env.TRUST_PROXY = "false";
process.env.REVIEW_KRW_PER_BTC = "150000000";
process.env.ZAPRITE_API_KEY = "test-key";
process.env.ZAPRITE_WEBHOOK_SECRET = "test-secret";
process.env.ZAPRITE_ORG_ID = "org_test";
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-content-records-"));
process.env.BCS_EVENTS_UPLOADS = uploads;

const { prisma } = await import("../src/server/db.ts");
const { createEvent, deleteEvent, listEvents } = await import("../src/server/events/index.ts");
const { referencedImagePaths } = await import("../src/server/events/content-images.ts");
const { GET } = await import("../src/app/og/[kind]/[id]/route.ts");

const prefix = `img${randomBytes(4).toString("hex")}`;
const created = [];

async function writeImage(name) {
  const directory = path.join(uploads, "uploads", "2026-09");
  fs.mkdirSync(directory, { recursive: true });
  await sharp({ create: { width: 32, height: 32, channels: 3, background: "#2458a8" } }).webp().toFile(path.join(directory, name));
  return `/images/uploads/2026-09/${name}`;
}

function eventInput(slug, image) {
  return {
    venueType: "center", slug, tags: [], title: "밋업", titleEn: "Meetup", date: "2026-10-03", time: "19:00",
    location: "", locationEn: "", description: `안내 ![사진](${image})`, descriptionEn: "Details",
    image, link: "", images: [image],
  };
}

after(async () => {
  for (const id of created) {
    await prisma.contentImage.deleteMany({ where: { contentId: id } });
    await prisma.contentSlug.deleteMany({ where: { contentId: id } });
    await prisma.centerEvent.deleteMany({ where: { id } });
  }
  await prisma.product.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.$disconnect();
  fs.rmSync(uploads, { recursive: true, force: true });
});

test("saving an event stores the picture under its slug and deleting it removes the file", async () => {
  const source = await writeImage(`${prefix}-cover.webp`);
  const saved = await createEvent(eventInput(`${prefix}-meetup`, source));
  created.push(saved.id);
  const stored = `/images/uploads/events/${prefix}-meetup/${prefix}-cover.webp`;
  assert.equal(saved.images[0], stored);
  assert.equal(saved.description.includes(stored), true);
  assert.equal(fs.existsSync(path.join(uploads, "uploads", "2026-09", `${prefix}-cover.webp`)), false);
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), true);
  assert.equal((await listEvents()).some((event) => event.id === saved.id && event.slug === `${prefix}-meetup`), true);

  const card = await GET(new Request("http://127.0.0.1/og"), { params: Promise.resolve({ kind: "programs", id: `${prefix}-meetup` }) });
  assert.equal(card.status, 200);
  assert.equal(card.headers.get("content-type"), "image/jpeg");
  const bytes = Buffer.from(await card.arrayBuffer());
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.equal((await GET(new Request("http://127.0.0.1/og"), { params: Promise.resolve({ kind: "programs", id: `${prefix}-missing` }) })).status, 404);
  assert.equal((await GET(new Request("http://127.0.0.1/og"), { params: Promise.resolve({ kind: "nope", id: `${prefix}-meetup` }) })).status, 404);

  await deleteEvent(saved.id, saved.revision);
  created.pop();
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), false);
});

test("a product that still uses a picture keeps the file when the event is deleted", async () => {
  const source = await writeImage(`${prefix}-shared.webp`);
  const saved = await createEvent(eventInput(`${prefix}-shared`, source));
  created.push(saved.id);
  const stored = saved.images[0];
  const product = await prisma.product.create({
    data: {
      slug: `${prefix}-product`, titleKo: "상품", titleEn: "Product", descriptionKo: `![사진](${stored})`, descriptionEn: "",
      published: true, priceKind: "KRW_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"], contentFormat: "MARKDOWN", imageUrl: stored, images: [stored],
    },
  });
  const referenced = await referencedImagePaths(false);
  assert.equal(referenced.includes(stored), true);
  await deleteEvent(saved.id, saved.revision);
  created.pop();
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), true);
  await prisma.product.delete({ where: { id: product.id } });
  const { deleteUnusedImages } = await import("../src/server/events/images.ts");
  await deleteUnusedImages([stored]);
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), false);
});
