import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { seoulDate } from "../src/lib/center-status.ts";
import { imagePathSchema } from "../src/lib/events-contract.ts";
import { imageReferences } from "../src/server/events/image-references.ts";
import { legacyVenueType } from "../src/server/events/venue-migration.ts";
import { eventAcceptsTickets } from "../src/server/events/ticket-eligibility.ts";
import { syncEventTicketInTransaction } from "../src/server/events/tickets.ts";
import { BackfillError, comparableRow, contentTables, normalizedRow, serialTables, sqliteTableName } from "./content-backfill-schema.mjs";

const help = `Usage: node --conditions=react-server --import tsx scripts/sqlite-to-pg-content.mjs --source /absolute/events.db --images /absolute/images [--apply | --verify]
Reads DATABASE_URL from the process environment. Default is dry-run. --verify requires an exact PostgreSQL content and generated meetup-ticket mirror.
Use a verified, inactive SQLite backup snapshot. No environment file is loaded by this CLI.
Old admin sessions and login attempts are intentionally excluded; log in again after cutover.
After ticket orders exist, verification requires manual review of the order ledger and current stock.
`;
const options = { source: { type: "string" }, images: { type: "string" }, apply: { type: "boolean" }, verify: { type: "boolean" }, help: { type: "boolean" } };

function safeImage(root, reference) {
  const image = imagePathSchema.parse(reference);
  if (!image || !image.startsWith("/images/")) throw new BackfillError("INVALID_IMAGE_REFERENCE");
  const relative = image.slice("/images/".length);
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new BackfillError("IMAGE_SYMLINK");
  }
  if (!fs.statSync(current).isFile()) throw new BackfillError("IMAGE_MISSING");
}

function readSource(filename, imageRoot) {
  const db = new Database(filename, { readonly: true, fileMustExist: true, timeout: 5000 });
  try {
    if (db.pragma("integrity_check", { simple: true }) !== "ok") throw new BackfillError("SQLITE_INTEGRITY_FAILED");
    return db.transaction(() => {
      const tables = new Map();
      for (const spec of contentTables) {
        const name = sqliteTableName(spec.table);
        const exists = db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(name);
        if (!exists && ["events", "highlights"].includes(name)) throw new BackfillError("CORE_TABLE_MISSING");
        const rows = exists ? db.prepare(`SELECT * FROM "${name}"`).all().map((row) => {
          const legacy = spec.table === "center_events" && !Object.hasOwn(row, "venueType")
            ? { ...row, venueType: legacyVenueType(row.location, row.locationEn) } : row;
          return normalizedRow(spec, legacy);
        }) : spec.table === "review_selection" ? [{ id: 1, revision: 1, featured_id: null, home_ids: "[]" }] : [];
        tables.set(spec.table, rows);
      }
      const references = imageReferences(db);
      for (const reference of references) safeImage(imageRoot, reference);
      const idSet = (table) => new Set(tables.get(table).map(({ id }) => id));
      const ids = { event: idSet("center_events"), highlight: idSet("center_highlights") };
      for (const row of tables.get("content_images")) if (!ids[row.kind]?.has(row.content_id)) throw new BackfillError("ORPHAN_IMAGE");
      for (const row of tables.get("content_slugs")) if (!ids[row.kind]?.has(row.content_id)) throw new BackfillError("ORPHAN_SLUG");
      const noticeIds = idSet("notices");
      for (const row of tables.get("notice_slugs")) if (!noticeIds.has(row.notice_id)) throw new BackfillError("ORPHAN_NOTICE_SLUG");
      const reviewIds = idSet("visit_reviews");
      for (const row of tables.get("review_slugs")) if (!reviewIds.has(row.review_id)) throw new BackfillError("ORPHAN_REVIEW_SLUG");
      for (const row of tables.get("review_selection")) {
        if (row.id !== 1 || (row.featured_id !== null && !reviewIds.has(row.featured_id)) || JSON.parse(row.home_ids).some((id) => !reviewIds.has(id))) throw new BackfillError("INVALID_REVIEW_SELECTION");
      }
      return { tables, imageCount: references.length };
    })();
  } finally { db.close(); }
}

function canonical(spec, rows) {
  return rows.map((row) => JSON.stringify(comparableRow(spec, row))).sort();
}

async function verifyMeetupTickets(tx, source) {
  for (const event of source.tables.get("center_events")) {
    if (event.externalPayment || !event.ticketPriceKrw) continue;
    const product = await tx.product.findUnique({ where: { slug: `meetup-${event.id}` }, include: { variants: true } });
    const variant = product?.variants.find(({ sku }) => sku === `MEETUP-${event.id}`);
    if (!product || !variant) throw new BackfillError("EVENT_TICKET_MISSING");
    const expectedSelling = eventAcceptsTickets(event);
    const eventIsCurrent = event.date.trim().replaceAll(".", "-") >= seoulDate();
    if (product.titleKo !== event.title || product.titleEn !== event.titleEn
      || product.descriptionKo !== event.title || product.descriptionEn !== event.titleEn
      || product.imageUrl !== event.image || product.priceKind !== "KRW_FIXED"
      || product.priceAmount !== BigInt(event.ticketPriceKrw) || product.listPriceAmount !== null
      || product.contentFormat !== "PLAIN" || product.images.length !== 0
      || product.listed || product.memberOnly || product.categoryId !== null
      || JSON.stringify(product.allowedFulfillments) !== '["PICKUP"]'
      || product.variants.length !== 1 || variant.productId !== product.id
      || variant.optionLabelKo || variant.optionLabelEn || variant.billableWeightG !== 0
      || (eventIsCurrent && (product.published !== expectedSelling || variant.active !== expectedSelling))) {
      throw new BackfillError("EVENT_TICKET_CONFIG_CONFLICT");
    }
    // Once orders exist, current stock is a commerce ledger result rather than SQLite source data.
    if (await tx.orderItem.count({ where: { variantId: variant.id } })) throw new BackfillError("EVENT_TICKET_ORDERS_REQUIRE_REVIEW");
    if (variant.stockOnHand !== event.ticketCapacity || variant.reservedStock !== 0) throw new BackfillError("EVENT_TICKET_STOCK_CONFLICT");
  }
}

async function targetState(tx, source) {
  let exact = true;
  let empty = true;
  let pending = 0;
  const counts = {};
  for (const spec of contentTables) {
    const rows = await tx.$queryRawUnsafe(`SELECT * FROM "${spec.table}"`);
    const expected = source.tables.get(spec.table);
    const actual = canonical(spec, rows);
    const wanted = canonical(spec, expected);
    const same = JSON.stringify(actual) === JSON.stringify(wanted);
    exact &&= same;
    counts[spec.table] = { source: expected.length, target: rows.length };
    if (spec.table === "review_selection") {
      const baseline = [{ id: 1, revision: 1, featured_id: null, home_ids: "[]" }];
      if (JSON.stringify(actual) !== JSON.stringify(canonical(spec, baseline))) empty = false;
    } else if (rows.length > 0) empty = false;
    if (!same) pending += expected.length;
  }
  if (exact && !empty) await verifyMeetupTickets(tx, source);
  return { exact, empty, pending, counts };
}

async function insertAll(tx, source) {
  for (const spec of contentTables) {
    const rows = source.tables.get(spec.table);
    if (rows.length === 0) continue;
    if (spec.table === "review_selection") {
      await tx.$executeRawUnsafe('DELETE FROM "review_selection" WHERE "id" = 1');
    }
    const columns = spec.fields.map((field) => `"${field}"`).join(",");
    const parameters = spec.fields.map((_, index) => `$${index + 1}`).join(",");
    const query = `INSERT INTO "${spec.table}" (${columns}) VALUES (${parameters})`;
    for (const row of rows) await tx.$executeRawUnsafe(query, ...spec.fields.map((field) => row[field]));
  }
  for (const event of source.tables.get("center_events")) {
    if (event.externalPayment || !event.ticketPriceKrw) continue;
    const slug = `meetup-${event.id}`;
    if (await tx.product.findUnique({ where: { slug } })) throw new BackfillError("EVENT_PRODUCT_CONFLICT");
    const saved = await tx.centerEvent.findUniqueOrThrow({ where: { id: event.id } });
    await syncEventTicketInTransaction(tx, saved);
  }
  for (const table of serialTables) {
    const rows = source.tables.get(table);
    if (rows.length) await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), $1, true)`, Math.max(...rows.map(({ id }) => id)));
  }
}

async function main() {
  const { values, positionals } = parseArgs({ options, allowPositionals: true, strict: true });
  if (values.help && positionals.length === 0) { process.stdout.write(help); return; }
  if (positionals.length || values.apply && values.verify || process.versions.node.split(".")[0] !== "24") throw new BackfillError("INVALID_ARGUMENTS");
  if (!values.source || !values.images || !path.isAbsolute(values.source) || !path.isAbsolute(values.images) || !process.env.DATABASE_URL) throw new BackfillError("CONFIG_REQUIRED");
  const sourcePath = fs.realpathSync(values.source);
  const imageRoot = fs.realpathSync(values.images);
  if (!fs.statSync(sourcePath).isFile() || !fs.statSync(imageRoot).isDirectory()) throw new BackfillError("INVALID_SOURCE");
  const source = readSource(sourcePath, imageRoot);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 }) });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(20260923, 1)::text AS lock");
      const state = await targetState(tx, source);
      if (!state.exact && !state.empty) throw new BackfillError("POSTGRES_CONTENT_CONFLICT");
      if (values.verify && !state.exact) throw new BackfillError("BACKFILL_INCOMPLETE");
      if (values.apply && !state.exact) {
        await insertAll(tx, source);
        if (!(await targetState(tx, source)).exact) throw new BackfillError("BACKFILL_VERIFY_FAILED");
      }
      return { ...state, applied: !!values.apply && !state.exact };
    }, { isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 });
    process.stdout.write(`${values.verify ? "verify" : values.apply ? "apply" : "dry-run"} complete: ${result.exact ? "identical" : result.applied ? "inserted" : "pending"} rows=${Object.values(result.counts).reduce((sum, count) => sum + count.source, 0)} images=${source.imageCount}\n`);
  } finally { await prisma.$disconnect(); }
}

try { await main(); } catch (error) {
  const code = error instanceof BackfillError ? error.code : "BACKFILL_FAILED";
  process.stderr.write(`Content backfill failed: ${code}. Inspect the isolated source and target; no existing PostgreSQL content was replaced.\n`);
  process.exitCode = 1;
}
