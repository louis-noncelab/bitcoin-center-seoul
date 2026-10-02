import assert from "node:assert/strict";
import test from "node:test";

process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
process.env.DATA_DIR = "/tmp";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYMENT_PROVIDER = "zaprite";
process.env.PAYMENT_MODE = "review";
process.env.EMAIL_MODE = "capture";
process.env.TRUST_PROXY = "false";
process.env.REVIEW_KRW_PER_BTC = "150000000";
process.env.ZAPRITE_API_KEY = "test-key";
process.env.ZAPRITE_WEBHOOK_SECRET = "test-secret";
process.env.ZAPRITE_ORG_ID = "org_test";

const { handleApi, HttpError } = await import("../src/server/http.ts");
const { ApiError } = await import("../src/server/events/errors.ts");
const { route } = await import("../src/server/events/http.ts");
const { safeLogWorkerFailure } = await import("../src/server/safe-log.ts");

const canary = "customer@example.invalid token=secret invoice=https://pay.zaprite.com/order/secret";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function captureErrors(action) {
  const original = console.error;
  const lines = [];
  console.error = (...items) => { lines.push(items.join(" ")); };
  try {
    const value = await action();
    return { value, lines };
  } finally {
    console.error = original;
  }
}

test("API failures emit safe request correlation fields and distinguish same-name errors", async () => {
  // Given two application errors with the same Error.name but different machine codes.
  const first = await captureErrors(() => handleApi(
    async () => { throw new HttpError(409, "ORDER_CONFLICT", `first ${canary}`); },
    { route: "api.fixture.create_order" },
  ));
  const second = await captureErrors(() => handleApi(
    async () => { throw new HttpError(404, "ORDER_NOT_FOUND", `second ${canary}`); },
    { route: "api.fixture.create_order" },
  ));

  // When their logs are parsed as structured fields.
  const firstLog = JSON.parse(first.lines[0]);
  const secondLog = JSON.parse(second.lines[0]);
  const firstBody = await first.value.json();

  // Then the safe code/status/request fields distinguish them without leaking sensitive text.
  assert.equal(firstLog.event, "api.request_failed");
  assert.equal(firstLog.route, "api.fixture.create_order");
  assert.equal(firstLog.errorName, "HttpError");
  assert.equal(firstLog.code, "ORDER_CONFLICT");
  assert.equal(firstLog.status, 409);
  assert.equal(firstLog.retryable, false);
  assert.match(firstLog.requestId, uuidPattern);
  assert.equal(firstBody.error.requestId, firstLog.requestId);
  assert.equal(secondLog.errorName, "HttpError");
  assert.equal(secondLog.code, "ORDER_NOT_FOUND");
  assert.match(secondLog.requestId, uuidPattern);
  assert.notEqual(secondLog.requestId, firstLog.requestId);
  assert.equal(`${first.lines.join("\n")}\n${second.lines.join("\n")}`.includes(canary), false);
});

test("worker failures emit safe job correlation fields without raw error text", async () => {
  // Given a worker failure whose original message contains customer data and provider URLs.
  const { lines } = await captureErrors(() => {
    safeLogWorkerFailure({
      event: "maintenance.pass_failed",
      jobRunId: "8f4f75c1-365d-44af-85c3-a77f5d0f3360",
      stage: "payments.maintenance",
      retryable: true,
      error: new Error(`provider failed for ${canary}`),
    });
  });

  // When the log is parsed by field.
  const entry = JSON.parse(lines[0]);

  // Then only allowlisted operational fields are present.
  assert.equal(entry.event, "maintenance.pass_failed");
  assert.equal(entry.jobRunId, "8f4f75c1-365d-44af-85c3-a77f5d0f3360");
  assert.equal(entry.stage, "payments.maintenance");
  assert.equal(entry.code, "UNEXPECTED_ERROR");
  assert.equal(entry.retryable, true);
  assert.equal(entry.errorName, "Error");
  assert.equal(lines[0].includes(canary), false);
});

test("content API wrapper emits fixed route identifiers without leaking request paths", async () => {
  // Given the content API wrapper receives a route ID instead of deriving one from a URL.
  const { value, lines } = await captureErrors(() => route(
    async () => { throw new ApiError(404, "NOT_FOUND", `missing ${canary}`); },
    { route: "api.notices.detail" },
  ));

  // When the error response and log are parsed.
  const entry = JSON.parse(lines[0]);
  const body = await value.json();

  // Then the route is a fixed identifier, not a tokenized request path or raw provider URL.
  assert.equal(entry.event, "api.request_failed");
  assert.equal(entry.route, "api.notices.detail");
  assert.equal(entry.errorName, "ApiError");
  assert.equal(entry.code, "NOT_FOUND");
  assert.equal(entry.status, 404);
  assert.equal(body.error.requestId, entry.requestId);
  assert.equal(lines[0].includes(canary), false);
});

test("worker failure codes and count names require an explicit allowlist", async () => {
  const entries = [];
  for (const code of ["PRIVATE_CUSTOMER_TOKEN", "PROVIDER_UNAVAILABLE"]) {
    const { lines } = await captureErrors(() => safeLogWorkerFailure({
      event: "email.queue_failed",
      jobRunId: "8f4f75c1-365d-44af-85c3-a77f5d0f3360",
      stage: "email.queue",
      retryable: false,
      error: Object.assign(new Error("fixture"), { code }),
      counts: { checked: 2, privateCustomerKey: 3 },
    }));
    entries.push(JSON.parse(lines[0]));
  }
  assert.equal(entries[0].code, "UNEXPECTED_ERROR");
  assert.equal(entries[1].code, "PROVIDER_UNAVAILABLE");
  assert.deepEqual(entries[0].counts, { checked: 2 });
  assert.equal(JSON.stringify(entries).includes("PRIVATE_CUSTOMER_TOKEN"), false);
});
