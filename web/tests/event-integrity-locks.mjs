import assert from "node:assert/strict";
import test from "node:test";
import { prisma, fixture, quoteFor, fromQuote, setEventRegistration, syncEventTicket, getEvent } from "./event-integrity-fixture.mjs";

async function waitForBlocked(blocker) {
  const deadline = performance.now() + 3000;
  while (performance.now() < deadline) {
    const rows = await prisma.$queryRaw`SELECT pid FROM pg_stat_activity WHERE ${blocker} = ANY(pg_blocking_pids(pid))`;
    if (rows[0]) return rows[0].pid;
  }
  assert.fail("Expected the operation to wait on a PostgreSQL row lock.");
}

test("closing keeps the event locked until its ticket commits, blocking stale sync and checkout", async () => {
  // Given: an available quote and a real transaction deliberately holding the product lock.
  const { event, product, variant } = await fixture();
  const quote = await quoteFor(variant);
  const locked = Promise.withResolvers();
  const release = Promise.withResolvers();
  const holder = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${product.id} FOR UPDATE`;
    const [row] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
    locked.resolve(row.pid);
    await release.promise;
  }, { timeout: 10000 });
  const pending = [];
  try {
    const blocker = await locked.promise;
    // When: close is blocked on Product while holding Event; checkout and stale sync queue behind it.
    const closing = setEventRegistration(event.id, true, event.revision);
    pending.push(closing);
    const closer = await waitForBlocked(blocker);
    const ordering = fromQuote(quote);
    pending.push(ordering);
    await waitForBlocked(closer);
    const syncing = syncEventTicket(event, 0);
    pending.push(syncing);
    release.resolve();
    const results = await Promise.allSettled(pending);
    // Then: close/sync succeed, the waiting checkout observes the closed event, and no hold is acquired.
    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    assert.equal(results[1].reason.code, "PRODUCT_UNAVAILABLE");
    assert.equal(results[2].status, "fulfilled");
    assert.equal((await getEvent(event.id)).registrationClosed, true);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, false);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).reservedStock, 0);
  } finally {
    release.resolve();
    await holder;
    await Promise.allSettled(pending);
  }
});
