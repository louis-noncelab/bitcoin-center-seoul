import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const traceFile = resolve(root, ".next/server/app/og/[kind]/[id]/route.js.nft.json");
const trace = JSON.parse(await readFile(traceFile, "utf8"));
const files = new Set(trace.files.map((file) => resolve(dirname(traceFile), file)));

test("the share route trace excludes unrelated project sources and tests", () => {
  const unrelated = [...files].filter((file) =>
    file.startsWith(resolve(root, "tests") + "/") ||
    file.startsWith(resolve(root, "src") + "/"),
  );
  assert.equal(unrelated.length, 0, `Unexpected traced files: ${unrelated.slice(0, 5).join(", ")}`);
});

test("the share route trace retains its brand assets and image processor", () => {
  assert.ok(files.has(resolve(root, "public/brand/share-default.jpg")));
  assert.ok(files.has(resolve(root, "public/brand/bcs-horizontal-reverse.png")));
  assert.ok(files.has(resolve(root, "node_modules/sharp/package.json")));
});
