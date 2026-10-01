// Saving and deleting a post keeps its pictures in the slug folder and removes the file
// only when nothing else still refers to it.
// TEST_DATABASE_URL=postgresql://localhost/center_test npm run test:content
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { NextRequest } from "next/server";
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
const { createEvent, deleteEvent, listEvents, updateEvent } = await import("../src/server/events/index.ts");
const { deleteNotice, saveNotice } = await import("../src/server/notices/index.ts");
const { referencedImagePaths } = await import("../src/server/events/content-images.ts");
const { publicImage } = await import("../src/server/events/handlers.ts");
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

function imageResponse(url) {
  return publicImage(new NextRequest(`http://127.0.0.1:3100${url}`), {
    params: Promise.resolve({ path: url.slice("/images/".length).split("/") }),
  });
}

after(async () => {
  for (const id of created) {
    await prisma.contentImage.deleteMany({ where: { contentId: id } });
    await prisma.contentSlug.deleteMany({ where: { contentId: id } });
    await prisma.centerEvent.deleteMany({ where: { id } });
  }
  await prisma.product.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.noticeSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.notice.deleteMany({ where: { slug: { startsWith: prefix } } });
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

test("saving a second event with an existing picture preserves both published images", async () => {
  const source = await writeImage(`${prefix}-reused.webp`);
  const first = await createEvent(eventInput(`${prefix}-first`, source));
  created.push(first.id);
  const second = await createEvent(eventInput(`${prefix}-second`, first.images[0]));
  created.push(second.id);
  const firstFile = path.join(uploads, first.images[0].slice("/images/".length));
  const secondFile = path.join(uploads, second.images[0].slice("/images/".length));
  assert.notEqual(first.images[0], second.images[0]);
  assert.equal(fs.existsSync(firstFile), true);
  assert.equal(fs.existsSync(secondFile), true);
  assert.equal((await imageResponse(first.images[0])).status, 200);
  assert.equal((await imageResponse(second.images[0])).status, 200);

  await deleteEvent(first.id, first.revision);
  created.splice(created.indexOf(first.id), 1);
  assert.equal(fs.existsSync(secondFile), true);
  assert.equal((await imageResponse(first.images[0])).status, 404);
  assert.equal((await imageResponse(second.images[0])).status, 200);
  await deleteEvent(second.id, second.revision);
  created.splice(created.indexOf(second.id), 1);
  assert.equal(fs.existsSync(secondFile), false);
});

test("renaming an event removes its unused old URL but keeps its new picture", async () => {
  const source = await writeImage(`${prefix}-rename.webp`);
  const saved = await createEvent(eventInput(`${prefix}-old`, source));
  created.push(saved.id);
  const renamed = await updateEvent(saved.id, eventInput(`${prefix}-new`, saved.images[0]), saved.revision);
  assert.equal(fs.existsSync(path.join(uploads, saved.images[0].slice("/images/".length))), false);
  assert.equal(fs.existsSync(path.join(uploads, renamed.images[0].slice("/images/".length))), true);
  await deleteEvent(renamed.id, renamed.revision);
  created.pop();
});

test("a failed slug edit removes its new copy without deleting the published picture", async () => {
  const source = await writeImage(`${prefix}-rollback.webp`);
  const saved = await createEvent(eventInput(`${prefix}-before`, source));
  created.push(saved.id);
  await assert.rejects(
    updateEvent(saved.id, eventInput(`${prefix}-after`, saved.images[0]), saved.revision + 1),
    { code: "EDIT_CONFLICT" },
  );
  assert.equal(fs.existsSync(path.join(uploads, saved.images[0].slice("/images/".length))), true);
  assert.equal(fs.existsSync(path.join(uploads, `uploads/events/${prefix}-after/${prefix}-rollback.webp`)), false);
  await deleteEvent(saved.id, saved.revision);
  created.pop();
});

test("a post-commit reread failure keeps the committed event image readable", async () => {
  const source = await writeImage(`${prefix}-postcommit.webp`);
  const events = prisma.centerEvent;
  const originalFindUnique = events.findUnique.bind(events);
  let injected = false;
  events.findUnique = async (...args) => {
    if (!injected) {
      injected = true;
      throw new Error("issue40 injected reread failure");
    }
    return originalFindUnique(...args);
  };
  try {
    await assert.rejects(createEvent(eventInput(`${prefix}-postcommit`, source)), /issue40 injected reread failure/);
  } finally {
    events.findUnique = originalFindUnique;
  }

  const alias = await prisma.contentSlug.findUnique({ where: { kind_slug: { kind: "event", slug: `${prefix}-postcommit` } } });
  assert.ok(alias);
  created.push(alias.contentId);
  const row = await prisma.centerEvent.findUnique({ where: { id: alias.contentId } });
  const stored = `/images/uploads/events/${prefix}-postcommit/${prefix}-postcommit.webp`;
  assert.equal(row.image, stored);
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), true);
  const response = await imageResponse(stored);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal((await response.arrayBuffer()).byteLength > 0, true);
});

test("an uncertain transaction outcome keeps already committed event images", async () => {
  const source = await writeImage(`${prefix}-uncertain.webp`);
  const client = globalThis.centerPrisma;
  assert.ok(client);
  const originalTransaction = client.$transaction.bind(client);
  client.$transaction = async (...args) => {
    await originalTransaction(...args);
    throw new Error("issue40 injected uncertain commit outcome");
  };
  try {
    await assert.rejects(createEvent(eventInput(`${prefix}-uncertain`, source)), /issue40 injected uncertain commit outcome/);
  } finally {
    client.$transaction = originalTransaction;
  }

  const alias = await prisma.contentSlug.findUnique({ where: { kind_slug: { kind: "event", slug: `${prefix}-uncertain` } } });
  assert.ok(alias);
  created.push(alias.contentId);
  const row = await prisma.centerEvent.findUnique({ where: { id: alias.contentId } });
  const stored = `/images/uploads/events/${prefix}-uncertain/${prefix}-uncertain.webp`;
  assert.equal(row.image, stored);
  assert.equal(fs.existsSync(path.join(uploads, stored.slice("/images/".length))), true);
});

test("a confirmed database failure restores a newly moved event image", async () => {
  const original = await writeImage(`${prefix}-conflict-original.webp`);
  const saved = await createEvent(eventInput(`${prefix}-conflict`, original));
  created.push(saved.id);
  const source = await writeImage(`${prefix}-conflict-new.webp`);
  await assert.rejects(createEvent(eventInput(`${prefix}-conflict`, source)), { code: "SLUG_CONFLICT" });
  assert.equal(fs.existsSync(path.join(uploads, source.slice("/images/".length))), true);
  assert.equal(fs.existsSync(path.join(uploads, `uploads/events/${prefix}-conflict/${prefix}-conflict-new.webp`)), false);
  await deleteEvent(saved.id, saved.revision);
  created.pop();
});

test("reusing a notice picture keeps the notice URL until the notice is deleted", async () => {
  const source = await writeImage(`${prefix}-notice.webp`);
  const notice = await saveNotice({
    slug: `${prefix}-notice`, title: "공지", titleEn: "Notice",
    description: `![사진](${source})`, descriptionEn: "", is_active: 1, tags: [],
  });
  const event = await createEvent(eventInput(`${prefix}-notice-event`, source));
  created.push(event.id);
  const noticeFile = path.join(uploads, source.slice("/images/".length));
  const eventFile = path.join(uploads, event.images[0].slice("/images/".length));
  assert.equal(fs.existsSync(noticeFile), true);
  assert.equal(fs.existsSync(eventFile), true);
  await deleteNotice(notice.id, notice.revision);
  assert.equal(fs.existsSync(noticeFile), false);
  assert.equal(fs.existsSync(eventFile), true);
  await deleteEvent(event.id, event.revision);
  created.pop();
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
