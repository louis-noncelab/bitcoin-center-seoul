import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma, input, eventIds, quoteFor, fromQuote } from "./event-integrity-fixture.mjs";
const { NextRequest } = await import("next/server.js");
const { createPasswordHash } = await import("../src/server/events/password.ts");
const { login, logout } = await import("../src/server/events/auth.ts");
const { adminEventsPost, adminEventPut, adminEventPatch } = await import("../src/server/events/handlers.ts");

test("authenticated event API reports capacity conflict and atomically closes checkout", async () => {
  // Given: an administrator creates a ten-seat event through the request handler.
  const password = randomUUID();
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash(password);
  const cookie = `bcs_admin_session=${await login(password, randomUUID())}`;
  const data = input();
  const request = (body, revision) => new NextRequest("http://127.0.0.1:3100/api/admin/events", {
    method: "POST", headers: { origin: "http://127.0.0.1:3100", cookie, "content-type": "application/json", ...(revision ? { "if-match": `"${revision}"` } : {}) }, body: JSON.stringify(body),
  });
  try {
    const created = await adminEventsPost(request(data));
    assert.equal(created.status, 201);
    const { data: event } = await created.json();
    eventIds.push(event.id);
    const context = { params: Promise.resolve({ id: String(event.id) }) };
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `MEETUP-${event.id}` } });
    await fromQuote(await quoteFor(variant, 8));
    // When: capacity is reduced below reservations, then registration is explicitly closed.
    const conflict = await adminEventPut(request({ ...data, ticketCapacity: 1 }, event.revision), context);
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error.code, "CAPACITY_BELOW_COMMITMENTS");
    const closed = await adminEventPatch(request({ registrationClosed: true }, event.revision), context);
    // Then: the API returns the unchanged capacity and new closed state; checkout refuses it.
    assert.equal(closed.status, 200);
    const { data: updated } = await closed.json();
    assert.equal(updated.ticketCapacity, 10);
    assert.equal(updated.registrationClosed, true);
    await assert.rejects(quoteFor(variant), { code: "PRODUCT_UNAVAILABLE" });
  } finally {
    await logout(request({}));
  }
});
