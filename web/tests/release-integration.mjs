import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { apps } = require("../deploy/ecosystem.config.cjs");
const environment = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, __NEXT_PROCESSED_ENV: "true" };

test("worker has independent supervision and the same protected commerce configuration as web", () => {
  const web = apps.find((app) => app.name === "bitcoin-center-seoul-web");
  const worker = apps.find((app) => app.name === "bitcoin-center-seoul-payments");
  assert.ok(web && worker);
  assert.equal(worker.script, "scripts/reconcile-payments.ts");
  assert.equal(worker.args, "--watch");
  assert.equal(worker.instances, 1);
  assert.equal(worker.exec_mode, "fork");
  assert.equal(worker.autorestart, true);
  assert.notEqual(worker.out_file, web.out_file);
  assert.notEqual(worker.error_file, web.error_file);
  for (const app of [web, worker]) {
    assert.ok(app.node_args.split(" ").includes("--env-file=/etc/bitcoin-center-seoul/commerce.env"));
    assert.equal(app.env.TRUST_PROXY, "true");
    assert.equal(app.env.APP_MODE, "production");
    assert.equal(app.env.EMAIL_MODE, "capture");
  }
  assert.equal(web.env.BCS_TRUST_PROXY, "true");
  assert.ok(worker.node_args.includes("--conditions=react-server"));
  assert.ok(worker.node_args.includes("--import=tsx"));
});

test("worker help and invalid arguments exit before configuration or database access", () => {
  for (const [args, code] of [[['--help'], 0], [['--invalid'], 1], [['--watch', '--watch'], 1]]) {
    const result = spawnSync(process.execPath, ["--conditions=react-server", "--import=tsx", "scripts/reconcile-payments.ts", ...args], {
      cwd: root, env: environment, encoding: "utf8", timeout: 15000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, code, result.stderr);
    assert.doesNotMatch(result.stderr, /maintenance\./);
  }
});

test("Node env-file preserves literal scrypt separators without shell expansion", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bcs-release-env-"));
  try {
    const file = join(directory, "fixture.env");
    await writeFile(file, "ADMIN_PASSWORD_HASH='scrypt$fixture$salt$hash'\n", { mode: 0o600 });
    const result = spawnSync(process.execPath, [`--env-file=${file}`, "--input-type=module", "-e",
      "import assert from 'node:assert/strict'; assert.equal(process.env.ADMIN_PASSWORD_HASH, 'scrypt$fixture$salt$hash');"], {
      env: environment, encoding: "utf8", timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("Prisma generates in a clean directory without DATABASE_URL or environment files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bcs-release-prisma-"));
  try {
    await mkdir(join(directory, "prisma"));
    await copyFile(join(root, "prisma/schema.prisma"), join(directory, "prisma/schema.prisma"));
    await copyFile(join(root, "prisma.config.ts"), join(directory, "prisma.config.ts"));
    await symlink(join(root, "node_modules"), join(directory, "node_modules"), "dir");
    const result = spawnSync(process.execPath, [join(root, "node_modules/prisma/build/index.js"), "generate"], {
      cwd: directory, env: environment, encoding: "utf8", timeout: 30000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok((await stat(join(directory, "src/generated/prisma/client.ts"))).size > 0);
    const { scripts } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    for (const hook of ["postinstall", "pretypecheck", "prebuild"]) assert.ok(scripts[hook].includes("npm run db:generate"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
