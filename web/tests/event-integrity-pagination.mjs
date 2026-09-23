import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "./event-integrity-fixture.mjs";
const { listHighlights, listHighlightsPage } = await import("../src/server/events/index.ts");

test("bounded highlight pages preserve legacy end/start/dotted-date order and clamp pages", async () => {
  // Given: more than two pages, with tied dates, ranges and inactive highlights.
  const marker = randomUUID();
  const fixtures = await Promise.all(Array.from({ length: 28 }, (_, index) => prisma.centerHighlight.create({ data: {
    title: marker, titleEn: marker, description: marker, descriptionEn: marker,
    date: index % 3 === 0 ? "" : `2099.09.${String(index % 20 + 1).padStart(2, "0")}`,
    startDate: index % 3 === 0 ? "2099-10-01" : "",
    endDate: index % 3 === 0 ? "2099-10-02" : "", isActive: index === 0 ? 0 : 1,
  } })));
  try {
    const ordered = (await listHighlights()).map((row) => row.id);
    // When: each public page is read through the bounded production query.
    const pages = await Promise.all([listHighlightsPage(1), listHighlightsPage(2), listHighlightsPage(10000), listHighlightsPage(-1)]);
    // Then: ordering, 12-row limits and existing page clamping agree.
    assert.deepEqual(pages[0].highlights.map((row) => row.id), ordered.slice(0, 12));
    assert.deepEqual(pages[1].highlights.map((row) => row.id), ordered.slice(12, 24));
    assert.equal(pages[2].page, Math.ceil(ordered.length / 12));
    assert.deepEqual(pages[2].highlights.map((row) => row.id), ordered.slice((pages[2].page - 1) * 12));
    assert.equal(pages[3].page, 1);
  } finally {
    await prisma.centerHighlight.deleteMany({ where: { id: { in: fixtures.map((row) => row.id) } } });
  }
});
