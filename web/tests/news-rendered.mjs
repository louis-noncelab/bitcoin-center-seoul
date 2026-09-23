import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { test } from "node:test";
import { renderedServerEnv, resetRenderedContent } from "./helpers/rendered-pg.mjs";

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
      const { port } = address;
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Standalone server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`${origin}/ko/news`, { headers: { "cache-control": "no-store" } });
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
  const response = await fetch(`${origin}${pathname}`, {
    headers: { "cache-control": "no-store" },
  });
  assert.equal(response.status, 200, `${pathname} did not render successfully`);
  return response.text();
}

test("published news and media follow real API visibility changes in standalone SSR", { timeout: 60_000 }, async () => {
  assert.ok(fs.existsSync(serverFile), "Build .next-events/standalone/web/server.js before running this test.");

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-news-rendered-"));
  const uploads = path.join(directory, "images");
  const password = "news-rendered-local-fixture-only";
  let child;

  try {
    const { createPasswordHash } = await import("../src/server/events/password.ts");
    await resetRenderedContent();
    const passwordHash = await createPasswordHash(password);

    fs.mkdirSync(path.join(uploads, "uploads"), { recursive: true });
    const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    fs.writeFileSync(path.join(uploads, "uploads", "published-cover.png"), imageBytes);
    fs.writeFileSync(path.join(uploads, "uploads", "hidden-cover.png"), imageBytes);

    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [serverFile], {
      cwd: standaloneDirectory,
      env: renderedServerEnv({ origin, port, directory, uploads, passwordHash }),
      stdio: ["ignore", "ignore", "pipe"],
    });
    let serverErrors = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { serverErrors = `${serverErrors}${chunk}`.slice(-4_000); });
    await waitForServer(origin, child);

    const login = await jsonRequest(origin, "/api/admin/login", "", {
      method: "POST",
      headers: { origin },
      body: JSON.stringify({ password }),
    });
    const cookie = login.response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie?.startsWith("bcs_admin_session="), "Admin login did not set a session cookie");
    const mutationHeaders = { origin };

    const noticeInput = {
      slug: "rendered-notice",
      tags: [],
      title: "렌더링 공개 공지",
      titleEn: "Rendered published notice",
      description: "실제 SSR 공지 픽스처",
      descriptionEn: "Real SSR notice fixture",
      is_active: 0,
    };
    let notice = (await jsonRequest(origin, "/api/admin/notices", cookie, {
      method: "POST", headers: mutationHeaders, body: JSON.stringify(noticeInput),
    })).data;

    const hiddenNoticeInput = { ...noticeInput, slug: "hidden-rendered-notice", title: "숨겨진 공지", titleEn: "Hidden notice" };
    const hiddenNotice = (await jsonRequest(origin, "/api/admin/notices", cookie, {
      method: "POST", headers: mutationHeaders, body: JSON.stringify(hiddenNoticeInput),
    })).data;

    const highlightInput = {
      slug: "rendered-journal",
      tags: [],
      title: "렌더링 공개 저널",
      titleEn: "Rendered published journal",
      meta: "기록",
      metaEn: "Record",
      category: "현장",
      categoryEn: "Center",
      date: "2026-09-20",
      startDate: "",
      endDate: "",
      host: "비트코인 센터 서울",
      hostEn: "Bitcoin Center Seoul",
      description: "실제 SSR 저널 픽스처",
      descriptionEn: "Real SSR journal fixture",
      image: "/images/uploads/published-cover.png",
      images: ["/images/uploads/published-cover.png"],
      link: "",
      icon: "calendar",
      sort_order: 0,
      is_active: 0,
    };
    let journal = (await jsonRequest(origin, "/api/admin/highlights", cookie, {
      method: "POST", headers: mutationHeaders, body: JSON.stringify(highlightInput),
    })).data;

    const hiddenHighlightInput = {
      ...highlightInput,
      slug: "hidden-rendered-journal",
      title: "숨겨진 저널",
      titleEn: "Hidden journal",
      image: "/images/uploads/hidden-cover.png",
      images: ["/images/uploads/hidden-cover.png"],
    };
    const hiddenJournal = (await jsonRequest(origin, "/api/admin/highlights", cookie, {
      method: "POST", headers: mutationHeaders, body: JSON.stringify(hiddenHighlightInput),
    })).data;
    const publishedImage = journal.image;
    const hiddenImage = hiddenJournal.image;

    for (const locale of ["ko", "en"]) {
      const draftHtml = await rendered(origin, `/${locale}/news`);
      assert.ok(!draftHtml.includes(locale === "ko" ? noticeInput.title : noticeInput.titleEn));
      assert.ok(!draftHtml.includes(locale === "ko" ? highlightInput.title : highlightInput.titleEn));
    }

    notice = (await jsonRequest(origin, `/api/admin/notices/${notice.id}`, cookie, {
      method: "PUT",
      headers: { ...mutationHeaders, "if-match": `"${notice.revision}"` },
      body: JSON.stringify({ ...noticeInput, is_active: 1 }),
    })).data;
    journal = (await jsonRequest(origin, `/api/admin/highlights/${journal.id}`, cookie, {
      method: "PUT",
      headers: { ...mutationHeaders, "if-match": `"${journal.revision}"` },
      body: JSON.stringify({ ...highlightInput, image: publishedImage, images: journal.images, is_active: 1 }),
    })).data;

    for (const locale of ["ko", "en"]) {
      const html = await rendered(origin, `/${locale}/news`);
      assert.ok(html.includes(locale === "ko" ? noticeInput.title : noticeInput.titleEn));
      assert.ok(html.includes(locale === "ko" ? highlightInput.title : highlightInput.titleEn));
      assert.ok(html.includes(`href="/${locale}/notices/${noticeInput.slug}"`));
      assert.ok(html.includes(`href="/${locale}/journal/${highlightInput.slug}"`));
      assert.ok(!html.includes(locale === "ko" ? hiddenNoticeInput.title : hiddenNoticeInput.titleEn));
      assert.ok(!html.includes(locale === "ko" ? hiddenHighlightInput.title : hiddenHighlightInput.titleEn));

      const homeHtml = await rendered(origin, `/${locale}`);
      assert.ok(homeHtml.includes(locale === "ko" ? noticeInput.title : noticeInput.titleEn));
      assert.ok(homeHtml.includes(locale === "ko" ? highlightInput.title : highlightInput.titleEn));
      assert.ok(!homeHtml.includes(locale === "ko" ? hiddenNoticeInput.title : hiddenNoticeInput.titleEn));
      assert.ok(!homeHtml.includes(locale === "ko" ? hiddenHighlightInput.title : hiddenHighlightInput.titleEn));

      const mediaHtml = await rendered(origin, `/${locale}/news?view=media`);
      assert.ok(mediaHtml.includes(publishedImage));
      assert.ok(mediaHtml.includes(`href="/${locale}/journal/${highlightInput.slug}"`));
      assert.ok(!mediaHtml.includes(hiddenImage));
      assert.ok(!mediaHtml.includes(locale === "ko" ? hiddenHighlightInput.title : hiddenHighlightInput.titleEn));
    }

    await jsonRequest(origin, `/api/admin/notices/${notice.id}`, cookie, {
      method: "PUT",
      headers: { ...mutationHeaders, "if-match": `"${notice.revision}"` },
      body: JSON.stringify({ ...noticeInput, is_active: 0 }),
    });
    await jsonRequest(origin, `/api/admin/highlights/${journal.id}`, cookie, {
      method: "DELETE", headers: { ...mutationHeaders, "if-match": `"${journal.revision}"` },
    });

    for (const locale of ["ko", "en"]) {
      const html = await rendered(origin, `/${locale}/news`);
      assert.ok(!html.includes(locale === "ko" ? noticeInput.title : noticeInput.titleEn));
      assert.ok(!html.includes(locale === "ko" ? highlightInput.title : highlightInput.titleEn));
      const homeHtml = await rendered(origin, `/${locale}`);
      assert.ok(!homeHtml.includes(locale === "ko" ? noticeInput.title : noticeInput.titleEn));
      assert.ok(!homeHtml.includes(locale === "ko" ? highlightInput.title : highlightInput.titleEn));
      assert.ok(!homeHtml.includes(locale === "ko" ? hiddenNoticeInput.title : hiddenNoticeInput.titleEn));
      assert.ok(!homeHtml.includes(locale === "ko" ? hiddenHighlightInput.title : hiddenHighlightInput.titleEn));
      const mediaHtml = await rendered(origin, `/${locale}/news?view=media`);
      assert.ok(!mediaHtml.includes(publishedImage));
    }

    await jsonRequest(origin, `/api/admin/notices/${hiddenNotice.id}`, cookie, {
      method: "DELETE", headers: { ...mutationHeaders, "if-match": `"${hiddenNotice.revision}"` },
    });
    await jsonRequest(origin, `/api/admin/highlights/${hiddenJournal.id}`, cookie, {
      method: "DELETE", headers: { ...mutationHeaders, "if-match": `"${hiddenJournal.revision}"` },
    });

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
    await resetRenderedContent();
  }
});
