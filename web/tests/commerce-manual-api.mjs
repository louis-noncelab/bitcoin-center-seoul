import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const root = mkdtempSync(join(tmpdir(), "bcs-manual-api-"));
const origin = "http://127.0.0.1:3198";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to an isolated, migrated local PostgreSQL database");
Object.assign(process.env, { APP_MODE: "test", APP_ORIGIN: origin, DATA_DIR: root,
  DATABASE_URL: process.env.TEST_DATABASE_URL, PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 6).toString("base64"), BCS_EVENTS_DB: join(root, "events.db"),
});
const { createPasswordHash } = await import("../src/server/events/password.ts");
const { openDatabase, getDatabase } = await import("../src/server/events/db.ts");
const { login } = await import("../src/server/events/auth.ts");
const paymentRoute = await import("../src/app/api/admin/orders/[id]/payment/route.ts");
const cancelRoute = await import("../src/app/api/admin/orders/[id]/cancel-paid/route.ts");
const refundRoute = await import("../src/app/api/admin/orders/[id]/refund/route.ts");
const context = { params: Promise.resolve({ id: "test-order" }) };
let cookie;
before(async () => {
  const password = randomUUID();
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash(password);
  openDatabase(process.env.BCS_EVENTS_DB).close();
  cookie = `bcs_admin_session=${await login(password, "manual-api-test")}`;
});
after(() => { getDatabase().close(); rmSync(root, { recursive: true, force: true }); });
const request = (body, extra = {}, method = "POST") => new Request(`${origin}/api/admin/orders/test-order/payment`, {
  method, headers: { origin, cookie, "content-type": "application/json", ...extra }, ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
});
for (const [name, handler] of [["manual", paymentRoute.POST], ["cancel-paid", cancelRoute.POST], ["refund", refundRoute.POST], ["refresh", paymentRoute.PATCH]]) {
  test(`${name}: unauthenticated or cross-origin requests stop before database access`, async () => {
    assert.equal((await handler(request({}, { cookie: "" }), context)).status, 401);
    assert.equal((await handler(request({}, { origin: "https://untrusted.invalid" }), context)).status, 403);
    assert.equal((await handler(request({}, { "sec-fetch-site": "cross-site" }), context)).status, 403);
  });
}
test("manual decisions require a reason, exact version and allowed decision", async () => {
  const valid = { paymentId: "payment", expectedPaymentUpdatedAt: new Date().toISOString(), reason: "operator proof", decision: "PAID" };
  for (const patch of [{ reason: " " }, { expectedPaymentUpdatedAt: "" }, { decision: "REFUNDED" }, { unknown: true }]) {
    assert.equal((await paymentRoute.POST(request({ ...valid, ...patch }), context)).status, 400);
  }
});
test("external refund recording requires Bitcoin method, proof and explicit inventory decision", async () => {
  const valid = { paymentId: "payment", expectedPaymentUpdatedAt: new Date().toISOString(), reason: "operator proof", method: "LIGHTNING", proof: "reference", restock: false };
  for (const patch of [{ proof: " " }, { restock: undefined }, { method: "" }, { method: "BANK" }, { method: "OTHER" }]) {
    assert.equal((await refundRoute.POST(request({ ...valid, ...patch }), context)).status, 400);
  }
});
test("private payment history never accepts a guest order cookie as administrator auth", async () => {
  assert.equal((await paymentRoute.GET(request(null, { cookie: "bcs_order_test-order=guest" }, "GET"), context)).status, 401);
});
