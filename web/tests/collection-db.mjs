import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-collection-"));
process.env.BCS_EVENTS_DB = path.join(directory, "events.db");
process.env.BCS_EVENTS_UPLOADS = path.join(directory, "images");

// Reproduce the pre-board-game table: narrow CHECK, no revision column.
const legacy = new Database(process.env.BCS_EVENTS_DB);
legacy.exec(`CREATE TABLE collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('book', 'artwork')),
  title TEXT NOT NULL, titleEn TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT '', creatorEn TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', descriptionEn TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
legacy.prepare("INSERT INTO collection_items (id,kind,title,is_active) VALUES (7,'book','오래된 도서',0)").run();
legacy.close();

const { openDatabase, getDatabase } = await import("../src/server/events/db.ts");
const { listCollection, getCollectionItem, saveCollectionItem, setCollectionSoldOut } = await import("../src/server/collection/index.ts");
const { collectionInputSchema, libraryKinds } = await import("../src/lib/collection-contract.ts");
openDatabase(process.env.BCS_EVENTS_DB).close();
after(() => { getDatabase().close(); fs.rmSync(directory, { recursive: true, force: true }); });

test("widening the kind check keeps existing rows and admits board games", () => {
  const existing = getCollectionItem(7, true);
  assert.equal(existing.title, "오래된 도서");
  assert.equal(existing.id, 7);
  assert.equal(existing.revision, 1);

  const game = saveCollectionItem(collectionInputSchema.parse({ kind: "boardgame", title: "검증용 보드게임", images: [] }));
  assert.equal(game.kind, "boardgame");
  assert.throws(() => getDatabase().prepare("INSERT INTO collection_items (kind,title) VALUES ('puzzle','거부')").run());
});

test("kind filters keep board games off the books and art pages", () => {
  assert.deepEqual(listCollection(true, libraryKinds).map((record) => record.title), ["오래된 도서"]);
  assert.deepEqual(listCollection(true, ["boardgame"]).map((record) => record.title), ["검증용 보드게임"]);
  assert.equal(listCollection(true).length, 2);
  assert.equal(getCollectionItem(7, true, ["boardgame"]), null);
});

test("reopening an already widened database leaves it untouched", () => {
  const reopened = openDatabase(process.env.BCS_EVENTS_DB);
  assert.equal(reopened.prepare("SELECT COUNT(*) AS total FROM collection_items").get().total, 2);
  assert.equal(reopened.prepare("SELECT title FROM collection_items WHERE id = 7").get().title, "오래된 도서");
  reopened.close();
});

test("오래된 수정 버전으로는 보드게임을 덮어쓰지 못한다", () => {
  const input = collectionInputSchema.parse({ kind: "boardgame", title: "충돌 검증용 보드게임", images: [] });
  const game = saveCollectionItem(input);
  saveCollectionItem({ ...input, title: "먼저 저장" }, game.id, game.revision);
  assert.throws(() => saveCollectionItem({ ...input, title: "덮어쓰기" }, game.id, game.revision), { status: 409, code: "EDIT_CONFLICT" });
});


test("goods purchase links persist, stay private as drafts and reject unsafe URLs", () => {
  const input = collectionInputSchema.parse({ kind: "goods", title: "센터 티셔츠", images: [], purchaseUrl: "https://pay.example.com/ticket?item=shirt" });
  const item = saveCollectionItem(input);
  assert.equal(getCollectionItem(item.id), null);
  assert.equal(getCollectionItem(item.id, true).purchaseUrl, input.purchaseUrl);
  const updated = saveCollectionItem({ ...input, purchaseUrl: "" }, item.id, item.revision);
  assert.equal(updated.purchaseUrl, "");
  for (const purchaseUrl of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/checkout", "https://" , "x".repeat(2049)]) {
    assert.equal(collectionInputSchema.safeParse({ ...input, purchaseUrl }).success, false);
  }
});

test("current collection migration preserves slugs, revisions, rows, unique index and deleted IDs", () => {
  const file = path.join(directory, "current.db");
  const old = new Database(file);
  old.exec(`CREATE TABLE collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('book', 'artwork', 'boardgame')),
    slug TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, titleEn TEXT NOT NULL DEFAULT '',
    creator TEXT NOT NULL DEFAULT '', creatorEn TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', descriptionEn TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]', sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision INTEGER NOT NULL DEFAULT 1);
    CREATE UNIQUE INDEX collection_items_slug ON collection_items(slug) WHERE slug != '';
    INSERT INTO collection_items(id,kind,slug,title,titleEn,description,images,sort_order,is_active,revision)
      VALUES (11,'boardgame','existing-game','보드게임','Game','설명','["/images/uploads/cover.webp"]',-5,1,9);
    INSERT INTO collection_items(id,kind,title) VALUES(50,'book','삭제된 도서');
    DELETE FROM collection_items WHERE id=50;`);
  const before = old.prepare("SELECT * FROM collection_items").all();
  old.close();
  const migrated = openDatabase(file);
  assert.deepEqual(migrated.prepare("SELECT * FROM collection_items").all(), before.map(row => ({ ...row, purchaseUrl: "", soldOut: 0 })));
  assert.throws(() => migrated.prepare("INSERT INTO collection_items(kind,slug,title) VALUES('goods','existing-game','충돌')").run());
  const inserted = migrated.prepare("INSERT INTO collection_items(kind,title) VALUES('goods','굿즈')").run();
  assert.equal(Number(inserted.lastInsertRowid), 51);
  assert.equal(migrated.pragma('integrity_check', { simple: true }), 'ok');
  migrated.close();
  const reopened = openDatabase(file);
  assert.equal(reopened.prepare("SELECT revision FROM collection_items WHERE id=11").get().revision, 9);
  reopened.close();
});


test("sold-out changes preserve the link, images, publication and older-client saves", () => {
  const input = collectionInputSchema.parse({ kind: "goods", title: "품절 검증", images: [], purchaseUrl: "https://pay.example.com/goods" });
  const item = saveCollectionItem(input);
  const closed = setCollectionSoldOut(item.id, true, item.revision);
  assert.equal(closed.soldOut, true);
  assert.equal(closed.purchaseUrl, item.purchaseUrl);
  assert.equal(closed.is_active, item.is_active);
  assert.deepEqual(closed.images, item.images);
  assert.throws(() => setCollectionSoldOut(item.id, false, item.revision), { status: 409 });
  const edited = saveCollectionItem({ ...input, title: "제목 수정" }, item.id, closed.revision);
  assert.equal(edited.soldOut, true);
  assert.equal(setCollectionSoldOut(item.id, false, edited.revision).purchaseUrl, item.purchaseUrl);
});
