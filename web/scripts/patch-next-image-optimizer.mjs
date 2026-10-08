import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Backport https://github.com/vercel/next.js/pull/98168 until a verified release includes it.
// Keep the request socket, headers and body limit unchanged; detach only the mock response.
const version = "16.3.8";
const require = createRequire(import.meta.url);
const installedDirectory = dirname(require.resolve("next/package.json"));
const files = [
  {
    path: "dist/server/image-optimizer.js",
    original: "38b92fde5bc72aa23c999d283052da11a6dfb36be75c2d92683d539551065a3c",
    patched: "331e10c6c971a8f91d8b7c4e7ab41db213c6e76408b238796ef7f63761432738",
  },
  {
    path: "dist/esm/server/image-optimizer.js",
    original: "b5dd6849f39477e7e17f61e3428d53a548f2d83d8837fb03274ab59a4f576f34",
    patched: "e1c5cf98afcd91d4739d9b8ecb6cc2613d1c63d4f0d43e187c0dc844aee1b66d",
  },
];
const before = "            maximumResponseBody\n        });\n        await handleRequest(mocked.req, mocked.res,";
const after = "            maximumResponseBody\n        });\n        // Preserve request metadata while detaching the internal response from client disconnects.\n        mocked.res.socket = null;\n        await handleRequest(mocked.req, mocked.res,";
const hash = (source) => createHash("sha256").update(source).digest("hex");

/** Verify both files before changing either; `check` never writes. Throws on version/source drift. */
export function applyPatch({ check = false, directory = installedDirectory } = {}) {
  if (JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version !== version) {
    throw new Error("Next image patch requires exactly 16.3.8; review the upstream fix before upgrading.");
  }
  const changes = [];
  for (const file of files) {
    const path = join(directory, file.path);
    const source = readFileSync(path);
    const digest = hash(source);
    if (digest === file.patched) continue;
    if (digest !== file.original) throw new Error(`Unrecognized Next image optimizer bytes: ${file.path}`);
    if (check) throw new Error(`Next image patch is missing: ${file.path}. Run npm run postinstall.`);
    const patched = source.toString("utf8").replace(before, after);
    if (hash(patched) !== file.patched) throw new Error(`Next image patch output mismatch: ${file.path}`);
    changes.push({ path, patched });
  }
  for (const change of changes) writeFileSync(change.path, change.patched);
  return { version, applied: changes.length, verified: files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command = "apply", ...extra] = process.argv.slice(2);
  if (extra.length || !["apply", "check", "--help", "help"].includes(command)) {
    console.error("Usage: node scripts/patch-next-image-optimizer.mjs [apply|check|--help]");
    process.exitCode = 1;
  } else if (command === "--help" || command === "help") {
    console.log("Usage: node scripts/patch-next-image-optimizer.mjs [apply|check|--help]\nPinned Next 16.3.8 CJS/ESM response-socket fix. check verifies without writing.");
  } else {
    try {
      console.log("Next image optimizer patch:", applyPatch({ check: command === "check" }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Next image optimizer patch failed.");
      process.exitCode = 1;
    }
  }
}
