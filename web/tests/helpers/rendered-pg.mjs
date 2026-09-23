import assert from "node:assert/strict";
import pg from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
assert.ok(databaseUrl, "Set TEST_DATABASE_URL to a disposable, migrated local PostgreSQL database");
const database = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
assert.match(database.pathname, /(?:test|regression|audit)/i, "Rendered tests may only reset a named test database");

export function renderedServerEnv({ origin, port, directory, uploads, passwordHash }) {
  return {
    PATH: process.env.PATH || "",
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    APP_MODE: "test",
    APP_ORIGIN: origin,
    DATABASE_URL: databaseUrl,
    DATA_DIR: directory,
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    PAYMENT_PROVIDER: "zaprite",
    PAYMENT_MODE: "review",
    EMAIL_MODE: "capture",
    TRUST_PROXY: "false",
    REVIEW_KRW_PER_BTC: "150000000",
    ADMIN_PASSWORD_HASH: passwordHash,
    BCS_EVENTS_UPLOADS: uploads,
    BCS_TRUST_PROXY: "false",
    __NEXT_PROCESSED_ENV: "true",
  };
}

export async function resetRenderedContent() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const table of [
      "content_images", "content_slugs", "notice_slugs", "review_slugs",
      "center_events", "center_highlights", "notices", "collection_items", "visit_reviews",
    ]) await client.query(`DELETE FROM ${table}`);
    await client.query("UPDATE review_selection SET featured_id = NULL, home_ids = '[]', revision = 1 WHERE id = 1");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
