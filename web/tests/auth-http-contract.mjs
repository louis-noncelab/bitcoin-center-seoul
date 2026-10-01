import assert from "node:assert/strict";
import { test } from "node:test";

process.env.__NEXT_PROCESSED_ENV = "true";
Object.assign(process.env, {
  APP_MODE: "test",
  APP_ORIGIN: "http://127.0.0.1:3199",
  DATABASE_URL: "postgresql://127.0.0.1/bcs_issue43_unused",
  DATA_DIR: "/tmp",
  TOKEN_ENCRYPTION_KEY: `${"A".repeat(43)}=`,
  PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review",
  EMAIL_MODE: "capture",
  TRUST_PROXY: "false",
});

const { NextRequest } = await import("next/server.js");
const { route } = await import("../src/server/events/http.ts");
const { requireAdmin } = await import("../src/server/events/auth.ts");
const { ApiError, configurationError } = await import("../src/server/events/errors.ts");
const { handleApi, HttpError, json } = await import("../src/server/http.ts");
const { requireAccount } = await import("../src/server/auth/index.ts");
const eventsRoute = await import("../src/app/api/admin/events/route.ts");
const productsRoute = await import("../src/app/api/admin/products/route.ts");

const origin = process.env.APP_ORIGIN;
const canary = "ISSUE43_SECRET_CANARY";

async function inspect(response) {
  return { status: response.status, body: await response.json() };
}

function assertNoCanary(value) {
  assert.equal(JSON.stringify(value).includes(canary), false);
}

test("safe auth errors keep status and code across content and commerce wrappers", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...items) => { logs.push(items.map(String).join(" ")); };
  try {
    for (const error of [
      configurationError(canary),
      new ApiError(503, "DATABASE_UNAVAILABLE", canary),
      new ApiError(401, "UNAUTHORIZED", "관리자 인증이 필요합니다."),
    ]) {
      const content = await inspect(await route(async () => { throw error; }));
      const commerce = await inspect(await handleApi(async () => { throw error; }));
      assert.equal(content.status, commerce.status);
      assert.equal(content.body.error.code, commerce.body.error.code);
      assert.equal(content.body.error.code, error.code);
      assertNoCanary(content.body);
      assertNoCanary(commerce.body);
    }

    assert.equal(logs.length, 0);
  } finally {
    console.error = originalError;
  }
});

test("auth failures stop protected handlers before later work executes", async () => {
  let contentExecuted = false;
  const content = await inspect(await route(async () => {
    await requireAdmin(new NextRequest(`${origin}/api/admin/events`, { headers: { origin } }));
    contentExecuted = true;
    return new Response("unreachable");
  }));

  let commerceExecuted = false;
  const commerce = await inspect(await handleApi(async () => {
    await requireAccount(new Request(`${origin}/api/admin/products`));
    commerceExecuted = true;
    return json({ unreachable: true });
  }));

  assert.equal(content.status, 401);
  assert.equal(content.body.error.code, "UNAUTHORIZED");
  assert.equal(contentExecuted, false);
  assert.equal(commerce.status, 401);
  assert.equal(commerce.body.error.code, "AUTH_REQUIRED");
  assert.equal(commerceExecuted, false);
});

test("both wrappers preserve forbidden fields and mask server failure fields", async () => {
  const forbiddenFields = { account: "FIXTURE_ACCESS_DENIED" };
  for (const wrapper of [route, handleApi]) {
    const forbidden = await inspect(await wrapper(async () => {
      throw new HttpError(403, "FORBIDDEN", "fixture", forbiddenFields);
    }));
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.code, "FORBIDDEN");
    assert.deepEqual(forbidden.body.error.fields, forbiddenFields);

    const unavailable = await inspect(await wrapper(async () => {
      throw new HttpError(503, "DATABASE_UNAVAILABLE", canary, { config: canary });
    }));
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.body.error.code, "DATABASE_UNAVAILABLE");
    assert.equal(Object.hasOwn(unavailable.body.error, "fields"), false);
    assertNoCanary(unavailable.body);
  }
});

test("actual admin content and commerce routes share safe auth behavior", async () => {
  const content = await inspect(await eventsRoute.POST(new NextRequest(`${origin}/api/admin/events`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  })));
  const commerce = await inspect(await productsRoute.GET(new Request(`${origin}/api/admin/products`)));

  assert.equal(content.status, 401);
  assert.equal(content.body.error.code, "UNAUTHORIZED");
  assert.equal(commerce.status, 401);
  assert.equal(commerce.body.error.code, "AUTH_REQUIRED");
  assertNoCanary(content.body);
  assertNoCanary(commerce.body);
});

test("unexpected errors remain masked and do not log sensitive details", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...items) => { logs.push(items.map(String).join(" ")); };
  try {
    const content = await inspect(await route(async () => { throw new Error(canary); }));
    const commerce = await inspect(await handleApi(async () => { throw new Error(canary); }));

    assert.equal(content.status, 500);
    assert.equal(content.body.error.code, "INTERNAL_ERROR");
    assert.equal(commerce.status, 500);
    assert.equal(commerce.body.error.code, "INTERNAL_ERROR");
    assertNoCanary(content.body);
    assertNoCanary(commerce.body);
    assert.equal(logs.length, 1);
    assertNoCanary(logs);
  } finally {
    console.error = originalError;
  }
});
