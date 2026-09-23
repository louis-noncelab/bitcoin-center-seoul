import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { openDatabase } from "../src/server/events/db.ts";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const databaseUrl = process.env.TEST_DATABASE_URL;
const parsedUrl = databaseUrl ? new URL(databaseUrl) : null;
const databaseName = parsedUrl?.pathname.slice(1) ?? "";
if (!parsedUrl || !["postgres:", "postgresql:"].includes(parsedUrl.protocol)
  || !["127.0.0.1", "localhost", "[::1]"].includes(parsedUrl.hostname)
  || !/(^|[_-])(test|fix|audit)([_-]|$)/.test(databaseName)) {
  throw new Error("TEST_DATABASE_URL must name an explicit, disposable loopback test/fix/audit PostgreSQL database");
}
const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }) });
const tables = ["center_events", "center_highlights", "content_images", "content_slugs", "notices", "notice_slugs", "collection_items", "visit_reviews", "review_slugs", "review_selection", "center_opening_overrides"];
async function reset() {
  const testOrders = await client.order.findMany({ where: { idempotencyScope: "backfill-test" }, select: { id: true, quoteId: true } });
  if (testOrders.length) {
    await client.orderItem.deleteMany({ where: { orderId: { in: testOrders.map(({ id }) => id) } } });
    await client.order.deleteMany({ where: { id: { in: testOrders.map(({ id }) => id) } } });
    await client.quote.deleteMany({ where: { id: { in: testOrders.map(({ quoteId }) => quoteId) } } });
  }
  await client.productVariant.deleteMany({ where: { sku: "MEETUP-12" } });
  await client.product.deleteMany({ where: { slug: "meetup-12" } });
  await client.$executeRawUnsafe(`TRUNCATE ${tables.map((name) => `"${name}"`).join(", ")} RESTART IDENTITY`);
  await client.$executeRawUnsafe('INSERT INTO "review_selection" ("id","revision","featured_id","home_ids") VALUES (1,1,NULL,\'[]\')');
}
function run(source, images, ...args) {
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/sqlite-to-pg-content.mjs", "--source", source, "--images", images, ...args], {
    cwd: webRoot, encoding: "utf8", timeout: 30_000, env: { PATH: process.env.PATH, DATABASE_URL: databaseUrl },
  });
}

test("backfills a SQLite snapshot once, verifies it, and refuses PG drift", async (t) => {
  // Given: a private SQLite snapshot and isolated, migrated PostgreSQL database.
  await reset();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-backfill-"));
  const source = path.join(root, "events.db");
  const images = path.join(root, "images");
  fs.mkdirSync(path.join(images, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(images, "uploads/fixture.webp"), "fixture");
  const image = "/images/uploads/fixture.webp";
  const sqlite = openDatabase(source);
  t.after(async () => { sqlite.close(); await reset(); await client.$disconnect(); fs.rmSync(root, { recursive: true, force: true }); });
  sqlite.prepare("INSERT INTO events (id,title,titleEn,date,time,location,locationEn,description,descriptionEn,image,venueType,tags,revision) VALUES (7,'행사','Event','2026-10-01','13:00','센터','Center','본문','Body',?,'center','[\"bitcoin\"]',3)").run(image);
  sqlite.prepare("INSERT INTO events (id,title,titleEn,date,time,location,locationEn,description,descriptionEn,venueType,ticketPriceKrw,ticketCapacity,externalPayment) VALUES (12,'유료 밋업','Paid meetup','2099-10-01','13:00','센터','Center','본문','Body','center','1000',10,0)").run();
  sqlite.prepare("INSERT INTO highlights (id,title,titleEn,meta,metaEn,description,descriptionEn,image,date,tags,revision) VALUES (8,'기록','Journal','메타','Meta','본문','Body',?,'2026-10-01','[\"photo\"]',2)").run(image);
  sqlite.prepare("INSERT INTO content_images VALUES ('event',7,0,?)").run(image);
  sqlite.prepare("INSERT INTO content_slugs VALUES ('event','event-seven',7,1)").run();
  sqlite.prepare("INSERT INTO notices (id,slug,title,description,tags,revision) VALUES (9,'notice-nine','공지','본문','[\"notice\"]',4)").run();
  sqlite.prepare("INSERT INTO notice_slugs VALUES ('notice-nine',9)").run();
  sqlite.prepare("INSERT INTO collection_items (id,kind,slug,title,images) VALUES (10,'book','book-ten','책',?)").run(JSON.stringify([image]));
  sqlite.prepare("INSERT INTO visit_reviews (id,kind,url,author,title,summary,slug,description,image,revision) VALUES (11,'blog','https://example.com/review','Writer','후기','요약','review-eleven','본문',?,5)").run(image);
  sqlite.prepare("INSERT INTO review_slugs VALUES ('review-eleven',11)").run();
  sqlite.prepare("UPDATE review_selection SET featured_id=11,home_ids='[11]',revision=2 WHERE id=1").run();
  sqlite.prepare("INSERT INTO center_opening_overrides VALUES ('2026-10-01','closed')").run();
  sqlite.prepare("INSERT INTO admin_sessions (token_hash,expires_at) VALUES ('old-session-must-not-migrate',999999999999)").run();

  // When: dry-run, apply, verification and idempotent re-apply execute through the CLI.
  const dry = run(source, images); assert.equal(dry.status, 0, dry.stderr);
  assert.equal(run(source, images, "--verify").status, 1);
  const imageFile = path.join(images, "uploads/fixture.webp");
  fs.renameSync(imageFile, `${imageFile}.held`);
  assert.equal(run(source, images).status, 1);
  fs.renameSync(`${imageFile}.held`, imageFile);
  await client.product.create({ data: {
    slug: "meetup-12", titleKo: "Existing", titleEn: "Existing", descriptionKo: "Existing", descriptionEn: "Existing",
    priceKind: "KRW_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
  } });
  const productConflict = run(source, images, "--apply");
  assert.equal(productConflict.status, 1);
  assert.match(productConflict.stderr, /EVENT_PRODUCT_CONFLICT/);
  assert.equal(await client.centerEvent.count(), 0);
  await client.product.delete({ where: { slug: "meetup-12" } });
  const applied = run(source, images, "--apply");
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(run(source, images, "--verify").status, 0);
  assert.equal(run(source, images, "--apply").status, 0);

  // Then: content metadata is preserved, sessions excluded, and a changed PG row is protected.
  const event = await client.centerEvent.findUniqueOrThrow({ where: { id: 7 } });
  assert.equal(event.revision, 3);
  assert.equal(event.tags, '["bitcoin"]');
  assert.equal(event.image, image);
  assert.equal((await client.contentSlug.findUniqueOrThrow({ where: { kind_slug: { kind: "event", slug: "event-seven" } } })).contentId, 7);
  assert.equal((await client.reviewSelection.findUniqueOrThrow({ where: { id: 1 } })).featuredId, 11);
  assert.equal((await client.centerOpeningOverride.findUniqueOrThrow({ where: { date: "2026-10-01" } })).status, "closed");
  assert.equal(await client.adminSession.count(), 0);
  const ticket = await client.product.findUniqueOrThrow({ where: { slug: "meetup-12" }, include: { variants: true } });
  assert.equal(ticket.priceAmount, 1000n);
  assert.equal(ticket.variants[0]?.stockOnHand, 10);
  await client.product.update({ where: { id: ticket.id }, data: { priceAmount: 2000n } });
  const priceDrift = run(source, images, "--verify");
  assert.equal(priceDrift.status, 1);
  assert.match(priceDrift.stderr, /EVENT_TICKET_CONFIG_CONFLICT/);
  assert.equal(run(source, images, "--apply").status, 1);
  await client.product.update({ where: { id: ticket.id }, data: { priceAmount: 1000n } });
  await client.productVariant.delete({ where: { id: ticket.variants[0].id } });
  const missingTicket = run(source, images, "--verify");
  assert.equal(missingTicket.status, 1);
  assert.match(missingTicket.stderr, /EVENT_TICKET_MISSING/);
  await client.productVariant.create({ data: {
    productId: ticket.id, sku: "MEETUP-12", stockOnHand: 10, billableWeightG: 0, active: true,
  } });
  assert.equal(run(source, images, "--verify").status, 0);
  const restoredVariant = await client.productVariant.findUniqueOrThrow({ where: { sku: "MEETUP-12" } });
  await client.productVariant.update({ where: { id: restoredVariant.id }, data: { stockOnHand: 9 } });
  const stockDrift = run(source, images, "--verify");
  assert.equal(stockDrift.status, 1);
  assert.match(stockDrift.stderr, /EVENT_TICKET_STOCK_CONFLICT/);
  await client.productVariant.update({ where: { id: restoredVariant.id }, data: { stockOnHand: 10 } });
  const quote = await client.quote.create({ data: { input: {}, snapshot: {}, amountSats: 1n, expiresAt: new Date("2099-01-01") } });
  const order = await client.order.create({ data: {
    quoteId: quote.id, customerName: "Fixture", customerEmail: "fixture@example.invalid", amountSats: 1n,
    fulfillment: "PICKUP", shippingSnapshot: {}, idempotencyScope: "backfill-test", idempotencyKey: "ticket-order",
    requestHash: "fixture", accessTokenHash: "fixture-backfill-token",
    items: { create: { variantId: restoredVariant.id, quantity: 1, sku: "MEETUP-12", titleKo: "유료 밋업",
      titleEn: "Paid meetup", optionLabelKo: "", optionLabelEn: "", priceKind: "KRW_FIXED",
      unitPriceAmount: 1000n, amountSats: 1n, snapshot: {} } },
  } });
  await client.productVariant.update({ where: { id: restoredVariant.id }, data: { stockOnHand: 9 } });
  const soldTicket = run(source, images, "--verify");
  assert.equal(soldTicket.status, 1);
  assert.match(soldTicket.stderr, /EVENT_TICKET_ORDERS_REQUIRE_REVIEW/);
  assert.match(run(source, images, "--apply").stderr, /EVENT_TICKET_ORDERS_REQUIRE_REVIEW/);
  await client.orderItem.deleteMany({ where: { orderId: order.id } });
  await client.order.delete({ where: { id: order.id } });
  await client.quote.delete({ where: { id: quote.id } });
  await client.productVariant.update({ where: { id: restoredVariant.id }, data: { stockOnHand: 10 } });
  await client.centerEvent.update({ where: { id: 7 }, data: { title: "PG edit" } });
  const conflict = run(source, images, "--apply");
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /POSTGRES_CONTENT_CONFLICT/);
  assert.equal((await client.centerEvent.findUniqueOrThrow({ where: { id: 7 } })).title, "PG edit");
});

test("archives uploads without a SQLite database and detects restore tampering", (t) => {
  // Given: a private upload root including an unpublished image.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-images-only-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const images = path.join(root, "images");
  const archive = path.join(root, "archive");
  fs.mkdirSync(path.join(images, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(images, "uploads/unpublished.webp"), "private-image");
  const backup = (...args) => spawnSync(process.execPath, ["--import", "tsx", "scripts/events-backup.ts", ...args], {
    cwd: webRoot, encoding: "utf8", env: { PATH: process.env.PATH },
  });
  // When: the image-only archive is created and drilled.
  const saved = backup("backup-images", "--images", images, "--output", archive);
  assert.equal(saved.status, 0, saved.stderr);
  assert.match(saved.stdout, /PostgreSQL excluded/);
  assert.equal(backup("restore-check", "--backup", archive).status, 0);
  // Then: byte corruption fails the same restore check.
  fs.writeFileSync(path.join(archive, "images/uploads/unpublished.webp"), "tampered");
  assert.equal(backup("restore-check", "--backup", archive).status, 1);
});
