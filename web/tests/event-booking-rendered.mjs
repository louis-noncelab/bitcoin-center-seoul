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
const visualReview = process.env.BCS_EVENT_BOOKING_VISUAL_REVIEW === "true";

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
      const response = await fetch(`${origin}/ko/programs`, { headers: { "cache-control": "no-store" } });
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

function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    attributes: Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1], attribute[2].replaceAll("&amp;", "&")])),
    content: match[2],
    index: match.index,
  }));
}

function bookingAnchors(html) {
  return anchors(html).filter(({ attributes }) => attributes.class?.split(/\s+/).includes("event-booking-link"));
}

function section(html, className) {
  const match = new RegExp(`<section\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/section>`).exec(html);
  assert.ok(match, `Missing ${className} section`);
  return match[0];
}

function assertNoNestedAnchors(html, pathname) {
  let open = false;
  for (const match of html.matchAll(/<\/?a\b[^>]*>/g)) {
    if (match[0].startsWith("</")) {
      assert.ok(open, `${pathname}: anchor closes without an opening tag`);
      open = false;
    } else {
      assert.ok(!open, `${pathname}: nested anchors`);
      open = true;
    }
  }
  assert.equal(open, false, `${pathname}: unclosed anchor`);
}

function assertBooking(anchor, href, locale, satb = true) {
  assert.equal(anchor.attributes.href, href, "Booking URL must preserve the event path, query and fragment");
  assert.equal(anchor.attributes.target, "_blank");
  const rel = anchor.attributes.rel?.split(/\s+/) || [];
  assert.ok(rel.includes("noopener") && rel.includes("noreferrer"));
  assert.match(anchor.content, locale === "ko" ? /새 창/ : /new window/i);
  if (satb) assert.match(anchor.content, locale === "ko" ? /샛비/ : /SatB/i);
  else assert.doesNotMatch(anchor.content, /샛비|SatB|Saturday Block/i);
  assert.match(anchor.content, locale === "ko" ? /예약/ : /book|reserve/i);
}

function relativeDate(today, offset) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function visualAssetLinks(links) {
  for (const [source, destination] of [
    [path.join(projectDirectory, "public"), path.join(standaloneDirectory, "public")],
    [path.join(projectDirectory, ".next-events", "static"), path.join(standaloneDirectory, ".next-events", "static")],
  ]) {
    try {
      fs.lstatSync(destination);
      continue;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    fs.symlinkSync(source, destination, "dir");
    links.push({ source, destination });
  }
}

test("event booking is available directly from bilingual home, schedule and detail pages", visualReview ? {} : { timeout: 60_000 }, async () => {
  assert.ok(fs.existsSync(serverFile), "Build .next-events/standalone/web/server.js before running this test.");

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-event-booking-rendered-"));
  const database = path.join(directory, "events.db");
  const uploads = path.join(directory, "images");
  const password = "event-booking-local-fixture-only";
  const createdAssetLinks = [];
  let child;

  try {
    if (visualReview) visualAssetLinks(createdAssetLinks);
    const [{ openDatabase }, { createPasswordHash }, { seoulDate }] = await Promise.all([
      import("../src/server/events/db.ts"),
      import("../src/server/events/password.ts"),
      import("../src/lib/center-status.ts"),
    ]);
    openDatabase(database).close();
    const passwordHash = await createPasswordHash(password);
    const today = seoulDate();
    const bookingUrl = "https://www.saturdayblock.com/events/rendered-booking?session=fixture&source=homepage#reserve";
    const pastUrl = "https://saturdayblock.com/events/rendered-past?session=fixture#archive";
    const imageName = visualReview ? "booking-cover.webp" : "booking-cover.png";
    const imagePath = `/images/uploads/${imageName}`;
    fs.mkdirSync(path.join(uploads, "uploads"), { recursive: true });
    if (visualReview) fs.copyFileSync(path.join(projectDirectory, "public", "images", "space-tour", "lounge.webp"), path.join(uploads, "uploads", imageName));
    else fs.writeFileSync(path.join(uploads, "uploads", imageName), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
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
    const baseInput = {
      slug: "booking-today", tags: [], title: "오늘 예약 행사", titleEn: "Today booking event",
      date: today, time: "19:00", location: "테스트 장소", locationEn: "Fixture venue",
      description: "예약 상세 본문 검증 문구", descriptionEn: "Booking detail body verification marker",
      image: imagePath, images: [imagePath], link: bookingUrl,
    };
    const fixtures = [
      baseInput,
      { ...baseInput, slug: "booking-without-link", title: "링크 없는 행사", titleEn: "Event without booking link", date: relativeDate(today, 1), image: "", images: [], link: "" },
      { ...baseInput, slug: "booking-past", title: "지난 예약 행사", titleEn: "Past booking event", date: relativeDate(today, -1), image: "", images: [], link: pastUrl },
    ];
    let todayEvent;
    for (const fixture of fixtures) {
      const created = await jsonRequest(origin, "/api/admin/events", cookie, {
        method: "POST", headers: { origin }, body: JSON.stringify(fixture),
      });
      if (fixture === baseInput) todayEvent = created.data;
    }

    for (const locale of ["ko", "en"]) {
      const home = await rendered(origin, `/${locale}`);
      const homeBooking = bookingAnchors(home);
      assert.equal(homeBooking.length, 2, `${locale} home needs direct booking in the carousel and today's calendar`);
      homeBooking.forEach((anchor) => assertBooking(anchor, bookingUrl, locale));
      for (const className of ["home-upcoming", "home-event-calendar"]) {
        const content = section(home, className);
        assert.equal(bookingAnchors(content).length, 1, `${className} needs one booking link`);
        assert.ok(anchors(content).some(({ attributes }) => attributes.href === `/${locale}/programs/${baseInput.slug}`), `${className} must keep the event detail link`);
      }
      assert.ok(anchors(home).some(({ attributes }) => attributes.href === `/${locale}/programs/booking-without-link`), "An event without a booking URL must keep its detail link");
      assertNoNestedAnchors(home, `/${locale}`);

      const programs = await rendered(origin, `/${locale}/programs`);
      const programBooking = bookingAnchors(programs);
      assert.equal(programBooking.length, 1, "Only the upcoming event with a URL gets a booking link");
      assertBooking(programBooking[0], bookingUrl, locale);
      for (const fixture of fixtures) {
        assert.ok(anchors(programs).some(({ attributes }) => attributes.href === `/${locale}/programs/${fixture.slug}`), `Missing detail link for ${fixture.slug}`);
      }
      assertNoNestedAnchors(programs, `/${locale}/programs`);

      const detail = await rendered(origin, `/${locale}/programs/${baseInput.slug}`);
      const detailArticle = /<article\b[^>]*class="event-detail"[^>]*>[\s\S]*?<\/article>/.exec(detail)?.[0];
      assert.ok(detailArticle, "Missing event detail article");
      const detailBooking = bookingAnchors(detailArticle);
      assert.equal(detailBooking.length, 1, "The upcoming detail page needs one prominent booking action");
      assertBooking(detailBooking[0], bookingUrl, locale);
      const galleryIndex = detailArticle.indexOf('class="photo-gallery"');
      const bodyIndex = detailArticle.indexOf(locale === "ko" ? baseInput.description : baseInput.descriptionEn);
      assert.ok(galleryIndex > detailBooking[0].index, "Booking must precede the image gallery");
      assert.ok(bodyIndex > detailBooking[0].index, "Booking must precede the long description");
      assertNoNestedAnchors(detail, `/${locale}/programs/${baseInput.slug}`);

      for (const fixture of fixtures.slice(1)) {
        const pathname = `/${locale}/programs/${fixture.slug}`;
        const html = await rendered(origin, pathname);
        assert.equal(bookingAnchors(html).length, 0, `${fixture.slug} must not offer a reservation action`);
        assert.ok(html.includes(locale === "ko" ? fixture.description : fixture.descriptionEn), `${fixture.slug} must remain readable`);
        assertNoNestedAnchors(html, pathname);
      }
    }

    const genericUrl = "https://saturdayblock.com.example.test/events/fixture?source=calendar&ticket=1#reserve";
    assert.ok(todayEvent);
    const genericEvent = (await jsonRequest(origin, `/api/admin/events/${todayEvent.id}`, cookie, {
      method: "PUT",
      headers: { origin, "if-match": `"${todayEvent.revision}"` },
      body: JSON.stringify({ ...baseInput, link: genericUrl }),
    })).data;
    for (const locale of ["ko", "en"]) {
      for (const [pathname, expected] of [[`/${locale}`, 2], [`/${locale}/programs`, 1], [`/${locale}/programs/${baseInput.slug}`, 1]]) {
        const html = await rendered(origin, pathname);
        const links = bookingAnchors(html);
        assert.equal(links.length, expected, `${pathname} must retain booking for other HTTP providers`);
        links.forEach((anchor) => assertBooking(anchor, genericUrl, locale, false));
      }
    }
    assert.equal(serverErrors, "", `Standalone server wrote to stderr: ${serverErrors}`);

    if (visualReview) {
      await jsonRequest(origin, `/api/admin/events/${todayEvent.id}`, cookie, {
        method: "PUT",
        headers: { origin, "if-match": `"${genericEvent.revision}"` },
        body: JSON.stringify(baseInput),
      });
      process.stdout.write(`EVENT_BOOKING_VISUAL_REVIEW origin=${origin} pid=${process.pid} fixture=${directory}\n`);
      await new Promise((resolve) => {
        const finish = () => {
          process.removeListener("SIGINT", finish);
          process.removeListener("SIGTERM", finish);
          resolve();
        };
        process.once("SIGINT", finish);
        process.once("SIGTERM", finish);
      });
    }
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
    }
    for (const { source, destination } of createdAssetLinks) {
      if (fs.lstatSync(destination, { throwIfNoEntry: false })?.isSymbolicLink() && fs.readlinkSync(destination) === source) fs.unlinkSync(destination);
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
