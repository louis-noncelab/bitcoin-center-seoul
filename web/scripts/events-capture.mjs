import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const settings = JSON.parse(await readFile(join(root, ".local/events-review/runtime.json"), "utf8"));
const origin = "http://127.0.0.1:3102";
if (settings.APP_ORIGIN !== origin) throw new Error("Only the isolated review origin is allowed.");
const output = join(root, "../docs/checkpoints/evidence/events-only", process.argv[2] ?? "current");
await mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
const axe = require.resolve("axe-core");
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  const catalog = await browser.newContext({ baseURL: origin });
  const events = (await (await catalog.request.get("/api/events")).json()).data;
  const highlights = (await (await catalog.request.get("/api/highlights")).json()).data;
  const event = events.find((item) => item.images.length > 0);
  const highlight = highlights.find((item) => item.images.length > 0);
  if (!event || !highlight) throw new Error("Imported event/highlight images are required.");
  await catalog.close();
  const routes = ["", "about", "programs", "experience", "journal", "journal?page=2", "visit", "notices", "experience/wallet", `programs/${event.id}`, `journal/${highlight.id}`];
  await Promise.all([375, 768, 1280, 1440, 1920].map(async (width) => {
    for (const theme of ["light", "dark"]) {
      for (const locale of ["ko", "en"]) {
        const context = await browser.newContext({ baseURL: origin, viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await context.addInitScript((value) => localStorage.setItem("bcs-theme", value), theme);
        for (const route of routes) {
          const page = await context.newPage();
          const errors = []; page.on("pageerror", (error) => errors.push(error.message));
          const response = await page.goto(`/${locale}${route ? `/${route}` : ""}`, { waitUntil: "networkidle" });
          await capture(page, `${locale}-${theme}-${width}-${route.replace(/[/?=]/g, "-") || "home"}`, response?.status(), errors);
          await page.close();
        }
        await context.close();
      }
      if (width > 1280) continue;
      const context = await browser.newContext({ baseURL: origin, viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await context.addInitScript((value) => localStorage.setItem("bcs-theme", value), theme);
      const page = await context.newPage();
      const errors = []; page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/ko/admin", { waitUntil: "networkidle" });
      await page.getByLabel("관리자 비밀번호", { exact: true }).waitFor();
      await capture(page, `admin-${theme}-${width}-login`, 200, errors);
      const login = await context.request.post("/api/admin/login", { headers: { origin }, data: { password: settings.ADMIN_PASSWORD } });
      if (!login.ok()) throw new Error("Review administrator login failed.");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "행사 목록", exact: true }).waitFor();
      await page.locator(".events-admin-list > li").first().waitFor();
      await capture(page, `admin-${theme}-${width}-events`, 200, errors);
      await page.getByRole("button", { name: "새 항목 등록", exact: true }).click();
      await capture(page, `admin-${theme}-${width}-event-new`, 200, errors);
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await page.locator(".events-admin-list > li").filter({ hasText: event.title }).getByRole("button", { name: "수정", exact: true }).click();
      await capture(page, `admin-${theme}-${width}-event-edit`, 200, errors);
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await page.getByRole("button", { name: "하이라이트", exact: true }).click();
      await page.locator(".events-admin-list > li").first().waitFor();
      await capture(page, `admin-${theme}-${width}-highlights`, 200, errors);
      await page.locator(".events-admin-list > li").filter({ hasText: highlight.title }).getByRole("button", { name: "수정", exact: true }).click();
      await capture(page, `admin-${theme}-${width}-highlight-edit`, 200, errors);
      await context.request.post("/api/admin/logout", { headers: { origin }, data: {} });
      await context.close();
    }
  }));
} finally {
  await browser.close();
  await writeFile(join(output, "audit.json"), JSON.stringify(results, null, 2));
}
const failed = results.filter((item) => item.status !== 200 || item.errors.length || item.overflow || item.violations.length);
console.log(JSON.stringify({ captures: results.length, failed: failed.length, report: join(output, "audit.json") }));
if (failed.length) process.exitCode = 1;

async function capture(page, name, status, errors) {
  const requestedTheme = name.includes("-dark-") ? "dark" : "light";
  await page.waitForFunction((value) => document.documentElement.dataset.theme === value, requestedTheme);
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y); await new Promise((done) => requestAnimationFrame(done));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => Array.from(document.images).every((image) => !image.getClientRects().length || (image.complete && image.naturalWidth > 0)), undefined, { timeout: 15000 });
  await page.addScriptTag({ path: axe });
  const audit = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, violations: result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(({ target }) => target) })) };
  });
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
  results.push({ name, status, errors: [...errors], ...audit });
  console.log(name, audit.violations.length ? "CHECK" : "captured");
}
