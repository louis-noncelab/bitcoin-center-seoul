import assert from "node:assert/strict";

assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to an isolated, migrated local PostgreSQL database");
Object.assign(process.env, {
  APP_MODE: "test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review",
  EMAIL_MODE: "capture",
  TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
});
