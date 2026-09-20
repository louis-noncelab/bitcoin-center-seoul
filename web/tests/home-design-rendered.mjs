import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { test } from "node:test";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const standaloneDirectory = path.join(projectDirectory, ".next-events", "standalone", "web");
const serverFile = path.join(standaloneDirectory, "server.js");

function unusedPort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      assert.ok(address && typeof address === "object");
      socket.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Standalone server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`${origin}/ko`, { headers: { "cache-control": "no-store" } });
      if (response.status === 200) return;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Standalone server did not become ready within 30 seconds.");
}

async function jsonRequest(origin, pathname, cookie, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  assert.ok(response.ok, `${options.method || "GET"} ${pathname} returned ${response.status}: ${JSON.stringify(body)}`);
  return { response, data: body.data };
}

async function rendered(origin, pathname) {
  const response = await fetch(`${origin}${pathname}`, { headers: { "cache-control": "no-store" } });
  assert.equal(response.status, 200, `${pathname} did not render successfully`);
  return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi"))].map((match) => ({
    attributes: Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1], attribute[2].replaceAll("&amp;", "&")])),
    content: match[2],
  }));
}

function hasClass({ attributes }, className) {
  return attributes.class?.split(/\s+/).includes(className) ?? false;
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|#x20);/g, " ").replace(/\s+/g, " ").trim();
}

function relativeDate(today, offset) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function assertHomeStructure(html, locale) {
  assert.equal(tags(html, "h1").length, 1, `${locale} home must have one document heading`);
  const spaceHeading = tags(html, "h2").find((heading) => plainText(heading.content) === (locale === "ko" ? "공간 둘러보기" : "Inside the center"));
  assert.ok(spaceHeading, `${locale} home must expose the space section as an h2`);
  assert.ok(tags(html, "section").some((element) => hasClass(element, "home-news")), `${locale} home must preserve the news section`);
}

test("rendered home keeps its heading hierarchy and truthful event navigation", { timeout: 60_000 }, async () => {
  assert.ok(fs.existsSync(serverFile), "Build .next-events/standalone/web/server.js before running this test.");

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-home-design-rendered-"));
  const database = path.join(directory, "events.db");
  const uploads = path.join(directory, "images");
  const password = "home-design-local-fixture-only";
  let child;

  try {
    const [{ openDatabase }, { createPasswordHash }, { seoulDate }] = await Promise.all([
      import("../src/server/events/db.ts"),
      import("../src/server/events/password.ts"),
      import("../src/lib/center-status.ts"),
    ]);
    openDatabase(database).close();
    const passwordHash = await createPasswordHash(password);
    const today = seoulDate();
    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
    fs.mkdirSync(uploads, { recursive: true });
    child = spawn(process.execPath, [serverFile], {
      cwd: standaloneDirectory,
      env: {
        PATH: process.env.PATH || "",
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        APP_ORIGIN: origin,
        ADMIN_PASSWORD_HASH: passwordHash,
        BCS_EVENTS_DB: database,
        BCS_EVENTS_UPLOADS: uploads,
        BCS_EVENTS_REVIEW: "true",
        BCS_TRUST_PROXY: "false",
        __NEXT_PROCESSED_ENV: "true",
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let serverErrors = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { serverErrors = `${serverErrors}${chunk}`.slice(-4_000); });
    await waitForServer(origin, child);

    const login = await jsonRequest(origin, "/api/admin/login", "", {
      method: "POST", headers: { origin }, body: JSON.stringify({ password }),
    });
    const cookie = login.response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie?.startsWith("bcs_admin_session="), "Admin login did not set a session cookie");

    for (const locale of ["ko", "en"]) {
      const html = await rendered(origin, `/${locale}`);
      assertHomeStructure(html, locale);
      assert.equal(tags(html, "section").filter((element) => hasClass(element, "home-upcoming")).length, 0, "No events must omit the upcoming section");
    }

    const baseInput = {
      slug: "home-design-one", tags: [], title: "홈 디자인 행사 1", titleEn: "Home design event 1",
      date: today, time: "19:00", location: "비트코인 센터 서울", locationEn: "Bitcoin Center Seoul",
      description: "홈 SSR 설계 검증", descriptionEn: "Home SSR design fixture",
      image: "", images: [], link: "",
    };
    await jsonRequest(origin, "/api/admin/events", cookie, { method: "POST", headers: { origin }, body: JSON.stringify(baseInput) });

    for (const locale of ["ko", "en"]) {
      const html = await rendered(origin, `/${locale}`);
      assertHomeStructure(html, locale);
      const upcoming = tags(html, "section").find((element) => hasClass(element, "home-upcoming"));
      assert.ok(upcoming, "One event must render the upcoming section");
      assert.equal(tags(upcoming.content, "button").filter((element) => hasClass(element, "upcoming-arrow")).length, 0, "One event must not render carousel arrows");
      assert.ok(tags(upcoming.content, "a").some(({ attributes }) => attributes.href === `/${locale}/programs/${baseInput.slug}`), "The event detail link must remain internal");
      assert.ok(tags(html, "a").some(({ attributes }) => attributes.href === `/${locale}/programs#events`), "The calendar must keep its internal all-events link");
    }

    for (const offset of [1, 2]) {
      await jsonRequest(origin, "/api/admin/events", cookie, {
        method: "POST", headers: { origin }, body: JSON.stringify({
          ...baseInput,
          slug: `home-design-${offset + 1}`,
          title: `홈 디자인 행사 ${offset + 1}`,
          titleEn: `Home design event ${offset + 1}`,
          date: relativeDate(today, offset),
        }),
      });
    }

    for (const locale of ["ko", "en"]) {
      const html = await rendered(origin, `/${locale}`);
      const upcoming = tags(html, "section").find((element) => hasClass(element, "home-upcoming"));
      assert.ok(upcoming, "Multiple events must render the upcoming section");
      assert.match(upcoming.content, /class="upcoming-count"[^>]*>\s*<strong>01<\/strong>\s*<span class="upcoming-count-line"><\/span>\s*03<\/span>/, "Pagination must expose the current and actual event count");
      assert.equal(tags(upcoming.content, "button").filter((element) => hasClass(element, "upcoming-arrow")).length, 2, "Multiple events need exactly two arrow controls");
      assert.equal(tags(upcoming.content, "button").length, 2, "Dot navigation must not remain beside the two arrows");
    }
    assert.equal(serverErrors, "", `Standalone server wrote to stderr: ${serverErrors}`);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
