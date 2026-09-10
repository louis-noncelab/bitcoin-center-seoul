import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { configuredDatabasePath } from "@/server/events/config";
import { ApiError } from "@/server/events/errors";

const eventColumns = [
  "id", "title", "titleEn", "date", "time", "location", "locationEn", "description", "descriptionEn", "image", "link",
] as const;
const highlightColumns = [
  "id", "title", "titleEn", "meta", "metaEn", "description", "descriptionEn", "category", "categoryEn", "date",
  "startDate", "endDate", "host", "hostEn", "image", "link", "icon", "sort_order", "is_active",
] as const;

let database: Database.Database | undefined;

export function openDatabase(filename: string): Database.Database {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const next = new Database(filename);
  return initialize(next, true);
}

function initialize(next: Database.Database, createLegacy: boolean): Database.Database {
  try {
    next.pragma("journal_mode = WAL");
    next.pragma("busy_timeout = 5000");
    if (createLegacy) {
      next.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL, titleEn TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
          location TEXT NOT NULL, locationEn TEXT NOT NULL, description TEXT NOT NULL, descriptionEn TEXT NOT NULL,
          image TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS highlights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL, titleEn TEXT NOT NULL, meta TEXT NOT NULL, metaEn TEXT NOT NULL,
          description TEXT NOT NULL, descriptionEn TEXT NOT NULL, category TEXT NOT NULL DEFAULT '행사',
          categoryEn TEXT NOT NULL DEFAULT 'Event', date TEXT NOT NULL DEFAULT '', startDate TEXT NOT NULL DEFAULT '',
          endDate TEXT NOT NULL DEFAULT '', host TEXT NOT NULL DEFAULT '비트코인 센터 서울',
          hostEn TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul', image TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
          icon TEXT NOT NULL DEFAULT 'calendar', sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    assertColumns(next, "events", eventColumns);
    assertColumns(next, "highlights", highlightColumns);
    next.exec(`
      CREATE TABLE IF NOT EXISTS center_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT CHECK (status IN ('open', 'event', 'closed')),
        selected_on TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collection_items (
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
      );
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL, titleEn TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL, descriptionEn TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS notice_slugs (
        slug TEXT PRIMARY KEY,
        notice_id INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS content_images (
      kind TEXT NOT NULL CHECK (kind IN ('event', 'highlight')),
      content_id INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0 AND position < 12),
      path TEXT NOT NULL,
      PRIMARY KEY (kind, content_id, position)
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      client_hash TEXT PRIMARY KEY,
      window_started INTEGER NOT NULL,
      failures INTEGER NOT NULL,
      blocked_until INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content_slugs (
      kind TEXT NOT NULL CHECK (kind IN ('event', 'highlight')),
      slug TEXT NOT NULL CHECK (length(slug) BETWEEN 1 AND 100),
      content_id INTEGER NOT NULL CHECK (content_id > 0),
      is_current INTEGER NOT NULL CHECK (is_current IN (0, 1)),
      PRIMARY KEY (kind, slug)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS content_slugs_current
      ON content_slugs (kind, content_id) WHERE is_current = 1;
    `);
    next.transaction(() => {
      for (const table of ["events", "highlights", "notices"] as const) {
        const columns = next.prepare<[], { readonly name: string }>(`PRAGMA table_info(${table})`).all();
        if (!columns.some(({ name }) => name === "tags")) {
          next.exec(`ALTER TABLE ${table} ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`);
        }
      }
    }).immediate();
    const sessionColumns = next.prepare<[], { readonly name: string }>("PRAGMA table_info(admin_sessions)").all();
    if (!sessionColumns.some(({ name }) => name === "last_seen_at")) {
      next.exec("ALTER TABLE admin_sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0");
    }
    if (!sessionColumns.some(({ name }) => name === "credential_version")) {
      next.exec("ALTER TABLE admin_sessions ADD COLUMN credential_version TEXT NOT NULL DEFAULT ''");
    }
    return next;
  } catch (error) {
    if (next.open) next.close();
    throw error;
  }
}

function assertColumns(
  db: Database.Database,
  table: "events" | "highlights",
  expected: readonly string[],
): void {
  const found = new Set(db.prepare<[], { readonly name: string }>(`PRAGMA table_info(${table})`).all().map(({ name }) => name));
  const missing = expected.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new ApiError(503, "INCOMPATIBLE_DATABASE", `SQLite ${table} 스키마가 호환되지 않습니다.`);
  }
}

export function getDatabase(): Database.Database {
  if (database) return database;
  const filename = configuredDatabasePath();
  let file: fs.Stats;
  try {
    file = fs.statSync(filename);
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(503, "DATABASE_UNAVAILABLE", "설정된 SQLite 데이터베이스를 열 수 없습니다.");
    }
    throw error;
  }
  if (!file.isFile()) throw new ApiError(503, "DATABASE_UNAVAILABLE", "설정된 SQLite 데이터베이스를 열 수 없습니다.");
  let existing: Database.Database;
  try {
    existing = new Database(filename, { fileMustExist: true });
    existing = initialize(existing, false);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) {
      throw new ApiError(503, "DATABASE_UNAVAILABLE", "설정된 SQLite 데이터베이스를 열 수 없습니다.");
    }
    throw error;
  }
  database = existing;
  return database;
}
