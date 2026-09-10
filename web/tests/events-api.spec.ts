import { expect, request, test, type APIRequestContext } from "@playwright/test";
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { eventInputSchema, highlightInputSchema, highlightRecordSchema } from "@/lib/events-contract";

const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3102";
const password = process.env.ADMIN_PASSWORD ?? "local-review-password";
const highlight = {
  title: "Range", titleEn: "Range", meta: "", metaEn: "", category: "행사", categoryEn: "Event",
  date: "", startDate: "2026-01-01", endDate: "2026-01-02", host: "", hostEn: "", description: "설명",
  descriptionEn: "Description", image: "", link: "", icon: "calendar", sort_order: 0, is_active: 1, images: [],
};

test("keeps runtime database access fail closed and legacy compatible", () => {
  // Given unset, nonexistent, and legacy-only database configurations
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-events-db-"));
  const missing = path.join(directory, "missing.db");
  const legacy = path.join(directory, "legacy.db");
  const check = `
    const fs = await import("node:fs");
    const Sqlite = (await import("better-sqlite3")).default;
    const { getDatabase } = await import("./src/server/events/db.ts");
    const { ApiError } = await import("./src/server/events/errors.ts");
    delete process.env.BCS_EVENTS_DB;
    let unset = 0;
    try { getDatabase(); } catch (error) { if (error instanceof ApiError) unset = error.status; else throw error; }
    process.env.BCS_EVENTS_DB = process.env.BCS_DB_TEST_PATH;
    let missing = 0;
    try { getDatabase(); } catch (error) { if (error instanceof ApiError) missing = error.status; else throw error; }
    if (unset !== 503 || missing !== 503 || fs.existsSync(process.env.BCS_DB_TEST_PATH)) process.exit(1);
    const seed = new Sqlite(process.env.BCS_LEGACY_TEST_PATH);
    seed.exec(\`
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, titleEn TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, location TEXT NOT NULL, locationEn TEXT NOT NULL, description TEXT NOT NULL, descriptionEn TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE highlights (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, titleEn TEXT NOT NULL, meta TEXT NOT NULL, metaEn TEXT NOT NULL, description TEXT NOT NULL, descriptionEn TEXT NOT NULL, category TEXT NOT NULL DEFAULT '행사', categoryEn TEXT NOT NULL DEFAULT 'Event', date TEXT NOT NULL DEFAULT '', startDate TEXT NOT NULL DEFAULT '', endDate TEXT NOT NULL DEFAULT '', host TEXT NOT NULL DEFAULT '비트코인 센터 서울', hostEn TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul', image TEXT NOT NULL, link TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'calendar', sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO events (id,title,titleEn,date,time,location,locationEn,description,descriptionEn,image,link) VALUES (1,'행사','Event','2026-01-01','','','','설명','Description','','');
    \`);
    const before = JSON.stringify(seed.prepare("SELECT * FROM events WHERE id = 1").get());
    seed.close();
    process.env.BCS_EVENTS_DB = process.env.BCS_LEGACY_TEST_PATH;
    const { createPasswordHash } = await import("./src/server/events/password.ts");
    process.env.ADMIN_PASSWORD_HASH = await createPasswordHash("local-test-password");
    const [{ listEvents }, { login }] = await Promise.all([import("./src/server/events/index.ts"), import("./src/server/events/auth.ts")]);
    const events = listEvents();
    await login("local-test-password", "global");
    const verify = new Sqlite(process.env.BCS_LEGACY_TEST_PATH, { fileMustExist: true });
    const { tags, revision, ...legacyAfter } = verify.prepare("SELECT * FROM events WHERE id = 1").get();
    const after = JSON.stringify(legacyAfter);
    const additions = verify.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name IN ('content_images','content_slugs','admin_sessions','admin_login_attempts')").get().count;
    verify.close();
    if (revision !== 1 || events[0].revision !== 1 || events.length !== 1 || events[0].slug !== '' || tags !== '[]' || events[0].tags.length !== 0 || before !== after || additions !== 4) process.exit(1);
    process.stdout.write("ok");
  `;

  // When the real runtime accessor and password session path are exercised
  try {
    const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", check], {
      cwd: process.cwd(), env: { ...process.env, BCS_DB_TEST_PATH: missing, BCS_LEGACY_TEST_PATH: legacy }, encoding: "utf8",
    });

    // Then missing paths fail closed while additions initialize without rewriting legacy rows
    expect(output).toBe("ok");
    expect(fs.existsSync(missing)).toBe(false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("normalizes slugs and rejects ambiguous or unsafe URL segments", () => {
  // Given legacy payloads and a range of admin-provided URL segments
  const valid = [undefined, "", "  Bitcoin-2026  ", "2026-meetup", "a".repeat(100)];
  const invalid = ["123", "01", "한글", "a--b", "-a", "a-", "a/b", "../a", "a?b", "a#b", "%61", "a_b", "a b", "a".repeat(101)];
  const schemas = [eventInputSchema.shape.slug, highlightInputSchema.shape.slug];

  // When each segment is parsed by both content contracts
  const accepted = schemas.map((schema) => valid.map((slug) => schema.parse(slug)));
  const rejected = schemas.map((schema) => invalid.map((slug) => schema.safeParse(slug).success));

  // Then omitted slugs preserve numeric URLs and unsafe or ambiguous values never pass
  expect(accepted).toEqual(schemas.map(() => ["", "", "bitcoin-2026", "2026-meetup", "a".repeat(100)]));
  expect(rejected).toEqual(schemas.map(() => invalid.map(() => false)));
});

test("preserves slug aliases, ownership, visibility and transactional legacy writes", () => {
  // Given a fresh isolated SQLite database and real content adapters
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-slugs-"));
  const check = `
    const assert = (await import("node:assert/strict")).default;
    const { openDatabase, getDatabase } = await import("./src/server/events/db.ts");
    const api = await import("./src/server/events/index.ts");
    const { eventInputSchema, highlightInputSchema } = await import("./src/lib/events-contract.ts");
    const { ApiError } = await import("./src/server/events/errors.ts");
    openDatabase(process.env.BCS_EVENTS_DB).close();
    const event = eventInputSchema.parse({ title:'행사', titleEn:'Event', date:'2026-01-01', time:'', location:'', locationEn:'', description:'설명', descriptionEn:'Description', image:'', link:'', images:[] });
    const highlight = highlightInputSchema.parse(${JSON.stringify(highlight)});
    const collision = (error) => error instanceof ApiError && error.status === 409 && error.code === 'SLUG_CONFLICT';
    for (const kind of ['Event', 'Highlight']) {
      const input = kind === 'Event' ? event : highlight;
      const create = api['create' + kind], update = api['update' + kind], get = api['get' + kind];
      const byPath = api['get' + kind + 'ByPath'], remove = api['delete' + kind], list = api['list' + kind + 's'];
      const first = create({ ...input, slug:'first-name' });
      const second = create({ ...input, slug:'second-name' });
      assert.equal(byPath(String(first.id)).slug, 'first-name');
      assert.equal(byPath('first-name').id, first.id);
      assert.equal(list().find(row => row.id === first.id).slug, 'first-name');
      assert.throws(() => create({ ...input, slug:'first-name' }), collision);
      assert.equal(list().length, 2);
      assert.throws(() => update(second.id, { ...input, title:'Must rollback', slug:'first-name' }, get(second.id, { includeInactive:true }).revision), collision);
      assert.equal(get(second.id).title, input.title);
      assert.equal(get(second.id).revision, second.revision);
      assert.equal(get(second.id).slug, 'second-name');
      update(first.id, { ...input, slug:'renamed' }, get(first.id, { includeInactive:true }).revision);
      assert.equal(byPath('first-name').slug, 'renamed');
      assert.equal(byPath('renamed').id, first.id);
      assert.throws(() => update(second.id, { ...input, slug:'first-name' }, get(second.id, { includeInactive:true }).revision), collision);
      update(first.id, { ...input, slug:'' }, get(first.id, { includeInactive:true }).revision);
      assert.equal(byPath('first-name').slug, '');
      assert.equal(byPath('renamed').id, first.id);
      assert.throws(() => create({ ...input, slug:'renamed' }), collision);
      update(first.id, { ...input, slug:'first-name' }, get(first.id, { includeInactive:true }).revision);
      assert.equal(byPath('renamed').slug, 'first-name');
      for (const value of ['', '../first-name', "' OR 1=1--", '0', '1e0', '9007199254740992', 'not-found']) assert.equal(byPath(value), null);
      if (kind === 'Highlight') {
        update(first.id, { ...input, slug:'private-name', is_active:0 }, get(first.id, { includeInactive:true }).revision);
        assert.equal(byPath('private-name'), null);
        assert.equal(byPath('first-name'), null);
        assert.equal(byPath(String(first.id)), null);
        assert.equal(byPath('first-name', { includeInactive:true }).id, first.id);
      }
      remove(first.id, get(first.id, { includeInactive:true }).revision);
      assert.equal(byPath('first-name', { includeInactive:true }), null);
      assert.equal(getDatabase().prepare('SELECT count(*) AS count FROM content_slugs WHERE kind = ? AND content_id = ?').get(kind.toLowerCase(), first.id).count, 0);
      assert.equal(create({ ...input, slug:'first-name' }).slug, 'first-name');
    }
    getDatabase().close();
    process.stdout.write('ok');
  `;
  try {
    // When public lookups and admin CRUD exercise collisions, renames, clearing and deletion
    const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", check], {
      cwd: process.cwd(), env: { ...process.env, BCS_EVENTS_DB: path.join(directory, "events.db"), BCS_EVENTS_UPLOADS: path.join(directory, "images") }, encoding: "utf8",
    });
    // Then every operation preserves the expected record ownership and canonical slug
    expect(output).toBe("ok");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("accepts only single or complete ordered highlight periods", () => {
  // Given valid and invalid date-period combinations
  const cases = [
    highlight,
    { ...highlight, date: "2026-01-01", startDate: "", endDate: "" },
    { ...highlight, endDate: "" },
    { ...highlight, date: "2026-01-01" },
    { ...highlight, startDate: "2026-01-03" },
  ];

  // When each combination crosses the shared contract
  const results = cases.map((value) => highlightInputSchema.safeParse(value).success);

  // Then only a single date or a complete ordered range is accepted
  expect(results).toEqual([true, true, false, false, false]);
});

test("validates all 40 verified source highlights", () => {
  // Given the immutable verified public snapshot
  const snapshot: unknown = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "../.local/production-snapshot-2026-09-09/production-data.json"), "utf8"),
  );
  const rows = z.object({ highlights: z.array(z.record(z.string(), z.unknown())) }).parse(snapshot).highlights;

  // When every source row crosses the public record contract
  const results = rows.map((row) => {
    const fields = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "created_at" && key !== "updated_at"));
    const images = typeof row.image === "string" && row.image !== "" ? [row.image] : [];
    return highlightRecordSchema.safeParse({ ...fields, images, revision: 1 }).success;
  });

  // Then all source records remain representable without rewriting them
  expect(rows).toHaveLength(40);
  expect(results.every(Boolean)).toBe(true);
});

test.describe.serial("events-only HTTP API", () => {
  let admin: APIRequestContext;

  test.beforeAll(async () => {
    admin = await request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { origin },
    });
    const response = await admin.post("/api/admin/login", { data: { password } });
    expect(response.status()).toBe(200);
  });

  test.afterAll(async () => {
    await admin.dispose();
  });

  test("rejects an unauthenticated event mutation", async ({ request: anonymous }) => {
    // Given an API client with no admin session
    // When it attempts to create an event
    const response = await anonymous.post(`${origin}/api/admin/events`, {
      headers: { origin },
      data: {},
    });

    // Then the boundary rejects the request without exposing internals
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." },
    });
  });

  test("rejects an authenticated cross-origin mutation", async () => {
    // Given an authenticated admin session
    // When a different origin attempts a state-changing request
    const response = await admin.post("/api/admin/events", {
      headers: { origin: "https://attacker.invalid" },
      data: {},
    });

    // Then CSRF protection rejects it before input processing
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("ORIGIN_REJECTED");
  });

  test("expires the cookie through logout and permits a new login", async () => {
    // Given an authenticated admin session
    const active = await admin.get("/api/admin/session");
    expect((await active.json()).data.authenticated).toBe(true);

    // When the admin logs out
    const loggedOut = await admin.post("/api/admin/logout");

    // Then the cookie no longer authenticates requests
    expect(loggedOut.status()).toBe(200);
    expect((await admin.get("/api/admin/session").then((response) => response.json())).data.authenticated).toBe(false);
    expect((await admin.post("/api/admin/login", { data: { password } })).status()).toBe(200);
  });

  test("rejects a calendar date that cannot exist", async () => {
    // Given an otherwise valid event with an impossible calendar date
    const payload = {
      title: "Invalid date", titleEn: "Invalid date", date: "2026-02-31", time: "", location: "",
      locationEn: "", description: "설명", descriptionEn: "Description", image: "", link: "", images: [],
    };

    // When the event reaches the input boundary
    const response = await admin.post("/api/admin/events", { data: payload });

    // Then it is rejected without creating a row
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  test("uploads real images and rejects disguised non-images", async () => {
    // Given two valid images selected by an authenticated admin
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#f7931a" } }).png().toBuffer();
    // When both are uploaded in one multipart request
    const response = await admin.post("/api/admin/images", {
      multipart: {
        first: { name: "one.png", mimeType: "image/png", buffer: png },
        second: { name: "two.png", mimeType: "image/png", buffer: png },
      },
    });

    // Then both generated paths are returned and can be served
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.images).toHaveLength(2);
    expect(body.data.images[0]).toMatch(/^\/images\/uploads\/\d{4}-\d{2}\/[a-f0-9-]+\.webp$/);
    const served = await admin.get(body.data.images[0]);
    expect(served.headers()["content-type"]).toBe("image/webp");

    // Given bytes that only claim to be an image
    // When the upload reaches the decoder
    const invalid = await admin.post("/api/admin/images", {
      multipart: {
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("not an image"),
        },
      },
    });

    // Then actual decoding rejects the file
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).error.code).toBe("INVALID_IMAGE");
  });

  test("creates, edits, clears images from, and deletes an event", async () => {
    // Given a valid bilingual event payload
    const title = `API event ${Date.now()}`;
    const payload = {
      title,
      titleEn: title,
      slug: `api-event-${Date.now()}`,
      date: "2026-10-21",
      time: "19:00",
      location: "서울",
      locationEn: "Seoul",
      description: "가".repeat(20_000),
      descriptionEn: "나".repeat(20_000),
      image: "",
      link: "https://example.com/event",
      images: [],
    };

    // When the event is created
    const created = await admin.post("/api/admin/events", { data: payload });

    // Then it is publicly readable with its legacy ID and gallery contract
    expect(created.status()).toBe(201);
    const event = (await created.json()).data;
    expect(event).toMatchObject(payload);
    const publicDetail = await admin.get(`/api/events/${event.id}`);
    expect((await publicDetail.json()).data.title).toBe(title);
    const conflict = await admin.post("/api/admin/events", { data: payload });
    expect(conflict.status()).toBe(409);
    expect((await conflict.json()).error.code).toBe("SLUG_CONFLICT");

    // When the event is edited with an explicitly empty gallery
    const updated = await admin.put(`/api/admin/events/${event.id}`, {
      headers: { "If-Match": `"${event.revision}"` },
      data: { ...payload, slug: `${payload.slug}-edited`, description: "수정", images: [], image: "" },
    });

    // Then the edit persists and image clearing is preserved
    expect((await updated.json()).data).toMatchObject({ slug: `${payload.slug}-edited`, description: "수정", image: "", images: [] });

    // When the event is deleted
    const deleted = await admin.delete(`/api/admin/events/${event.id}`, { headers: { "If-Match": `"${event.revision + 1}"` } });

    // Then the public detail route returns a stable not-found error
    expect(deleted.status()).toBe(200);
    const missing = await admin.get(`/api/events/${event.id}`);
    expect(missing.status()).toBe(404);
    expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });

  test("keeps inactive highlights private until activated", async () => {
    // Given a valid inactive highlight
    const title = `API highlight ${Date.now()}`;
    const payload = {
      title,
      titleEn: title,
      meta: "기록",
      metaEn: "Record",
      category: "행사",
      categoryEn: "Event",
      date: "2026.10.22",
      startDate: "",
      endDate: "",
      host: "비트코인 센터 서울",
      hostEn: "Bitcoin Center Seoul",
      description: "설명",
      descriptionEn: "Description",
      image: "",
      link: "",
      icon: "calendar",
      sort_order: 0,
      is_active: 0,
      images: [],
    };

    // When it is created
    const created = await admin.post("/api/admin/highlights", { data: payload });

    // Then admins can retrieve it while the public API cannot
    expect(created.status()).toBe(201);
    const highlight = (await created.json()).data;
    expect((await admin.get(`/api/admin/highlights/${highlight.id}`)).status()).toBe(200);
    expect((await admin.get(`/api/highlights/${highlight.id}`)).status()).toBe(404);

    // When the highlight is activated
    await admin.put(`/api/admin/highlights/${highlight.id}`, {
      headers: { "If-Match": `"${highlight.revision}"` },
      data: { ...payload, is_active: 1 },
    });

    // Then it becomes public
    expect((await admin.get(`/api/highlights/${highlight.id}`)).status()).toBe(200);
    await admin.delete(`/api/admin/highlights/${highlight.id}`, { headers: { "If-Match": `"${highlight.revision + 1}"` } });
  });

  test("rate limits password attempts even when forwarding headers rotate", async () => {
    // Given a clean global login bucket and changing untrusted proxy headers
    const databasePath = process.env.BCS_EVENTS_DB;
    test.skip(!databasePath, "isolated review launcher is required");
    if (!databasePath) return;

    // When five invalid passwords are attempted
    const statuses: number[] = [];
    try {
      for (let index = 0; index < 5; index += 1) {
        const response = await admin.post("/api/admin/login", {
          headers: { origin, "x-forwarded-for": `198.51.100.${index}` },
          data: { password: `wrong-${index}` },
        });
        statuses.push(response.status());
      }
    } finally {
      const database = new Database(databasePath);
      database.prepare("DELETE FROM admin_login_attempts WHERE client_hash = 'global'").run();
      database.close();
    }

    // Then the shared limit blocks the fifth attempt
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
  });
});
