import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { safeTestDatabaseUrlOutcome } from "./helpers/test-database-url.mjs";

const node = process.execPath;
const cwd = new URL("../", import.meta.url);
const isolatedEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  __NEXT_PROCESSED_ENV: "true",
};

function runModule(source, env = {}) {
  return spawnSync(node, ["--import", "tsx", "--input-type=module", "-e", source], {
    cwd,
    env: { ...isolatedEnv, ...env },
    encoding: "utf8",
    timeout: 15_000,
  });
}

function parsedStdout(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.error, undefined);
  return JSON.parse(result.stdout);
}

test("database URL validator rejects unsafe machine classes before helper use", () => {
  const cases = [
    ["missing", undefined, "MISSING_INPUT"],
    ["public-host", "postgresql://user:pass@db.example.com:5432/center_test", "NON_LOOPBACK_HOST"],
    ["bad-protocol", "mysql://127.0.0.1:5432/center_test", "UNSUPPORTED_PROTOCOL"],
    ["query-host", "postgresql://127.0.0.1:5432/center_test?host=db.example.invalid", "CONNECTION_IDENTITY_OVERRIDE"],
    ["query-port", "postgresql://127.0.0.1:5432/center_test?port=6432", "CONNECTION_IDENTITY_OVERRIDE"],
    ["misleading-substring", "postgresql://127.0.0.1:5432/contest", "UNSAFE_DATABASE_NAME"],
    ["encoded-slash", "postgresql://127.0.0.1:5432/prod%2Fcenter_test", "INVALID_DATABASE_NAME"],
    ["path-segment", "postgresql://127.0.0.1:5432/prod/center_test", "INVALID_DATABASE_PATH"],
  ];
  for (const [name, value, code] of cases) {
    const outcome = safeTestDatabaseUrlOutcome(value);
    assert.deepEqual({ name, ok: outcome.ok, code: outcome.code, field: outcome.field }, {
      name, ok: false, code, field: "TEST_DATABASE_URL",
    });
  }
});

test("database URL validator accepts documented loopback test database names", () => {
  const cases = [
    ["ipv4", "postgresql://127.0.0.1:3634/center_test", "center_test"],
    ["localhost", "postgres://localhost:3634/bcs_improve_boundaries_valid_test", "bcs_improve_boundaries_valid_test"],
    ["ipv6", "postgresql://[::1]:3634/bcs_improve_boundaries_ipv6_test", "bcs_improve_boundaries_ipv6_test"],
  ];
  for (const [name, value, databaseName] of cases) {
    const outcome = safeTestDatabaseUrlOutcome(value);
    assert.equal(outcome.ok, true, name);
    assert.equal(outcome.databaseName, databaseName);
  }
});

test("pg content environment rejects unsafe database URL before assigning runtime", () => {
  const result = runModule("await import('./tests/helpers/pg-content-env.mjs'); console.log(JSON.stringify({ sentinel: 'IMPORT_OK' }));", {
    TEST_DATABASE_URL: "postgresql://db.example.com:5432/center_test",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NON_LOOPBACK_HOST/);
  assert.equal(result.stdout, "");
});

test("rendered PostgreSQL helper rejects misleading test substrings before reset is reachable", () => {
  const result = runModule("await import('./tests/helpers/rendered-pg.mjs'); console.log(JSON.stringify({ sentinel: 'IMPORT_OK' }));", {
    TEST_DATABASE_URL: "postgresql://127.0.0.1:5432/contest",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UNSAFE_DATABASE_NAME/);
  assert.equal(result.stdout, "");
});

test("pg content environment accepts loopback star-test runtime without opening a connection", () => {
  const result = runModule("await import('./tests/helpers/pg-content-env.mjs'); console.log(JSON.stringify({ sentinel: 'IMPORT_OK', appMode: process.env.APP_MODE, databaseUrl: process.env.DATABASE_URL }));", {
    TEST_DATABASE_URL: "postgresql://localhost:3634/bcs_improve_boundaries_pg_test",
  });
  assert.deepEqual(parsedStdout(result), {
    sentinel: "IMPORT_OK",
    appMode: "test",
    databaseUrl: "postgresql://localhost:3634/bcs_improve_boundaries_pg_test",
  });
});

test("review runtime credentials reject public database hosts and origin mismatch", () => {
  const directory = mkdtempSync(join(tmpdir(), "bcs-review-runtime-safety-"));
  try {
    const credentials = join(directory, "credentials.json");
    const runCredentials = (record, env = {}) => {
      writeFileSync(credentials, JSON.stringify(record), { mode: 0o600 });
      return parsedStdout(runModule(`
        import { reviewRuntime } from './tests/helpers/review-runtime.ts';
        try {
          await reviewRuntime();
          console.log(JSON.stringify({ sentinel: 'ACCEPTED' }));
        } catch (error) {
          console.log(JSON.stringify({ sentinel: 'REJECTED', name: error.name, message: error.message }));
        }
      `, { COMMERCE_REVIEW_CREDENTIALS: credentials, ...env }));
    };
    const valid = {
      env: {
        APP_ORIGIN: "http://127.0.0.1:3102",
        APP_MODE: "review",
        PAYMENT_MODE: "review",
        EMAIL_MODE: "capture",
        DATABASE_URL: "postgresql://127.0.0.1:3634/bcs_improve_boundaries_review_test",
      },
      password: "fixture-password",
    };
    assert.deepEqual(runCredentials({ ...valid, env: { ...valid.env, DATABASE_URL: "postgresql://db.example.com:5432/center_test" } }), {
      sentinel: "REJECTED",
      name: "Error",
      message: "DATABASE_URL:NON_LOOPBACK_HOST",
    });
    assert.deepEqual(runCredentials(valid, { COMMERCE_REVIEW_ORIGIN: "http://127.0.0.1:3199" }), {
      sentinel: "REJECTED",
      name: "Error",
      message: "APP_ORIGIN:ORIGIN_MISMATCH",
    });
    assert.deepEqual(runCredentials({ ...valid, env: { ...valid.env, DATABASE_URL: `${valid.env.DATABASE_URL}?host=db.example.invalid` } }), {
      sentinel: "REJECTED",
      name: "Error",
      message: "DATABASE_URL:CONNECTION_IDENTITY_OVERRIDE",
    });
    assert.deepEqual(runCredentials({ ...valid, env: { ...valid.env, APP_ORIGIN: "ftp://127.0.0.1:3102" } }), {
      sentinel: "REJECTED",
      name: "Error",
      message: "REVIEW_ORIGIN:UNSUPPORTED_PROTOCOL",
    });
    assert.deepEqual(runCredentials({ ...valid, env: { ...valid.env, APP_ORIGIN: "http://user:secret@127.0.0.1:3102" } }), {
      sentinel: "REJECTED",
      name: "Error",
      message: "REVIEW_ORIGIN:INVALID_ORIGIN_IDENTITY",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("review runtime credentials reject mismatched modes and accept owned loopback database URL", () => {
  const directory = mkdtempSync(join(tmpdir(), "bcs-review-runtime-mode-"));
  try {
    const credentials = join(directory, "credentials.json");
    const runCredentials = (record) => {
      writeFileSync(credentials, JSON.stringify(record), { mode: 0o600 });
      return parsedStdout(runModule(`
        import { reviewRuntime } from './tests/helpers/review-runtime.ts';
        try {
          const runtime = await reviewRuntime();
          console.log(JSON.stringify({ sentinel: 'ACCEPTED', appOrigin: runtime.APP_ORIGIN, databaseUrl: runtime.DATABASE_URL }));
        } catch (error) {
          console.log(JSON.stringify({ sentinel: 'REJECTED', name: error.name }));
        }
      `, { COMMERCE_REVIEW_CREDENTIALS: credentials }));
    };
    const valid = {
      env: {
        APP_ORIGIN: "http://localhost:3102",
        APP_MODE: "review",
        PAYMENT_MODE: "review",
        EMAIL_MODE: "capture",
        DATABASE_URL: "postgresql://[::1]:3634/bcs_improve_boundaries_runtime_test",
      },
      password: "fixture-password",
    };
    assert.deepEqual(runCredentials({ ...valid, env: { ...valid.env, PAYMENT_MODE: "sandbox" } }), {
      sentinel: "REJECTED",
      name: "ZodError",
    });
    assert.deepEqual(runCredentials(valid), {
      sentinel: "ACCEPTED",
      appOrigin: "http://localhost:3102",
      databaseUrl: "postgresql://[::1]:3634/bcs_improve_boundaries_runtime_test",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
