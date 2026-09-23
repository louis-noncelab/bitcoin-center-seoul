import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { eventInputSchema, highlightInputSchema } from "../src/lib/events-contract.ts";
import { noticeInputSchema } from "../src/lib/notices-contract.ts";
import { getDatabase, openDatabase } from "../src/server/events/db.ts";
import { createPasswordHash } from "../src/server/events/password.ts";
import { login } from "../src/server/events/auth.ts";
import {
  adminEventsPost, adminEventPut, adminEventDelete, publicEvent,
  adminHighlightsPost, adminHighlightPut, adminHighlightDelete, publicHighlight,
} from "../src/server/events/handlers.ts";
import { adminNoticesPost, adminNoticePut, adminNoticeDelete, publicNotice } from "../src/server/notices/handlers.ts";
import "./helpers/pg-content-env.mjs";

const event = {
  slug: "tag-event", title: "태그 행사", titleEn: "Tag event", date: "2026-09-10", time: "19:00",
  venueType: "external", location: "서울", locationEn: "Seoul", description: "행사 본문", descriptionEn: "Event body", image: "", images: [], link: "",
};
const highlight = {
  slug: "tag-highlight", title: "태그 기록", titleEn: "Tag record", date: "2026-09-10", startDate: "", endDate: "",
  meta: "", metaEn: "", category: "행사", categoryEn: "Event", host: "센터", hostEn: "Center",
  description: "기록 본문", descriptionEn: "Record body", image: "", images: [], link: "", icon: "calendar", sort_order: 0, is_active: 1,
};
const notice = { slug: "tag-notice", title: "태그 공지", titleEn: "", description: "공지 본문", descriptionEn: "", is_active: 1 };
const cases = [
  { name: "events", input: event, schema: eventInputSchema, create: adminEventsPost, update: adminEventPut, remove: adminEventDelete, read: publicEvent },
  { name: "highlights", input: highlight, schema: highlightInputSchema, create: adminHighlightsPost, update: adminHighlightPut, remove: adminHighlightDelete, read: publicHighlight },
  { name: "notices", input: notice, schema: noticeInputSchema, create: adminNoticesPost, update: adminNoticePut, remove: adminNoticeDelete, read: publicNotice },
];
const directory = mkdtempSync(join(tmpdir(), "bcs-content-tags-"));
const origin = "http://127.0.0.1:3102";
let session;
const { prisma } = await import("../src/server/db.ts");

function request(method, pathname, body, revision) {
  return new NextRequest(`${origin}${pathname}`, {
    method,
    headers: { origin, cookie: `bcs_admin_session=${session}`, "content-type": "application/json", ...(revision === undefined ? {} : { "If-Match": `"${revision}"` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

before(async () => {
  process.env.BCS_EVENTS_DB = join(directory, "events.db");
  process.env.BCS_EVENTS_UPLOADS = join(directory, "images");
  process.env.APP_ORIGIN = origin;
  delete process.env.ADMIN_PASSWORD;
  const legacy = new Database(process.env.BCS_EVENTS_DB);
  legacy.exec(`
    CREATE TABLE events (
      id INTEGER PRIMARY KEY, title TEXT, titleEn TEXT, date TEXT, time TEXT, location TEXT, locationEn TEXT,
      description TEXT, descriptionEn TEXT, image TEXT, link TEXT, created_at TEXT DEFAULT '2026-09-01', updated_at TEXT DEFAULT '2026-09-01'
    );
    CREATE TABLE highlights (
      id INTEGER PRIMARY KEY, title TEXT, titleEn TEXT, meta TEXT, metaEn TEXT, description TEXT, descriptionEn TEXT,
      category TEXT, categoryEn TEXT, date TEXT, startDate TEXT, endDate TEXT, host TEXT, hostEn TEXT, image TEXT,
      link TEXT, icon TEXT, sort_order INTEGER, is_active INTEGER,
      created_at TEXT DEFAULT '2026-09-01', updated_at TEXT DEFAULT '2026-09-01'
    );
    CREATE TABLE notices (
      id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, titleEn TEXT, description TEXT, descriptionEn TEXT, is_active INTEGER,
      created_at TEXT DEFAULT '2026-09-01', updated_at TEXT DEFAULT '2026-09-01'
    );
  `);
  legacy.prepare("INSERT INTO events (id,title,titleEn,date,time,location,locationEn,description,descriptionEn,image,link) VALUES (1,@title,@titleEn,@date,@time,@location,@locationEn,@description,@descriptionEn,@image,@link)").run(event);
  legacy.prepare("INSERT INTO highlights (id,title,titleEn,meta,metaEn,description,descriptionEn,category,categoryEn,date,startDate,endDate,host,hostEn,image,link,icon,sort_order,is_active) VALUES (1,@title,@titleEn,@meta,@metaEn,@description,@descriptionEn,@category,@categoryEn,@date,@startDate,@endDate,@host,@hostEn,@image,@link,@icon,@sort_order,@is_active)").run(highlight);
  legacy.prepare("INSERT INTO notices (id,slug,title,titleEn,description,descriptionEn,is_active) VALUES (1,'legacy-notice',@title,@titleEn,@description,@descriptionEn,@is_active)").run(notice);
  legacy.close();
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash("content-tags-local-fixture-only");
  await prisma.contentSlug.deleteMany({ where: { slug: { startsWith: "tag-" } } });
  await prisma.contentSlug.deleteMany({ where: { slug: { startsWith: "old-" } } });
  await prisma.noticeSlug.deleteMany({ where: { slug: { startsWith: "tag-" } } });
  await prisma.noticeSlug.deleteMany({ where: { slug: { startsWith: "old-" } } });
  await prisma.centerEvent.deleteMany({ where: { title: "태그 행사" } });
  await prisma.centerHighlight.deleteMany({ where: { title: "태그 기록" } });
  await prisma.notice.deleteMany({ where: { title: "태그 공지" } });
  session = await login("content-tags-local-fixture-only", "tag-tests");
});

after(async () => {
  await prisma.$disconnect();
  getDatabase().close();
  rmSync(directory, { recursive: true, force: true });
});

test("legacy API inputs default to an empty tag list", () => {
  for (const item of cases) assert.deepEqual(item.schema.parse(item.input).tags, []);
});

test("tag input normalizes hashes, whitespace, Unicode and case-insensitive duplicates", () => {
  const tags = ["  ##비트코인  ", " Bitcoin ", "#bitcoin", "Cold   storage", "e\u0301", "é"];
  for (const item of cases) {
    assert.deepEqual(item.schema.parse({ ...item.input, tags }).tags, ["비트코인", "Bitcoin", "Cold storage", "é"]);
  }
});

test("tag limits count Unicode characters and accept the maximum size", () => {
  const tags = ["🧡".repeat(30), ...Array.from({ length: 9 }, (_, index) => `태그${index}`)];
  for (const item of cases) assert.deepEqual(item.schema.parse({ ...item.input, tags }).tags, tags);
});

test("tag input rejects empty, overlong, excessive, non-string and ambiguous comma values", () => {
  const invalid = [null, "bitcoin", [5], [""], ["  "], ["###"], ["비".repeat(31)], ["bad\u0000tag"], ["one,two"], Array.from({ length: 11 }, (_, index) => `tag${index}`)];
  for (const item of cases) {
    for (const tags of invalid) assert.equal(item.schema.safeParse({ ...item.input, tags }).success, false, `${item.name}: ${JSON.stringify(tags)}`);
  }
});

test("additive migration preserves legacy rows and supplies empty stored tags on all tables", () => {
  openDatabase(process.env.BCS_EVENTS_DB).close();
  for (const table of ["events", "highlights", "notices"]) {
    const row = getDatabase().prepare(`SELECT tags, updated_at FROM ${table} WHERE id = 1`).get();
    assert.deepEqual(row, { tags: "[]", updated_at: "2026-09-01" });
    const columns = getDatabase().prepare(`PRAGMA table_info(${table})`).all();
    assert.equal(columns.filter((column) => column.name === "tags").length, 1);
  }
  assert.deepEqual(["events", "highlights", "notices"].map((table) => JSON.parse(getDatabase().prepare(`SELECT tags FROM ${table} WHERE id = 1`).get().tags)), [[], [], []]);
});

for (const item of cases) {
  test(`${item.name} tags survive authenticated create, public read, update and delete`, async () => {
    const tags = [" #비트코인 ", "Bitcoin", "bitcoin", "<svg/onload=alert(1)>"];
    const created = await item.create(request("POST", `/api/admin/${item.name}`, { ...item.input, tags }));
    assert.equal(created.status, 201);
    const record = (await created.json()).data;
    assert.deepEqual(record.tags, ["비트코인", "Bitcoin", "<svg/onload=alert(1)>"]);
    const context = { params: Promise.resolve({ id: String(record.id), slug: record.slug }) };
    const published = await item.read(request("GET", `/api/${item.name}/${record.id}`), context);
    assert.equal(published.status, 200);
    assert.deepEqual((await published.json()).data.tags, record.tags);
    const updated = await item.update(request("PUT", `/api/admin/${item.name}/${record.id}`, { ...item.input, tags: ["라이트닝", " #Lightning ", "lightning"] }, record.revision), context);
    assert.equal(updated.status, 200);
    const saved = (await updated.json()).data;
    assert.deepEqual(saved.tags, ["라이트닝", "Lightning"]);
    const reread = await item.read(request("GET", `/api/${item.name}/${record.id}`), context);
    assert.deepEqual((await reread.json()).data.tags, ["라이트닝", "Lightning"]);
    const removed = await item.remove(request("DELETE", `/api/admin/${item.name}/${record.id}`, undefined, saved.revision), context);
    assert.equal(removed.status, 200);
  });

  test(`${item.name} API accepts old clients without tags and rejects invalid tag arrays`, async () => {
    const old = await item.create(request("POST", `/api/admin/${item.name}`, { ...item.input, slug: `old-${item.name}` }));
    assert.equal(old.status, 201);
    const record = (await old.json()).data;
    assert.deepEqual(record.tags, []);
    const rejected = await item.update(request("PUT", `/api/admin/${item.name}/${record.id}`, { ...item.input, tags: ["#"] }), { params: Promise.resolve({ id: String(record.id) }) });
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).error.code, "VALIDATION_ERROR");
  });
}
