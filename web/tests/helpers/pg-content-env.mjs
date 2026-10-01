import assert from "node:assert/strict";

const localDatabaseHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const safeDatabaseName = /^(?:bcs(?:_[a-z0-9]+)*_test(?:_[a-z0-9]+)*|center_test(?:_[a-z0-9]+)?)$/;

export function requireSafeTestDatabaseUrl(raw = process.env.TEST_DATABASE_URL) {
  assert.ok(raw, "Set TEST_DATABASE_URL to an isolated, migrated local PostgreSQL database");
  let database;
  try {
    database = new URL(raw);
  } catch {
    assert.fail("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }
  assert.ok(["postgres:", "postgresql:"].includes(database.protocol), "TEST_DATABASE_URL must use PostgreSQL");
  assert.equal(database.searchParams.has("host"), false, "TEST_DATABASE_URL must not override the loopback host");
  assert.ok(localDatabaseHosts.has(database.hostname), "TEST_DATABASE_URL must use a loopback hostname");
  const name = decodeURIComponent(database.pathname).replace(/^\/+/, "");
  assert.match(name, safeDatabaseName, "TEST_DATABASE_URL must name an approved test database");
  return raw;
}

const testDatabaseUrl = requireSafeTestDatabaseUrl();

Object.assign(process.env, {
  APP_MODE: "test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  DATABASE_URL: testDatabaseUrl,
  DATA_DIR: "/tmp",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review",
  EMAIL_MODE: "capture",
  TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
});
