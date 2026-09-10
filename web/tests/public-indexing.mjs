import assert from "node:assert/strict";
import { after, test } from "node:test";
import { publicIndexingEnabled } from "../src/lib/public-indexing.ts";

const original = process.env.BCS_PUBLIC_INDEXING;
after(() => {
  if (original === undefined) delete process.env.BCS_PUBLIC_INDEXING;
  else process.env.BCS_PUBLIC_INDEXING = original;
});

test("review environments stay unindexed without explicit publication", () => {
  delete process.env.BCS_PUBLIC_INDEXING;
  assert.equal(publicIndexingEnabled(), false);
});

test("only the explicit production publication setting enables indexing", () => {
  process.env.BCS_PUBLIC_INDEXING = "true";
  assert.equal(publicIndexingEnabled(), true);
});

test("false or misspelled settings keep indexing disabled", () => {
  for (const value of ["false", "TRUE", "1", ""]) {
    process.env.BCS_PUBLIC_INDEXING = value;
    assert.equal(publicIndexingEnabled(), false);
  }
});
