import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { openDatabase, getDatabase } from "../src/server/events/db.ts";
import { createPasswordHash } from "../src/server/events/password.ts";
import { login } from "../src/server/events/auth.ts";
import * as events from "../src/server/events/handlers.ts";
import * as notices from "../src/server/notices/handlers.ts";
import * as collection from "../src/server/collection/handlers.ts";

const directory = mkdtempSync(join(tmpdir(), "bcs-concurrency-"));
let token;
before(async () => {
  process.env.APP_ORIGIN = "http://127.0.0.1:3102";
  process.env.BCS_EVENTS_DB = join(directory, "events.db");
  process.env.BCS_EVENTS_UPLOADS = join(directory, "images");
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash("concurrency-test-password");
  openDatabase(process.env.BCS_EVENTS_DB).close();
  token = await login("concurrency-test-password", "test-client");
});
after(() => { getDatabase().close(); rmSync(directory, { recursive: true, force: true }); });
function request(method, body, revision) {
  return new NextRequest(`${process.env.APP_ORIGIN}/api/admin/test`, {
    method, headers: { origin: process.env.APP_ORIGIN, cookie: `bcs_admin_session=${token}`,
      "content-type": "application/json", ...(revision === undefined ? {} : { "if-match": `"${revision}"` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const common = { title: "Original", titleEn: "Original", description: "Original body", descriptionEn: "Original body", tags: [], slug: "", images: [], image: "", link: "", date: "2026-09-10" };
const cases = [
  ["events", events.adminEventsPost, events.adminEventPut, events.adminEventDelete, events.adminEventsGet, { ...common, time: "", venueType: "center", location: "", locationEn: "" }],
  ["highlights", events.adminHighlightsPost, events.adminHighlightPut, events.adminHighlightDelete, events.adminHighlightsGet, { ...common, meta: "", metaEn: "", category: "", categoryEn: "", startDate: "", endDate: "", host: "", hostEn: "", icon: "", sort_order: 0, is_active: 0 }],
  ["notices", notices.adminNoticesPost, notices.adminNoticePut, notices.adminNoticeDelete, notices.adminNoticesGet, { title: "Original", description: "Original body", slug: "concurrent-notice", is_active: 0 }],
  ["books", collection.adminCollectionPost, collection.adminCollectionPut, collection.adminCollectionDelete, collection.adminCollectionGet, { kind: "book", title: "Original", images: [], is_active: 0 }],
  ["artworks", collection.adminCollectionPost, collection.adminCollectionPut, collection.adminCollectionDelete, collection.adminCollectionGet, { kind: "artwork", title: "Original", images: [], is_active: 0 }],
];
for (const [name, post, put, remove, list, input] of cases) {
  test(`${name}: two editors cannot overwrite or delete a newer save`, async () => {
    // Given: both editors opened the same revision.
    const created = await post(request("POST", input));
    assert.equal(created.status, 201);
    const original = (await created.json()).data;
    const context = { params: Promise.resolve({ id: String(original.id) }) };
    assert.equal((await put(request("PUT", input), context)).status, 428);
    assert.equal((await remove(request("DELETE"), context)).status, 428);
    // When: two saves based on that revision arrive together.
    const results = await Promise.all(["Editor A", "Editor B"].map(title => put(request("PUT", { ...input, title }, original.revision), context)));
    // Then: only one wins, and stale retries and deletes leave it intact.
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const winner = (await results.find(r => r.status === 200).json()).data;
    assert.equal(winner.revision, original.revision + 1);
    assert.equal((await remove(request("DELETE", undefined, original.revision), context)).status, 409);
    assert.equal((await put(request("PUT", input, original.revision), context)).status, 409);
    const stored = (await (await list(request("GET"))).json()).data.find(r => r.id === original.id);
    assert.equal(stored.title, winner.title);
    assert.equal(stored.revision, winner.revision);
    const refreshed = await put(request("PUT", { ...input, title: "Merged after reviewing" }, winner.revision), context);
    assert.equal(refreshed.status, 200);
    const latest = (await refreshed.json()).data;
    assert.equal((await remove(request("DELETE", undefined, latest.revision), context)).status, 200);
    assert.equal((await put(request("PUT", input, latest.revision), context)).status, 404);
  });
}
