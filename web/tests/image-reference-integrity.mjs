import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import "./helpers/pg-content-env.mjs";

const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-image-reference-"));
process.env.BCS_EVENTS_UPLOADS = uploads;

const { prisma } = await import("../src/server/db.ts");
const { createEvent, createHighlight } = await import("../src/server/events/index.ts");
const { saveNotice, deleteNotice } = await import("../src/server/notices/index.ts");
const { saveCollectionItem } = await import("../src/server/collection/index.ts");
const { saveReview } = await import("../src/server/reviews/index.ts");
const { eventInputSchema, highlightInputSchema } = await import("../src/lib/events-contract.ts");
const { noticeInputSchema } = await import("../src/lib/notices-contract.ts");
const { collectionInputSchema } = await import("../src/lib/collection-contract.ts");
const { reviewInputSchema } = await import("../src/lib/reviews-contract.ts");
const { deleteUnusedImages, imageReferenceLockKeys } = await import("../src/server/events/images.ts");

const prefix = `ir-${randomBytes(4).toString("hex")}`;

function localImage(name) {
  return `/images/uploads/2026-10/${prefix}-${name}.webp`;
}

function imageFile(publicPath) {
  return path.join(uploads, publicPath.slice("/images/".length));
}

function isImageFile(target, publicPath) {
  return target === fs.realpathSync(imageFile(publicPath));
}

function writeImage(name) {
  const publicPath = localImage(name);
  fs.mkdirSync(path.dirname(imageFile(publicPath)), { recursive: true });
  fs.writeFileSync(imageFile(publicPath), "fixture");
  return publicPath;
}

function eventInput(slug, description, images = []) {
  return eventInputSchema.parse({
    venueType: "center", slug, tags: [], title: "밋업", titleEn: "Meetup",
    date: "2099-10-01", time: "19:00", location: "", locationEn: "",
    description, descriptionEn: "Details", image: "", images, link: "",
  });
}

function highlightInput(slug, description, images = []) {
  return highlightInputSchema.parse({
    slug, tags: [], title: "하이라이트", titleEn: "Highlight", meta: "", metaEn: "",
    category: "", categoryEn: "", date: "2099-10-01", startDate: "", endDate: "",
    host: "", hostEn: "", description, descriptionEn: "Details", image: "", link: "",
    icon: "", sort_order: 0, is_active: 1, images,
  });
}

function noticeInput(slug, description) {
  return noticeInputSchema.parse({ slug, tags: [], title: "공지", titleEn: "Notice", description, descriptionEn: "", is_active: 1 });
}

function collectionInput(slug, description, images = []) {
  return collectionInputSchema.parse({ kind: "book", slug, title: "도서", description, images, is_active: 0 });
}

function reviewInput(slug, description, image = "") {
  return reviewInputSchema.parse({
    kind: "blog", url: `https://example.com/${slug}`, author: "Visitor", title: "후기",
    summary: "방문 후기", slug, description, image, is_active: 1,
  });
}

async function rowCounts() {
  const [events, highlights, notices, collection, reviews] = await Promise.all([
    prisma.centerEvent.count({ where: { title: { startsWith: prefix } } }),
    prisma.centerHighlight.count({ where: { title: { startsWith: prefix } } }),
    prisma.notice.count({ where: { slug: { startsWith: prefix } } }),
    prisma.collectionItem.count({ where: { slug: { startsWith: prefix } } }),
    prisma.visitReview.count({ where: { slug: { startsWith: prefix } } }),
  ]);
  return { events, highlights, notices, collection, reviews };
}

async function waitForBlocked(blocker) {
  const deadline = performance.now() + 3000;
  while (performance.now() < deadline) {
    const rows = await prisma.$queryRaw`SELECT pid FROM pg_stat_activity WHERE ${blocker} = ANY(pg_blocking_pids(pid))`;
    if (rows[0]) return rows[0].pid;
  }
  assert.fail("Expected a PostgreSQL lock wait at the registered barrier.");
}

async function installNoticeInsertBarrier(slug, keyA, keyB) {
  const functionName = `block_notice_${prefix.replaceAll("-", "_")}`;
  const triggerName = `trigger_${functionName}`;
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "${functionName}"() RETURNS trigger AS $$
    BEGIN
      IF NEW.slug = '${slug}' THEN
        PERFORM pg_advisory_xact_lock(${keyA}, ${keyB});
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS "${triggerName}" ON notices;
    CREATE TRIGGER "${triggerName}" BEFORE INSERT ON notices FOR EACH ROW EXECUTE FUNCTION "${functionName}"();
  `);
  return { functionName, triggerName };
}

after(async () => {
  await prisma.contentImage.deleteMany({ where: { path: { contains: prefix } } });
  await prisma.contentSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.noticeSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.reviewSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.centerEvent.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.centerHighlight.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.notice.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.collectionItem.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.visitReview.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.$disconnect();
  fs.rmSync(uploads, { recursive: true, force: true });
});

test("body-only local image references are validated for every content writer", async () => {
  // Given: each content kind names a local body image that does not exist.
  const missing = localImage("missing-body");
  const body = `본문 ![missing](${missing})`;
  const before = await rowCounts();
  const cases = [
    ["event", () => createEvent({ ...eventInput(`${prefix}-event-body`, body), title: `${prefix} event` })],
    ["highlight", () => createHighlight({ ...highlightInput(`${prefix}-highlight-body`, body), title: `${prefix} highlight` })],
    ["notice", () => saveNotice(noticeInput(`${prefix}-notice-body`, body))],
    ["collection", () => saveCollectionItem(collectionInput(`${prefix}-collection-body`, body))],
    ["review", () => saveReview(reviewInput(`${prefix}-review-body`, body))],
  ];

  // When / Then: none can commit a row that points at the absent file.
  for (const [kind, save] of cases) {
    await assert.rejects(save, { code: "IMAGE_NOT_FOUND" }, `${kind} should reject missing body-only local image`);
  }
  assert.deepEqual(await rowCounts(), before);
});

test("writer-first body reference prevents a concurrent delete from unlinking the file", async () => {
  // Given: an existing notice owns a local body image, and a second writer reaches a DB barrier before commit.
  const image = writeImage("writer-first");
  const owner = await saveNotice(noticeInput(`${prefix}-writer-owner`, `![owner](${image})`));
  const writerSlug = `${prefix}-writer-new`;
  const barrier = { keyA: 4_204_101, keyB: 4_204_102 };
  const installed = await installNoticeInsertBarrier(writerSlug, barrier.keyA, barrier.keyB);
  const locked = Promise.withResolvers();
  const release = Promise.withResolvers();
  const holder = prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_lock(${barrier.keyA}, ${barrier.keyB})`;
    const [row] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
    locked.resolve(row.pid);
    await release.promise;
    await tx.$executeRaw`SELECT pg_advisory_unlock(${barrier.keyA}, ${barrier.keyB})`;
  }, { timeout: 10000 });

  try {
    const blocker = await locked.promise;
    const writing = saveNotice(noticeInput(writerSlug, `![writer](${image})`));
    const writerPid = await waitForBlocked(blocker);
    const deleting = deleteNotice(owner.id, owner.revision);
    await waitForBlocked(writerPid);

    // When: the writer is allowed to commit and the delete completes.
    release.resolve();
    const saved = await writing;
    await deleting;

    // Then: the committed writer still points to an existing local file.
    assert.equal(saved.description.includes(image), true);
    assert.equal(fs.existsSync(imageFile(image)), true);
  } finally {
    release.resolve();
    await holder;
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${installed.triggerName}" ON notices; DROP FUNCTION IF EXISTS "${installed.functionName}"();`);
  }
});

test("deleter-first unlink makes a concurrent body-only writer reject without a partial row", async () => {
  // Given: delete has reached the exact unlink operation for an image that another writer wants to reuse.
  const image = writeImage("deleter-first");
  const owner = await saveNotice(noticeInput(`${prefix}-deleter-owner`, `![owner](${image})`));
  const originalUnlink = fs.promises.unlink;
  const reachedUnlink = Promise.withResolvers();
  const releaseUnlink = Promise.withResolvers();
  fs.promises.unlink = async (target) => {
    if (isImageFile(target, image)) {
      reachedUnlink.resolve();
      await releaseUnlink.promise;
    }
    return originalUnlink(target);
  };

  try {
    const deleting = deleteNotice(owner.id, owner.revision);
    await reachedUnlink.promise;

    // When: a writer starts after the deleter has won the deletion order.
    const writing = saveNotice(noticeInput(`${prefix}-deleter-new`, `![writer](${image})`));
    releaseUnlink.resolve();

    // Then: the delete succeeds and the writer does not create a broken row.
    await deleting;
    await assert.rejects(writing, { code: "IMAGE_NOT_FOUND" });
    assert.equal(await prisma.notice.count({ where: { slug: `${prefix}-deleter-new` } }), 0);
  } finally {
    releaseUnlink.resolve();
    fs.promises.unlink = originalUnlink;
  }
});

test("unlink failures keep the file and lock acquisition failures surface explicitly", async () => {
  // Given: an unreferenced local image and an unlink operation that fails.
  const image = writeImage("unlink-failure");
  const originalUnlink = fs.promises.unlink;
  fs.promises.unlink = async (target) => {
    if (isImageFile(target, image)) {
      const error = new Error("fixture unlink failure");
      error.code = "EBUSY";
      throw error;
    }
    return originalUnlink(target);
  };
  try {
    // When / Then: cleanup remains best-effort and leaves the file for a later retry.
    await deleteUnusedImages([image]);
    assert.equal(fs.existsSync(imageFile(image)), true);
  } finally {
    fs.promises.unlink = originalUnlink;
  }

  // Given: the shared image-reference lock is unavailable within the configured bounded wait.
  const previousTimeout = process.env.BCS_IMAGE_REFERENCE_LOCK_TIMEOUT_MS;
  process.env.BCS_IMAGE_REFERENCE_LOCK_TIMEOUT_MS = "1";
  const locked = Promise.withResolvers();
  const release = Promise.withResolvers();
  const holder = prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_lock(${imageReferenceLockKeys.namespace}, ${imageReferenceLockKeys.id})`;
    locked.resolve();
    await release.promise;
    await tx.$executeRaw`SELECT pg_advisory_unlock(${imageReferenceLockKeys.namespace}, ${imageReferenceLockKeys.id})`;
  }, { timeout: 10000 });
  try {
    await locked.promise;
    await assert.rejects(deleteUnusedImages([image]), { code: "IMAGE_REFERENCE_LOCK_UNAVAILABLE" });
  } finally {
    if (previousTimeout === undefined) delete process.env.BCS_IMAGE_REFERENCE_LOCK_TIMEOUT_MS;
    else process.env.BCS_IMAGE_REFERENCE_LOCK_TIMEOUT_MS = previousTimeout;
    release.resolve();
    await holder;
  }
});
