import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminListQuery } from "../src/server/admin/list-query.ts";
import { listAdminOrders } from "../src/server/orders/list.ts";

function query(search) {
  return parseAdminListQuery(new URL(`http://127.0.0.1/admin/orders?${search}`));
}

test("admin list query rejects calendar dates that do not round-trip", () => {
  for (const value of ["2026-02-31", "2025-02-29", "2026-13-01", "2026-01-00"]) {
    assert.throws(() => query(`from=${value}`), { status: 400, code: "INVALID_INPUT" });
    assert.throws(() => query(`to=${value}`), { status: 400, code: "INVALID_INPUT" });
  }
});

test("admin order listing rejects invalid date filters before database access", async () => {
  await assert.rejects(
    listAdminOrders(new URL("http://127.0.0.1/api/admin/orders?from=2026-02-31")),
    { status: 400, code: "INVALID_INPUT" },
  );
});

test("admin list query preserves leap day and month-end KST boundaries", () => {
  assert.equal(query("from=2024-02-29").from.toISOString(), "2024-02-28T15:00:00.000Z");
  assert.equal(query("to=2024-02-29").to.toISOString(), "2024-02-29T14:59:59.999Z");
  assert.equal(query("from=2026-04-30").from.toISOString(), "2026-04-29T15:00:00.000Z");
  assert.equal(query("to=2026-04-30").to.toISOString(), "2026-04-30T14:59:59.999Z");
});

test("admin list query rejects inverted date ranges", () => {
  assert.throws(() => query("from=2026-05-01&to=2026-04-30"), { status: 400, code: "INVALID_INPUT" });
});

test("admin list query preserves valid four-digit years below 0100", () => {
  assert.equal(query("from=0096-02-29").from.toISOString(), "0096-02-28T15:00:00.000Z");
  assert.equal(query("to=0096-02-29").to.toISOString(), "0096-02-29T14:59:59.999Z");
  assert.equal(query("from=0001-01-01").from.toISOString(), "0000-12-31T15:00:00.000Z");
  assert.equal(query("from=0000-02-29").from.toISOString(), "0000-02-28T15:00:00.000Z");
  assert.throws(() => query("from=0099-02-29"), { status: 400, code: "INVALID_INPUT" });
});
