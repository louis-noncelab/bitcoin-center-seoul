import { randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPatch } from "./patch-next-image-optimizer.mjs";
import { createPasswordHash, validPasswordHash } from "../src/server/events/password.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(root, ".local/events-review");
const file = join(directory, "runtime.json");
const [command, ...args] = process.argv.slice(2);
const help = "Usage: npm run review -- <init|import|dev|build|start|check|test> [arguments]\nIsolated SQLite review on http://127.0.0.1:3102. Existing environment files and production data are not used.";
if (!command || command === "--help") { console.log(help); process.exit(0); }
if (Number(process.versions.node.split(".")[0]) !== 22) { console.error("Use Node 22 for the local review."); process.exit(1); }
if (command === "init") {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(file, JSON.stringify({
      APP_ORIGIN: "http://127.0.0.1:3102", ADMIN_PASSWORD: randomBytes(32).toString("base64url"),
      BCS_EVENTS_DB: join(directory, "events.db"), BCS_EVENTS_UPLOADS: join(directory, "images"),
    }), { flag: "wx", mode: 0o600 });
    console.log("Created isolated review settings. Credential values are not printed.");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") console.log("Existing isolated review settings preserved.");
    else throw error;
  }
  process.exit(0);
}
const commands = ["import", "dev", "build", "start", "check", "test"];
if (!commands.includes(command)) { console.error(help); process.exit(1); }
const runtime = JSON.parse(await readFile(file, "utf8"));
if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)
  || runtime.APP_ORIGIN !== "http://127.0.0.1:3102"
  || runtime.BCS_EVENTS_DB !== join(directory, "events.db")
  || runtime.BCS_EVENTS_UPLOADS !== join(directory, "images")
  || typeof runtime.ADMIN_PASSWORD !== "string" || runtime.ADMIN_PASSWORD.length < 32) {
  throw new Error("Invalid isolated review configuration.");
}
const environment = { ...process.env, ...runtime, BCS_EVENTS_REVIEW: "true", __NEXT_PROCESSED_ENV: "true" };
if (!runtime.ADMIN_PASSWORD_HASH) {
  runtime.ADMIN_PASSWORD_HASH = await createPasswordHash(runtime.ADMIN_PASSWORD);
  await writeFile(file, JSON.stringify(runtime), { mode: 0o600 });
}
if (!validPasswordHash(runtime.ADMIN_PASSWORD_HASH)) throw new Error("Invalid review password hash.");
environment.ADMIN_PASSWORD_HASH = runtime.ADMIN_PASSWORD_HASH;
environment.BCS_TRUST_PROXY = "false";
if (command !== "test") delete environment.ADMIN_PASSWORD;
applyPatch();
let target;
let serverSnapshot;
switch (command) {
  case "import": target = ["--conditions=react-server", "--import", "tsx", "scripts/events-import.ts", ...args]; break;
  case "dev": target = ["node_modules/next/dist/bin/next", command, "--hostname", "127.0.0.1", "--port", "3102", ...args]; break;
  case "start": {
    serverSnapshot = await mkdtemp(join(directory, "server-"));
    const standalone = join(serverSnapshot, "web");
    try {
      await cp(join(root, ".next-events/standalone"), serverSnapshot, { recursive: true });
      await cp(join(root, "public"), join(standalone, "public"), { recursive: true });
      await cp(join(root, ".next-events/static"), join(standalone, ".next-events/static"), { recursive: true });
    } catch (error) {
      await rm(serverSnapshot, { recursive: true, force: true });
      throw error;
    }
    environment.HOSTNAME = "127.0.0.1"; environment.PORT = "3102";
    target = [join(standalone, "server.js"), ...args]; break;
  }
  case "build": target = ["node_modules/next/dist/bin/next", "build", ...args]; break;
  case "check": target = [process.env.npm_execpath, "run", "check", ...args]; break;
  case "test": target = ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.events.config.ts", ...args]; break;
}
if (target.some((argument) => typeof argument !== "string")) throw new Error("Run this command through npm run review.");
const child = spawn(process.execPath, target, { cwd: root, env: environment, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.once("error", async (error) => {
  console.error(error.name + ": review process could not start."); process.exitCode = 1;
  if (serverSnapshot) await rm(serverSnapshot, { recursive: true, force: true });
});
child.once("exit", async (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
  if (serverSnapshot) await rm(serverSnapshot, { recursive: true, force: true });
});
