import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { databaseNameFromUrl, dbPrefix, dbUser, expandTestFiles, parseCommand } from "../scripts/pg-review.mjs";

test("review commands reject unsupported actions and non-file arguments before setup", () => {
  for (const args of [
    ["dropdb"], ["init", "--force"], ["test", "--config", "other.ts"],
    ["test", "tests/../playwright.config.ts"], ["test", "/tmp/other.spec.ts"],
  ]) assert.throws(() => parseCommand(args));
  assert.deepEqual(parseCommand(["test", "tests/motion.spec.ts"]), {
    command: "test", args: ["tests/motion.spec.ts"],
  });
});

test("CLI argument failure exits before database tools can run", () => {
  const result = spawnSync(process.execPath, ["scripts/pg-review.mjs", "dropdb"], {
    cwd: new URL("../", import.meta.url),
    env: { PATH: "", HOME: process.env.HOME, __NEXT_PROCESSED_ENV: "true" },
    encoding: "utf8", timeout: 15_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.doesNotMatch(result.stderr, /ENOENT|spawn/);
});

test("test selection expands only named files, not motion suffix matches", () => {
  assert.deepEqual(expandTestFiles(["motion.spec.ts"]), ["tests/motion.spec.ts"]);
  assert.deepEqual(expandTestFiles(["tests/motion.spec.ts"]), ["tests/motion.spec.ts"]);
  assert.deepEqual(expandTestFiles(["tests/content-motion.spec.ts", "admin-email.spec.ts"]), [
    "tests/content-motion.spec.ts", "tests/admin-email.spec.ts",
  ]);
});

test("cleanup identity accepts only this runner connection and database namespace", () => {
  const name = `${dbPrefix}0123456789abcdef_test`;
  const valid = `postgresql://${encodeURIComponent(dbUser)}@127.0.0.1:5432/${name}`;
  assert.equal(databaseNameFromUrl(valid), name);
  for (const value of [
    valid.replace(name, "center_test"),
    valid.replace(name, `${dbPrefix}0123456789abcdef`),
    valid.replace("127.0.0.1", "db.example.invalid"),
    valid.replace(":5432", ":6432"),
    `${valid}?host=db.example.invalid`,
    `${valid}?port=6432`,
    `${valid}?user=other`,
    `${valid}?password=review-fixture`,
  ]) assert.throws(() => databaseNameFromUrl(value));
});
