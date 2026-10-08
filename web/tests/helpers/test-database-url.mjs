const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export class TestDatabaseUrlSafetyError extends Error {
  constructor(code, field) {
    super(`${field}:${code}`);
    this.name = "TestDatabaseUrlSafetyError";
    this.code = code;
    this.field = field;
  }
}

function parseSafeTestDatabaseUrl(value, field) {
  if (typeof value !== "string" || value.length === 0) return { ok: false, code: "MISSING_INPUT", field };
  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, code: "INVALID_URL", field };
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return { ok: false, code: "UNSUPPORTED_PROTOCOL", field };
  if (url.searchParams.has("host") || url.searchParams.has("port")) return { ok: false, code: "CONNECTION_IDENTITY_OVERRIDE", field };
  if (!loopbackHosts.has(url.hostname)) return { ok: false, code: "NON_LOOPBACK_HOST", field };
  if (!url.pathname || url.pathname === "/") return { ok: false, code: "MISSING_DATABASE_NAME", field };
  const encodedName = url.pathname.slice(1);
  if (encodedName.includes("/")) return { ok: false, code: "INVALID_DATABASE_PATH", field };
  let databaseName;
  try {
    databaseName = decodeURIComponent(encodedName);
  } catch {
    return { ok: false, code: "INVALID_DATABASE_ENCODING", field };
  }
  if (!databaseName || databaseName.includes("/")) return { ok: false, code: "INVALID_DATABASE_NAME", field };
  if (!databaseName.endsWith("_test")) return { ok: false, code: "UNSAFE_DATABASE_NAME", field };
  return { ok: true, url, databaseName };
}

export function safeTestDatabaseUrlOutcome(value, field = "TEST_DATABASE_URL") {
  return parseSafeTestDatabaseUrl(value, field);
}

export function assertSafeTestDatabaseUrl(value, field = "TEST_DATABASE_URL") {
  const outcome = parseSafeTestDatabaseUrl(value, field);
  if (!outcome.ok) throw new TestDatabaseUrlSafetyError(outcome.code, outcome.field);
  return outcome.url;
}
