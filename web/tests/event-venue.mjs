import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateEventVenues } from "../src/server/events/venue-migration.ts";
import { centerEventLocation } from "../src/lib/event-location.ts";
import { eventInputSchema } from "../src/lib/events-contract.ts";
import { openDatabase, getDatabase } from "../src/server/events/db.ts";
import { createEvent, updateEvent } from "../src/server/events/index.ts";
import { getCenterStatus } from "../src/server/center-status.ts";

test("legacy migration preserves locations, distinguishes unknown venues and never overwrites later choices", () => {
  const db = new Database(":memory:");
  try {
    db.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, location TEXT NOT NULL, locationEn TEXT NOT NULL)");
    const rows = [
      [1, "비트코인 센터 서울", "Bitcoin Center Seoul"],
      [2, centerEventLocation.location, centerEventLocation.locationEn],
      [3, "비트코인센터서울", ""],
      [4, "비트코인 센터 서울 옆 카페", "Outside cafe"],
      [5, "", ""],
      [6, "비트코인 센터 서울", "External venue"],
    ];
    for (const row of rows) db.prepare("INSERT INTO events VALUES (?, ?, ?)").run(...row);
    const before = db.prepare("SELECT * FROM events").all();
    db.transaction(() => migrateEventVenues(db)).immediate();
    assert.deepEqual(db.prepare("SELECT id, location, locationEn FROM events").all(), before);
    assert.deepEqual(db.prepare("SELECT venueType FROM events ORDER BY id").all().map(r => r.venueType), ["center", "center", "center", "external", "external", "external"]);
    db.prepare("UPDATE events SET venueType = 'external' WHERE id = 1").run();
    db.transaction(() => migrateEventVenues(db)).immediate();
    assert.equal(db.prepare("SELECT venueType FROM events WHERE id = 1").get().venueType, "external");
    assert.throws(() => db.prepare("UPDATE events SET venueType = 'invalid' WHERE id = 1").run());
  } finally { db.close(); }
});

test("saved venue choice fills center addresses and excludes external events from center activity", async () => {
  const directory = mkdtempSync(join(tmpdir(), "bcs-event-venue-"));
  process.env.BCS_EVENTS_DB = join(directory, "events.db");
  process.env.BCS_EVENTS_UPLOADS = join(directory, "images");
  mkdirSync(process.env.BCS_EVENTS_UPLOADS);
  openDatabase(process.env.BCS_EVENTS_DB).close();
  try {
    const input = eventInputSchema.parse({ venueType: "external", title: "장소 검증", titleEn: "Venue test", date: "2026-09-13", time: "13:00 ~ 15:00", location: "외부 행사장", locationEn: "External venue", description: "검증", descriptionEn: "Test", images: [], image: "", link: "" });
    const now = new Date("2026-09-13T13:30:00+09:00");
    const external = createEvent(input);
    assert.equal(external.venueType, "external");
    assert.equal(external.location, input.location);
    assert.equal((await getCenterStatus(now)).status, "open");
    const center = updateEvent(external.id, { ...input, venueType: "center" }, external.revision);
    assert.equal(center.location, centerEventLocation.location);
    assert.equal(center.locationEn, centerEventLocation.locationEn);
    assert.equal((await getCenterStatus(now)).status, "event");
    const changed = updateEvent(center.id, { ...input, locationEn: "" }, center.revision);
    assert.equal(changed.venueType, "external");
    assert.equal(changed.locationEn, "");
    assert.equal((await getCenterStatus(now)).status, "open");
    assert.throws(() => updateEvent(center.id, { ...input, venueType: "center" }, center.revision));
  } finally { getDatabase().close(); rmSync(directory, { recursive: true, force: true }); }
});
