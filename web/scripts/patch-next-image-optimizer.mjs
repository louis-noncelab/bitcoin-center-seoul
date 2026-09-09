import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Backport https://github.com/vercel/next.js/pull/98168 until a verified release includes it.
// Keep the request socket, headers and body limit unchanged; detach only the mock response.
const version = "16.3.4";
const require = createRequire(import.meta.url);
const installedDirectory = dirname(require.resolve("next/package.json"));
const files = [
  {
    path: "dist/server/image-optimizer.js",
    original: "e9dae780db97eb11cbed0c5b1c872dc249fedfe9aab50132b43e5b54d34b47a8",
    patched: "044fc3fd98ff74f35f4bb83a84841e4934149cf745a7d2620567a46cd3d8d48a",
  },
  {
    path: "dist/esm/server/image-optimizer.js",
    original: "3ebd7bad4de250400b0f347cae2a17ab7ec03722914f3736260366df457e27d2",
    patched: "87b8d6d7936ea3b8826cc20fd400e8fdf382983c98a4e1f54285322a22b4bf0f",
  },
];
const before = "            maximumResponseBody\n        });\n        await handleRequest(mocked.req, mocked.res,";
const after = "            maximumResponseBody\n        });\n        // Preserve request metadata while detaching the internal response from client disconnects.\n        mocked.res.socket = null;\n        await handleRequest(mocked.req, mocked.res,";
const hash = (source) => createHash("sha256").update(source).digest("hex");

/** Verify both files before changing either; `check` never writes. Throws on version/source drift. */
export function applyPatch({ check = false, directory = installedDirectory } = {}) {
  if (JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version !== version) {
    throw new Error("Next image patch requires exactly 16.3.4; review the upstream fix before upgrading.");
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
    console.log("Usage: node scripts/patch-next-image-optimizer.mjs [apply|check|--help]\nPinned Next 16.3.4 CJS/ESM response-socket fix. check verifies without writing.");
  } else {
    try {
      console.log("Next image optimizer patch:", applyPatch({ check: command === "check" }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Next image optimizer patch failed.");
      process.exitCode = 1;
    }
  }
}
