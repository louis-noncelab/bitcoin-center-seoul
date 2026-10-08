import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { waitForReady } from "./helpers/server-ready.mjs";

for (const duration of ["0ms", "983ms", "3.2s", "45s", "2.5min"]) {
  test(`readiness resolves on the formatter event ${duration}, including split chunks`, async () => {
    // Given listeners registered before the server emits any output.
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    const ready = waitForReady(child);
    // When the actual readiness token arrives across chunks, before an exit event.
    child.stdout.emit("data", "\u001b[32m✓ Ready ");
    child.stdout.emit("data", `in ${duration}\u001b[0m\n`);
    child.emit("exit", 1);
    // Then readiness won, and every startup listener is removed.
    await ready;
    assert.equal(child.stdout.listenerCount("data"), 0);
    assert.equal(child.listenerCount("exit"), 0);
    assert.equal(child.listenerCount("error"), 0);
  });
}

test("startup output without a complete readiness event rejects on exit", async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  const rejected = assert.rejects(waitForReady(child), /exited with code 1/);
  child.stdout.emit("data", "Starting...\nReady in ");
  child.emit("exit", 1);
  await rejected;
  assert.equal(child.stdout.listenerCount("data"), 0);
});
