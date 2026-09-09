import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { applyPatch } from "../scripts/patch-next-image-optimizer.mjs";

const require = createRequire(import.meta.url);
const { fetchInternalImage, ImageError } = require("next/dist/server/image-optimizer.js");
const { serveStatic } = require("next/dist/server/serve-static.js");

test("internal image bytes complete after the requester disconnects", async (t) => {
  // Given a real file and a requester whose socket is already closed, without a timing race.
  const directory = await mkdtemp(join(tmpdir(), "bcs-image-abort-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=", "base64");
  await writeFile(join(directory, "disconnect.png"), bytes);
  const socket = Object.assign(new EventEmitter(), {
    writable: false, destroyed: true, encrypted: true, remoteAddress: "192.0.2.1",
  });
  const request = { method: "HEAD", socket, headers: { authorization: "fixture-only" } };
  let deadline;
  t.after(() => clearTimeout(deadline));

  // When the installed optimizer reads through its actual static-file handler.
  const result = await Promise.race([
    fetchInternalImage("/disconnect.png", request, {}, bytes.length, (req, res) => {
      assert.equal(req.socket.encrypted, true);
      assert.equal(req.socket.remoteAddress, "192.0.2.1");
      assert.equal(req.method, "GET");
      assert.deepEqual(req.headers, {});
      return serveStatic(req, res, "disconnect.png", { root: directory });
    }),
    new Promise((_resolve, reject) => {
      deadline = setTimeout(() => reject(new Error("Internal image fetch remained pending after requester disconnect")), 2_000);
    }),
  ]);

  // Then disconnecting the client cannot strand the internal image transfer.
  assert.deepEqual(result.buffer, bytes);
  assert.equal(result.contentType, "image/png");
});

test("internal image response still rejects a body above its configured limit", async () => {
  await assert.rejects(
    fetchInternalImage("/oversized.png", { method: "GET", socket: null }, {}, 8, (_req, res) => {
      res.end(Buffer.alloc(9));
    }),
    (error) => error instanceof ImageError && error.statusCode === 413,
  );
});

test("the pinned installer rejects drift before writing and applies exactly once", async (t) => {
  // Given isolated copies of the exact installed files, with the response-socket hunk removed.
  const directory = await mkdtemp(join(tmpdir(), "bcs-image-patch-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const paths = ["dist/server/image-optimizer.js", "dist/esm/server/image-optimizer.js"];
  const insertion = "        // Preserve request metadata while detaching the internal response from client disconnects.\n        mocked.res.socket = null;\n";
  const sources = await Promise.all(paths.map((path) => readFile(require.resolve(`next/${path}`), "utf8")));
  for (const [index, path] of paths.entries()) {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), sources[index].replace(insertion, ""));
  }
  const metadata = join(directory, "package.json");
  await writeFile(metadata, JSON.stringify({ version: "16.3.4" }));
  const originals = await Promise.all(paths.map((path) => readFile(join(directory, path), "utf8")));

  // When verification finds an omitted patch, an unexpected version or either changed source.
  assert.throws(() => applyPatch({ directory, check: true }), /patch is missing/);
  await writeFile(metadata, JSON.stringify({ version: "16.3.5" }));
  assert.throws(() => applyPatch({ directory }), /requires exactly 16\.3\.4/);
  await writeFile(metadata, JSON.stringify({ version: "16.3.4" }));
  for (const [index, path] of paths.entries()) {
    await writeFile(join(directory, path), `${originals[index]}\n// unexpected source\n`);
    assert.throws(() => applyPatch({ directory }), /Unrecognized Next image optimizer bytes/);
    const other = index === 0 ? 1 : 0;
    assert.equal(await readFile(join(directory, paths[other]), "utf8"), originals[other]);
    await writeFile(join(directory, path), originals[index]);
  }

  // Then only the known sources are changed, and subsequent apply/check runs make no changes.
  assert.deepEqual(applyPatch({ directory }), { version: "16.3.4", applied: 2, verified: 2 });
  assert.deepEqual(applyPatch({ directory }), { version: "16.3.4", applied: 0, verified: 2 });
  assert.deepEqual(applyPatch({ directory, check: true }), { version: "16.3.4", applied: 0, verified: 2 });
});
