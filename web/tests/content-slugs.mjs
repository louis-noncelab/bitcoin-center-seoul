import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import "./helpers/pg-content-env.mjs";

const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-content-slugs-"));
process.env.BCS_EVENTS_UPLOADS = uploads;
const { prisma } = await import("../src/server/db.ts");
const events = await import("../src/server/events/index.ts");
const notices = await import("../src/server/notices/index.ts");
const reviews = await import("../src/server/reviews/index.ts");
const { eventInputSchema, highlightInputSchema } = await import("../src/lib/events-contract.ts");
const { noticeInputSchema } = await import("../src/lib/notices-contract.ts");
const { reviewInputSchema } = await import("../src/lib/reviews-contract.ts");
const prefix = `slug${randomBytes(4).toString("hex")}`;

const domains = [
  {
    kind: "event", model: "centerEvent", alias: "contentSlug",
    input: (slug, title) => eventInputSchema.parse({
      slug, title, titleEn: title, venueType: "center", tags: [], date: "2026-10-03",
      time: "", location: "", locationEn: "", description: "Fixture", descriptionEn: "Fixture",
      image: "", images: [], link: "",
    }),
    save: (input, row) => row ? events.updateEvent(row.id, input, row.revision) : events.createEvent(input),
    get: events.getEvent, byPath: events.getEventByPath,
    owner: async (slug) => (await prisma.contentSlug.findUnique({ where: { kind_slug: { kind: "event", slug } } }))?.contentId,
  },
  {
    kind: "highlight", model: "centerHighlight", alias: "contentSlug",
    input: (slug, title) => highlightInputSchema.parse({
      slug, title, titleEn: title, tags: [], meta: "", metaEn: "", category: "", categoryEn: "",
      date: "2026-10-03", startDate: "", endDate: "", host: "", hostEn: "",
      description: "Fixture", descriptionEn: "Fixture", image: "", images: [], link: "",
      icon: "", sort_order: 0, is_active: 1,
    }),
    save: (input, row) => row ? events.updateHighlight(row.id, input, row.revision) : events.createHighlight(input),
    get: (id) => events.getHighlight(id, { includeInactive: true }), byPath: events.getHighlightByPath,
    owner: async (slug) => (await prisma.contentSlug.findUnique({ where: { kind_slug: { kind: "highlight", slug } } }))?.contentId,
  },
  {
    kind: "notice", model: "notice", alias: "noticeSlug",
    input: (slug, title) => noticeInputSchema.parse({ slug, title, description: "Fixture", tags: [], is_active: 1 }),
    save: (input, row) => notices.saveNotice(input, row?.id, row?.revision),
    get: (id) => notices.getNotice(id, true), byPath: notices.noticeBySlug,
    owner: async (slug) => (await prisma.noticeSlug.findUnique({ where: { slug } }))?.noticeId,
  },
  {
    kind: "review", model: "visitReview", alias: "reviewSlug",
    input: (slug, title) => reviewInputSchema.parse({
      slug, title, kind: "blog", url: "https://example.com/fixture", author: "Fixture",
      summary: "Fixture", description: "Fixture", is_active: 1,
    }),
    save: (input, row) => reviews.saveReview(input, row?.id, row?.revision),
    get: reviews.getReview, byPath: reviews.reviewBySlug,
    owner: async (slug) => (await prisma.reviewSlug.findUnique({ where: { slug } }))?.reviewId,
  },
];

after(async () => {
  await prisma.contentSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.noticeSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.reviewSlug.deleteMany({ where: { slug: { startsWith: prefix } } });
  for (const domain of domains) await prisma[domain.model].deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.$disconnect();
  fs.rmSync(uploads, { recursive: true, force: true });
});

async function competingSaves(domain, operations) {
  await prisma.$queryRaw`SELECT 1`;
  const client = globalThis.centerPrisma;
  const original = client.$transaction;
  const barrier = Promise.withResolvers();
  const signal = AbortSignal.timeout(5000);
  const abort = () => barrier.reject(new Error("Both real save transactions must reach the write barrier."));
  signal.addEventListener("abort", abort, { once: true });
  const ownerReads = [];
  let arrivals = 0;
  client.$transaction = (callback, options) => original.call(client, async (tx) => {
    let arrived = false;
    const wrapped = new Proxy(tx, {
      get(target, property) {
        const value = Reflect.get(target, property);
        if (property !== domain.alias && property !== domain.model) return typeof value === "function" ? value.bind(target) : value;
        return new Proxy(value, {
          get(delegate, operation) {
            const method = Reflect.get(delegate, operation);
            if (typeof method !== "function") return method;
            return async (...args) => {
              // Events have no current-slug column constraint; synchronize their first alias write.
              // Notices/reviews are synchronized before the real content create/update.
              const write = domain.alias === "contentSlug"
                ? property === domain.alias && ["updateMany", "createMany", "upsert"].includes(operation)
                : property === domain.model && ["create", "update"].includes(operation);
              if (write && !arrived) {
                arrived = true;
                if (++arrivals === 2) barrier.resolve();
                await barrier.promise;
              }
              const result = await Reflect.apply(method, delegate, args);
              if (property === domain.alias && operation === "findUnique") ownerReads.push(result);
              return result;
            };
          },
        });
      },
    });
    return callback(wrapped);
  }, options);
  try {
    return { results: await Promise.allSettled(operations.map((operation) => operation())), ownerReads };
  } finally {
    barrier.resolve();
    signal.removeEventListener("abort", abort);
    client.$transaction = original;
  }
}

for (const domain of domains) {
  test(`${domain.kind}: concurrent creates cannot claim the same slug twice`, { timeout: 15000 }, async (context) => {
    // Given: a fresh address and two actual service transactions paused before their writes.
    const slug = `${prefix}-${domain.kind}-race`;
    const inputs = ["a", "b"].map((name) => domain.input(slug, `${prefix}-${name}`));
    // When: both requests attempt to save different content at the same address.
    const { results, ownerReads } = await competingSaves(domain, inputs.map((input) => () => domain.save(input)));
    const owner = await domain.owner(slug);
    context.diagnostic(JSON.stringify({
      ownerReads, owner,
      results: results.map((result) => result.status === "fulfilled"
        ? { status: result.status, id: result.value.id }
        : { status: result.status, code: result.reason.code, httpStatus: result.reason.status, meta: result.reason.meta }),
    }));
    // Then: only the winner commits; the loser receives an address conflict.
    const saved = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(saved.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.status, 409);
    assert.equal(rejected[0].reason.code, "SLUG_CONFLICT");
    assert.equal(owner, saved[0].value.id);
    assert.equal((await domain.byPath(slug)).id, owner);
    assert.equal(await prisma[domain.model].count({ where: { title: { in: inputs.map((input) => input.title) } } }), 1);
  });

  test(`${domain.kind}: a losing slug edit rolls back content and revision`, { timeout: 15000 }, async () => {
    // Given: two existing posts, each owning its current address.
    const oldSlugs = ["left", "right"].map((name) => `${prefix}-${domain.kind}-${name}`);
    const previous = await Promise.all(oldSlugs.map((slug) => domain.save(domain.input(slug, slug))));
    const slug = `${prefix}-${domain.kind}-edit-race`;
    // When: both try to move to the same fresh address.
    const { results } = await competingSaves(domain, previous.map((row) =>
      () => domain.save(domain.input(slug, `${row.title}-edited`), row)));
    // Then: one edit commits; the losing post and both historical owners remain intact.
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const loser = results.findIndex((result) => result.status === "rejected");
    assert.ok(loser >= 0);
    assert.equal(results[loser].reason.status, 409);
    assert.equal(results[loser].reason.code, "SLUG_CONFLICT");
    const unchanged = await domain.get(previous[loser].id);
    assert.equal(unchanged.slug, previous[loser].slug);
    assert.equal(unchanged.title, previous[loser].title);
    assert.equal(unchanged.revision, previous[loser].revision);
    const winner = results.find((result) => result.status === "fulfilled").value;
    assert.equal(await domain.owner(slug), winner.id);
    assert.equal(winner.revision, previous[1 - loser].revision + 1);
    for (let index = 0; index < previous.length; index++) {
      assert.equal(await domain.owner(oldSlugs[index]), previous[index].id);
      assert.equal((await domain.byPath(oldSlugs[index])).id, previous[index].id);
    }
  });

  test(`${domain.kind}: current and historical addresses stay with their original post`, async () => {
    // Given: a post whose address has changed.
    const oldSlug = `${prefix}-${domain.kind}-old`;
    const newSlug = `${prefix}-${domain.kind}-new`;
    const saved = await domain.save(domain.input(oldSlug, oldSlug));
    const moved = await domain.save(domain.input(newSlug, newSlug), saved);
    // When: other posts try either address, and the owner returns to its old address.
    for (const slug of [oldSlug, newSlug]) {
      await assert.rejects(domain.save(domain.input(slug, `${prefix}-conflicting`)), { status: 409, code: "SLUG_CONFLICT" });
    }
    const restored = await domain.save(domain.input(oldSlug, oldSlug), moved);
    // Then: aliases still resolve to the same post and its latest canonical address.
    for (const slug of [oldSlug, newSlug]) {
      assert.equal(await domain.owner(slug), saved.id);
      const resolved = await domain.byPath(slug);
      assert.equal(resolved.id, saved.id);
      assert.equal(resolved.slug, restored.slug);
    }
  });

  test(`${domain.kind}: stale revisions cannot reserve a new address`, async () => {
    // Given: a newer saved version of a post.
    const slug = `${prefix}-${domain.kind}-revision`;
    const saved = await domain.save(domain.input(slug, slug));
    const newer = await domain.save(domain.input(slug, `${slug}-newer`), saved);
    const attempted = `${slug}-stale`;
    // When: an old draft tries to change its address.
    await assert.rejects(domain.save(domain.input(attempted, attempted), saved), { status: 409, code: "EDIT_CONFLICT" });
    // Then: the new address was not claimed and the newer content/revision survives.
    assert.equal(await domain.owner(attempted), undefined);
    const current = await domain.get(saved.id);
    assert.equal(current.title, newer.title);
    assert.equal(current.slug, newer.slug);
    assert.equal(current.revision, newer.revision);
  });
}

for (const domain of domains.filter((item) => item.alias === "contentSlug")) {
  test(`${domain.kind}: clearing an optional slug keeps the old address owner`, async () => {
    // Given: a post with an optional address.
    const slug = `${prefix}-${domain.kind}-clear`;
    const saved = await domain.save(domain.input(slug, slug));
    // When: the owner switches back to an ID-based address.
    const cleared = await domain.save(domain.input("", slug), saved);
    // Then: the old alias cannot be reassigned and there is no current slug.
    assert.equal(cleared.slug, "");
    assert.equal(await domain.owner(slug), saved.id);
    assert.equal((await domain.byPath(slug)).id, saved.id);
    assert.equal(await prisma.contentSlug.count({ where: { kind: domain.kind, contentId: saved.id, isCurrent: true } }), 0);
    await assert.rejects(domain.save(domain.input(slug, `${prefix}-conflicting`)), { status: 409, code: "SLUG_CONFLICT" });
  });
}

test("event and highlight slug namespaces remain independent", async () => {
  // Given: two different content types using one readable address.
  const slug = `${prefix}-separate-kinds`;
  // When: each creates its own post.
  const saved = await Promise.all(domains.slice(0, 2).map((domain) => domain.save(domain.input(slug, slug))));
  // Then: each type resolves the address to its own post.
  for (let index = 0; index < saved.length; index++) {
    assert.equal(await domains[index].owner(slug), saved[index].id);
    assert.equal((await domains[index].byPath(slug)).id, saved[index].id);
  }
});
