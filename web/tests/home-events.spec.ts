import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, request, test, type APIRequestContext, type Locator } from "@playwright/test";
import { z } from "zod";
import { eventRecordSchema, type EventRecord } from "../src/lib/events-contract";
import { reviewRuntime } from "./helpers/review-runtime";

const eventResponse = z.object({ data: eventRecordSchema });
const eventsResponse = z.object({ data: z.array(eventRecordSchema) });
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const dateAt = (offset: number) => {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const pairedDate = dateAt(2);
const prefix = `home-browser-${randomUUID()}`;

async function selectDate(calendar: Locator, date: string, locale: "ko" | "en") {
  await calendar.locator(".calendar-month-toggle").click();
  await calendar.getByRole("textbox", { name: locale === "ko" ? "연도" : "Year", exact: true }).fill(date.slice(0, 4));
  await calendar.locator(`[data-calendar-month="${date.slice(0, 7)}"]`).click();
  await calendar.locator(`button[data-calendar-date="${date}"]`).click();
}

test.describe.serial("mobile home event discovery", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  let admin: APIRequestContext;
  const created: EventRecord[] = [];

  const records = async () => eventsResponse.parse(await (await admin.get("/api/admin/events")).json()).data;

  test.beforeAll(async ({ baseURL }) => {
    // The runtime path and exact origin prevent fixture writes outside the isolated review server.
    const runtime = await reviewRuntime();
    expect(baseURL).toBe(runtime.APP_ORIGIN);
    admin = await request.newContext({ baseURL: runtime.APP_ORIGIN, extraHTTPHeaders: { origin: runtime.APP_ORIGIN } });
    expect((await admin.post("/api/admin/login", { data: { password: runtime.ADMIN_PASSWORD } })).ok()).toBeTruthy();
    const upload = await admin.post("/api/admin/images", { multipart: {
      file: { name: "review-only-center-space.webp", mimeType: "image/webp", buffer: await readFile(new URL("../public/images/space-tour/lounge.webp", import.meta.url)) },
    } });
    expect(upload.ok()).toBeTruthy();
    const image = z.object({ data: z.object({ images: z.array(z.string()).min(1) }) }).parse(await upload.json()).data.images[0]!;

    // Deliberately insert out of chronological order, including two times on a dotted/ISO day.
    for (const [index, fixture] of [
      { offset: 10, time: "12:00" }, { offset: 2, time: "10:30" },
      { offset: 0, time: "00:01" }, { offset: 2, time: "09:30", dotted: true },
      { offset: 4, time: "12:00" }, { offset: 6, time: "12:00" }, { offset: 8, time: "12:00" },
    ].entries()) {
      const photo = fixture.offset === 0 ? image : "";
      const response = await admin.post("/api/admin/events", { data: {
        slug: `${prefix}-${index}`, tags: [],
        title: `[검토용] 홈 행사 ${index}`, titleEn: `[Review only] Home event ${index}`,
        date: fixture.dotted ? dateAt(fixture.offset).replaceAll("-", ".") : dateAt(fixture.offset), time: fixture.time,
        venueType: index === 1 ? "external" : "center",
        location: index === 1 ? "외부 행사장" : index === 2 ? "비트코인 센터 서울 (서울 마포구 신촌로2안길 30, 2층)" : "비트코인 센터 서울",
        locationEn: index === 1 ? "External venue" : index === 2 ? "Bitcoin Center Seoul (2F, 30 Sinchon-ro 2an-gil, Mapo-gu, Seoul)" : "Bitcoin Center Seoul",
        description: "모바일 홈 검토용 가상 일정입니다. 이미지는 기존 센터 공간 사진으로 행사 현장 사진이 아닙니다.",
        descriptionEn: "A fictional mobile home test event. The image shows the center space, not this event.",
        image: photo, images: photo ? [photo] : [], link: "",
      } });
      expect(response.ok()).toBeTruthy();
      created.push(eventResponse.parse(await response.json()).data);
    }
  });

  test.afterAll(async () => {
    if (!admin) return;
    for (const event of created) {
      const current = eventResponse.parse(await (await admin.get(`/api/admin/events/${event.id}`)).json()).data;
      const response = await admin.delete(`/api/admin/events/${event.id}`, { headers: { "if-match": `"${current.revision}"` } });
      expect(response.ok()).toBeTruthy();
    }
    await admin.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const locale of ["ko", "en"] as const) {
    test(`omits center locations only from lists and preserves external venues and details in ${locale}`, async ({ page, context }, testInfo) => {
      const external = locale === "ko" ? "외부 행사장" : "External venue";
      const center = locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul";
      for (const [width, theme] of [[320, "light"], [375, "dark"], [768, "light"], [1280, "dark"]] as const) {
        await page.setViewportSize({ width, height: 900 });
        await context.addCookies([{ name: "bcs-theme", value: theme, url: (await reviewRuntime()).APP_ORIGIN }]);
        await page.goto(`/${locale}`);
        await expect(page.locator(`.upcoming-card[href$="${prefix}-2"] .upcoming-meta`)).toHaveCount(0);
        await expect(page.locator(`.upcoming-card[href$="${prefix}-1"] .upcoming-meta`)).toHaveText(external);
        const calendar = page.locator(".home-event-calendar");
        await expect(calendar.locator(".home-calendar-event-location")).toHaveCount(0);
        await selectDate(calendar, pairedDate, locale);
        await expect(calendar.locator(".home-calendar-event-location")).toHaveText(external);
        await calendar.screenshot({ path: testInfo.outputPath(`${locale}-${width}-${theme}-calendar.png`) });
        await calendar.getByRole("button", { name: locale === "ko" ? "목록 보기" : "List view", exact: true }).click();
        await expect(calendar.locator(".home-calendar-event-location")).toHaveText(external);
        await page.goto(`/${locale}/programs`);
        await expect(page.locator(`.event-card[href$="${prefix}-2"] .event-card-location`)).toHaveCount(0);
        await expect(page.locator(`.event-card[href$="${prefix}-3"] .event-card-location`)).toHaveCount(0);
        await expect(page.locator(`.event-card[href$="${prefix}-1"] .event-card-location`)).toHaveText(external);
        await page.locator(".events-timeline").screenshot({ path: testInfo.outputPath(`${locale}-${width}-${theme}-programs.png`) });
        await page.locator(`.event-card[href$="${prefix}-2"]`).click();
        await expect(page.locator(".event-meta")).toContainText(center);
        await page.locator(".event-meta").screenshot({ path: testInfo.outputPath(`${locale}-${width}-${theme}-detail.png`) });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    });

    test(`puts the first five upcoming events above the hero in chronological order in ${locale}`, async ({ page }) => {
      const upcoming = (await records())
        .filter((event) => event.date.replaceAll(".", "-") >= today)
        .sort((a, b) => a.date.replaceAll(".", "-").localeCompare(b.date.replaceAll(".", "-"))
          || a.time.localeCompare(b.time, undefined, { numeric: true }) || a.id - b.id)
        .slice(0, 5);
      await page.goto(`/${locale}`);
      const section = page.locator(".home-upcoming");
      const cards = section.locator(".upcoming-card");
      await expect(cards).toHaveCount(5);
      expect(await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))))
        .toEqual(upcoming.map((event) => `/${locale}/programs/${event.slug || event.id}`));
      await expect(cards.first()).toContainText(locale === "ko" ? "오늘" : "Today");
      await expect(cards.first()).toContainText(locale === "ko" ? "[검토용]" : "[Review only]");
      await expect(cards.first().locator("img")).toBeVisible();
      await expect.poll(() => cards.first().locator("img").evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
      expect(await section.evaluate((element) => {
        const documentHeading = document.querySelector("main > h1");
        const spaceHeading = document.querySelector(".home-space h2");
        return documentHeading !== null && spaceHeading !== null
          && Boolean(documentHeading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
          && Boolean(element.compareDocumentPosition(spaceHeading) & Node.DOCUMENT_POSITION_FOLLOWING);
      })).toBe(true);
      await expect(cards.first()).toBeInViewport();
      const secondBox = await cards.nth(1).boundingBox();
      expect(secondBox).not.toBeNull();
      expect(secondBox!.x).toBeGreaterThan(0);
      expect(secondBox!.x).toBeLessThan(375);
      for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 812 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    });

    test(`keeps date selection and the day's events on the home page in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const calendar = page.locator(".home-event-calendar");
      await selectDate(calendar, pairedDate, locale);
      const fixtureLinks = calendar.locator(`.home-calendar-event[href*="${prefix}"]`);
      await expect(fixtureLinks).toHaveCount(2);
      await expect(fixtureLinks.first()).toHaveAttribute("href", `/${locale}/programs/${prefix}-3`);
      await expect(fixtureLinks.nth(1)).toHaveAttribute("href", `/${locale}/programs/${prefix}-1`);
      await expect(calendar.locator(`button[data-calendar-date="${pairedDate}"]`)).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(calendar.locator(".home-calendar-all")).toHaveAttribute("href", `/${locale}/programs#events`);

      await selectDate(calendar, dateAt(1), locale);
      await expect(calendar.locator(".home-calendar-empty")).toHaveText(locale === "ko" ? "이날은 등록된 행사가 없어요." : "No events are scheduled for this date.");
      await expect(calendar.locator(".home-calendar-event")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    });
  }

  test("supports arrows, numeric position and keyboard navigation without leaving the home page", async ({ page }) => {
    await page.goto("/ko");
    const section = page.locator(".home-upcoming");
    const cards = section.locator(".upcoming-card");
    const count = section.locator(".upcoming-count");
    const previous = section.getByRole("button", { name: "이전 행사", exact: true });
    const next = section.getByRole("button", { name: "다음 행사", exact: true });
    await expect(previous).toBeDisabled();
    await expect(count).toHaveText(/01\s*05/);
    await next.click();
    await expect(count).toHaveText(/02\s*05/);
    await cards.nth(4).focus();
    await page.keyboard.press("End");
    await expect(cards.last()).toBeFocused();
    await expect(next).toBeDisabled();
    await cards.nth(4).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(cards.nth(3)).toBeFocused();
    await expect.poll(async () => {
      const visibleFirst = await section.locator(".upcoming-track").evaluate(track => {
        const left = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).paddingLeft);
        const cards = Array.from(track.children);
        const first = cards.findIndex(card => card.getBoundingClientRect().right > left + 2);
        return String(first + 1).padStart(2, "0");
      });
      return (await count.textContent())?.replace(/\s/g, "") === `${visibleFirst}05`;
    }).toBe(true);
    await page.keyboard.press("Home");
    await expect(cards.first()).toBeFocused();
    await expect(previous).toBeDisabled();
    await page.keyboard.press("End");
    await expect(cards.last()).toBeFocused();
    await expect(next).toBeDisabled();
    await expect(page).toHaveURL(/\/ko$/);
  });

  test("keeps the complete details action inside every event card on phone and desktop", async ({ page }) => {
    await page.goto("/ko");
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator(".upcoming-card");
    await expect(cards).toHaveCount(5);
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await cards.evaluateAll((elements) => elements.map((element) => ({
        cardBottom: element.getBoundingClientRect().bottom,
        detailsBottom: element.querySelector(".upcoming-details")!.getBoundingClientRect().bottom,
      })));
      for (const [index, card] of bounds.entries()) {
        expect.soft(card.detailsBottom, `${width}px card ${index + 1}: details action must fit above the bottom border`)
          .toBeLessThanOrEqual(card.cardBottom);
      }
    }
  });

  test("a horizontal touch gesture moves the carousel on a narrow phone", async ({ page }) => {
    await page.goto("/ko");
    const track = page.locator(".upcoming-track");
    const bounds = await track.boundingBox();
    expect(bounds).not.toBeNull();
    const y = bounds!.y + Math.min(bounds!.height / 2, 160);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 330, y }] });
    for (const x of [280, 230, 180, 130, 70]) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
    await expect(page).toHaveURL(/\/ko$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await session.detach();
  });

  test("preserves 44px touch targets for carousel controls and calendar dates at phone widths", async ({ page }) => {
    await page.goto("/ko");
    for (const width of [320, 360, 375]) {
      await page.setViewportSize({ width, height: 812 });
      const controls = page.locator(".upcoming-controls button");
      const dates = page.locator(".home-event-calendar button[data-calendar-date]");
      await expect(controls).toHaveCount(2);
      expect(await dates.count()).toBeGreaterThanOrEqual(28);
      const clipped = await dates.evaluateAll(elements => elements.filter(element => {
        const bounds = element.getBoundingClientRect();
        const clip = element.closest(".slide-region-content")?.getBoundingClientRect();
        return clip && (bounds.left < clip.left - 0.5 || bounds.right > clip.right + 0.5);
      }).length);
      expect(clipped, `${width}px calendar tap targets must remain inside the slide clip`).toBe(0);
      for (const [name, targets] of [["carousel controls", controls], ["calendar dates", dates]] as const) {
        const sizes = await targets.evaluateAll((elements) => elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height };
        }));
        expect.soft(Math.min(...sizes.map((size) => size.width)), `${width}px ${name}: smallest tap width`).toBeGreaterThanOrEqual(44);
        expect.soft(Math.min(...sizes.map((size) => size.height)), `${width}px ${name}: smallest tap height`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("hides the whole upcoming section when an isolated database has only past events", async ({ page, request }) => {
    const directory = await mkdtemp(join(tmpdir(), "bcs-empty-home-"));
    let server: ReturnType<typeof spawn> | undefined;
    let temporaryDatabase: string | undefined;
    const runtime = await reviewRuntime();
    try {
      const standalone = join(directory, "server", "web");
      await cp(resolve(".next-events/standalone"), join(directory, "server"), { recursive: true });
      const database = join(directory, "events.db");
      let databaseUrl: string | undefined;
      if (runtime.DATABASE_URL) {
        temporaryDatabase = `bcs_home_browser_${randomUUID().replaceAll("-", "")}`;
        execFileSync("psql", [runtime.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE "${temporaryDatabase}"`], { stdio: "pipe" });
        const url = new URL(runtime.DATABASE_URL);
        url.pathname = `/${temporaryDatabase}`;
        databaseUrl = url.toString();
        const schema = execFileSync("pg_dump", ["--schema-only", "--no-owner", "--no-acl", runtime.DATABASE_URL], { stdio: "pipe" });
        execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: schema, stdio: "pipe" });
        execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", "INSERT INTO center_events (title, \"titleEn\", date, time, location, \"locationEn\", description, \"descriptionEn\") VALUES ('지난 행사', 'Past event', '2000-01-01', '12:00', '센터', 'Center', '지난 행사', 'Past event')"], { stdio: "pipe" });
        execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", "INSERT INTO review_selection (id) VALUES (1)"], { stdio: "pipe" });
      } else {
        execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e",
          'import { openDatabase } from "./src/server/events/db.ts"; const db = openDatabase(process.argv[1]); db.prepare("INSERT INTO events (title,titleEn,date,time,location,locationEn,description,descriptionEn) VALUES (?,?,?,?,?,?,?,?)").run("지난 행사", "Past event", "2000-01-01", "12:00", "센터", "Center", "지난 행사", "Past event"); db.close();', database],
        { env: { ...process.env, __NEXT_PROCESSED_ENV: "true" }, stdio: "pipe" });
      }
      const socket = createServer();
      socket.listen(0, "127.0.0.1");
      await once(socket, "listening");
      const address = socket.address();
      if (!address || typeof address === "string") throw new Error("Missing isolated server port");
      await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
      const origin = `http://127.0.0.1:${address.port}`;
      server = spawn(process.execPath, [join(standalone, "server.js")], {
        cwd: standalone, stdio: "ignore", env: {
          ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(address.port),
          APP_ORIGIN: origin, ...(databaseUrl ? { DATABASE_URL: databaseUrl, DATA_DIR: directory } : { BCS_EVENTS_DB: database }),
          BCS_EVENTS_UPLOADS: join(directory, "images"), BCS_EVENTS_REVIEW: "true",
          BCS_TRUST_PROXY: "false", __NEXT_PROCESSED_ENV: "true",
        },
      });
      await expect.poll(async () => {
        try { return (await request.get(`${origin}/api/events`)).status(); }
        catch (error) {
          if (error instanceof Error && error.message.includes("ECONNREFUSED")) return 0;
          throw error;
        }
      }).toBe(200);
      for (const locale of ["ko", "en"]) {
        const response = await page.goto(`${origin}/${locale}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator(".home-upcoming")).toHaveCount(0);
        await expect(page.locator(".home-event-calendar")).toBeVisible();
        await expect(page.locator(".home-calendar-empty")).toBeVisible();
        await expect(page.locator("main h1")).toHaveCount(1);
      }
    } finally {
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        await exited;
      }
      if (temporaryDatabase && runtime.DATABASE_URL) {
        execFileSync("psql", [runtime.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE "${temporaryDatabase}" WITH (FORCE)`], { stdio: "pipe" });
      }
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test.describe("mobile home lower-section width", () => {
  test.use({ viewport: { width: 320, height: 812 }, isMobile: true, hasTouch: true });

  for (const locale of ["ko", "en"] as const) {
    test(`keeps the news media grid and its cards within a 320px phone in ${locale}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const section = page.locator(".home-news");
      const grid = section.locator(".news-media-grid");
      const cards = grid.locator(".news-media-item");
      await grid.scrollIntoViewIfNeeded();
      await expect(grid).toBeInViewport();
      expect(await cards.count()).toBeGreaterThan(0);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const layout = await section.evaluate((element) => {
        const gridElement = element.querySelector<HTMLElement>(".news-media-grid")!;
        const sectionBounds = element.getBoundingClientRect();
        const gridBounds = gridElement.getBoundingClientRect();
        return {
          sectionWidth: sectionBounds.width,
          gridWidth: gridBounds.width,
          cards: Array.from(gridElement.querySelectorAll<HTMLElement>(".news-media-item"), (card) => {
            const bounds = card.getBoundingClientRect();
            return { left: bounds.left, right: bounds.right, width: bounds.width };
          }),
          gridLeft: gridBounds.left,
          gridRight: gridBounds.right,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect.soft(layout.gridWidth, `${locale} media grid width must fit its news section`).toBeLessThanOrEqual(layout.sectionWidth);
      for (const [index, card] of layout.cards.entries()) {
        expect.soft(card.width, `${locale} media card ${index + 1} width must fit the grid`).toBeLessThanOrEqual(layout.gridWidth);
        expect.soft(card.left, `${locale} media card ${index + 1} left edge must stay inside the grid`).toBeGreaterThanOrEqual(layout.gridLeft - 0.5);
        expect.soft(card.right, `${locale} media card ${index + 1} right edge must stay inside the grid`).toBeLessThanOrEqual(layout.gridRight + 0.5);
      }
      // Mobile overflow can enlarge innerWidth, so use the configured phone width as the limit.
      expect.soft(layout.scrollWidth, `${locale} document width must fit the configured phone`).toBeLessThanOrEqual(page.viewportSize()!.width);
    });
  }
});
