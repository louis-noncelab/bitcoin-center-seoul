import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const baseEnv = {
  HOME: process.env.HOME ?? "",
  PATH: process.env.PATH ?? "",
  NEXT_TELEMETRY_DISABLED: "1",
  __NEXT_PROCESSED_ENV: "true",
};

function runImport(source, env = {}) {
  const probe = `
    import { Socket } from "node:net";
    Socket.prototype.connect = function () {
      throw Object.assign(new Error(), { code: "UNSAFE_DATABASE_CONNECTION" });
    };
    try {
      ${source}
    } catch (error) {
      console.error(JSON.stringify({ code: error.code ?? error.name }));
      process.exitCode = 1;
    }
  `;
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "--eval", probe], {
    cwd: process.cwd(),
    env: { ...baseEnv, ...env },
    encoding: "utf8",
    timeout: 20_000,
  });
}

function assertRejected(result) {
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.deepEqual(JSON.parse(result.stderr.trim()), { code: "ERR_ASSERTION" });
}

const helperImport = "await import('./tests/helpers/pg-content-env.mjs');";

test("PostgreSQL test setup requires the explicit TEST_DATABASE_URL opt-in", () => {
  // Given no test database opt-in, when the helper initializes, then it rejects before setup.
  assertRejected(runImport(helperImport));
});

test("PostgreSQL test setup rejects remote and malformed database URLs", () => {
  // Given inert invalid URLs, when the helper initializes, then it rejects without probing them.
  for (const value of [
    "postgresql://db.example.invalid:5432/bcs_admin_test_45",
    "postgresql://127.0.0.1:5432/bcs_admin_test_45?host=/var/run/postgresql",
    "not a url",
  ]) assertRejected(runImport(helperImport, { TEST_DATABASE_URL: value }));
});

test("PostgreSQL test setup rejects non-test database names before a connection attempt", () => {
  // Given a synchronous connection canary, when a non-test identity is supplied, then the guard rejects first.
  assertRejected(runImport(helperImport, { TEST_DATABASE_URL: "postgresql://127.0.0.1:5432/center_production" }));
});

test("PostgreSQL test setup accepts approved local fixture database names", () => {
  // Given recognized fixture database names, when the helper initializes, then safe test setup succeeds.
  for (const value of [
    "postgresql://127.0.0.1:5432/bcs_admin_test_issue45",
    "postgresql://localhost:5432/bcs_pr_test_20261001_deadbeef",
    "postgresql://[::1]:5432/center_test",
  ]) assert.equal(runImport(helperImport, { TEST_DATABASE_URL: value }).status, 0);
});

test("destructive PostgreSQL test entrypoints reject an invalid identity before connecting", () => {
  // Given a synchronous connection canary, when the real entrypoints initialize, then each guard rejects first.
  for (const entrypoint of [
    "./tests/admin-security.mjs",
    "./tests/security-rate-limits.mjs",
    "./tests/helpers/rendered-pg.mjs",
  ]) {
    const result = runImport(`await import(${JSON.stringify(entrypoint)});`, {
      TEST_DATABASE_URL: "postgresql://127.0.0.1:5432/center_production",
    });
    assertRejected(result);
  }
});
