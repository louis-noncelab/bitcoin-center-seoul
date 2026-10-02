import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import { assertSafeTestDatabaseUrl } from "../tests/helpers/test-database-url.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const directory = join(root, ".local/pg-review");
export const credentialsFile = join(directory, "credentials.json");
export const settingsFile = join(directory, "settings.json");
export const origin = "http://127.0.0.1:3633";
export const dbPrefix = "bcs_review_";
export const dbUser = process.env.PGUSER ?? userInfo().username;

const safeCommands = new Set(["init", "start", "test", "cleanup", "--help"]);
const defaultTestFiles = ["tests/commerce-catalog.spec.ts", "tests/commerce-storefront.spec.ts"];
const help = `Usage: npm run review:pg -- <init|start|test|cleanup> [test files...]

PostgreSQL review runner for local browser checks on ${origin}.
It creates only ${dbPrefix}*_test databases owned by ${dbUser}, stores private generated settings under .local/, and never reads .env files.
Legacy npm run review remains the historical SQLite fixture runner.`;

export function expandTestFiles(args) {
  const selected = args.length > 0 ? args : defaultTestFiles;
  return selected.map((name) => {
    const path = name.replaceAll("\\", "/").replace(/^\.\//, "");
    const normalized = path.includes("/") ? path : `tests/${path}`;
    if (!normalized.startsWith("tests/") || normalized.includes("..")) throw new Error(`Unsupported test path: ${name}`);
    if (!/\.(spec\.ts|mjs)$/.test(normalized)) throw new Error(`Unsupported test file: ${name}`);
    return normalized;
  });
}

export function parseCommand(argv) {
  const [command, ...args] = argv;
  if (!command || command === "--help") return { command: "--help", args: [] };
  if (!safeCommands.has(command)) throw new Error(help);
  if (args.some((arg) => arg === "--config" || arg.startsWith("--config=") || arg === "--project" || arg.startsWith("--project="))) {
    throw new Error("review:pg owns Playwright configuration; pass file paths only.");
  }
  if (args.some((arg) => arg.includes("\0"))) throw new Error("Invalid argument.");
  if (command !== "test" && args.length) throw new Error("Only test accepts file arguments.");
  if (command === "test") expandTestFiles(args);
  return { command, args };
}

export function databaseNameFromUrl(value) {
  const parsed = assertSafeTestDatabaseUrl(value, "DATABASE_URL");
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== "5432"
    || parsed.searchParams.has("user") || parsed.searchParams.has("password")
    || decodeURIComponent(parsed.username) !== dbUser || parsed.password) throw new Error("Review DATABASE_URL must identify this runner's local PostgreSQL connection.");
  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (!/^bcs_review_[a-f0-9]{16}_test$/.test(name)) throw new Error("Review database is not owned by this runner.");
  return name;
}

function privateSettings(databaseName) {
  return {
    databaseName,
    dataDir: join(directory, "data"),
    uploadRoot: join(directory, "uploads"),
    tokenKey: randomBytes(32).toString("base64"),
  };
}

function environment(credentials, settings) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
    ...credentials.env,
    DATA_DIR: settings.dataDir,
    TOKEN_ENCRYPTION_KEY: settings.tokenKey,
    ADMIN_PASSWORD_HASH: settings.adminPasswordHash,
    PAYMENT_PROVIDER: "zaprite",
    TRUST_PROXY: "false",
    BCS_TRUST_PROXY: "false",
    BCS_EVENTS_UPLOADS: settings.uploadRoot,
    BCS_PUBLIC_INDEXING: "false",
    REVIEW_KRW_PER_BTC: "150000000",
    COMMERCE_REVIEW_ORIGIN: credentials.env.APP_ORIGIN,
    COMMERCE_REVIEW_CREDENTIALS: credentialsFile,
    TEST_DATABASE_URL: credentials.env.DATABASE_URL,
    __NEXT_PROCESSED_ENV: "true",
  };
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, env: options.env ?? { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: options.stdio ?? "inherit" });
  return await new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolvePromise() : reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`)));
  });
}

async function capture(command, args, options = {}) {
  let stdout = "";
  let stderr = "";
  const child = spawn(command, args, { cwd: root, env: options.env ?? { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolvePromise() : reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}: ${stderr.trim()}`)));
  });
  return stdout;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writePrivateJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

async function loadRuntime() {
  const credentials = await readJson(credentialsFile);
  if (credentials?.env?.APP_ORIGIN !== origin || credentials.env.APP_MODE !== "review" || credentials.env.PAYMENT_MODE !== "review"
    || credentials.env.EMAIL_MODE !== "capture" || typeof credentials.password !== "string" || credentials.password.length < 32) {
    throw new Error("Review credentials do not identify this runner.");
  }
  const databaseName = databaseNameFromUrl(credentials.env.DATABASE_URL);
  const settings = await readJson(settingsFile);
  if (settings.databaseName !== databaseName || !settings.dataDir?.startsWith(directory) || !settings.uploadRoot?.startsWith(directory)) {
    throw new Error("Review settings and credentials do not identify the same owned database.");
  }
  if (settings.dataDir !== join(directory, "data") || settings.uploadRoot !== join(directory, "uploads")
    || typeof settings.adminPasswordHash !== "string") throw new Error("Invalid private review settings.");
  return { credentials, settings, databaseName };
}

async function createDatabase(databaseName) {
  const exists = await capture("psql", ["-h", "127.0.0.1", "-U", dbUser, "-d", "postgres", "-Atc", "select 1 from pg_database where datname = current_setting('bcs.review_db', true)"], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PGOPTIONS: `-c bcs.review_db=${databaseName}` },
  });
  if (exists.trim()) throw new Error(`Refusing to reuse existing review database ${databaseName}.`);
  await run("createdb", ["-h", "127.0.0.1", "-U", dbUser, databaseName]);
}

async function dropDatabase(databaseName) {
  await run("dropdb", ["-h", "127.0.0.1", "-U", dbUser, "--if-exists", databaseName]);
}

async function migrateAndSeed(env) {
  await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env });
  await run(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/commerce-seed.ts"], { env });
  process.env = env;
  const { prisma } = await import("../src/server/db.ts");
  const category = await prisma.productCategory.upsert({
    where: { slug: "review-fixtures" },
    update: { nameKo: "검토", nameEn: "Review", active: true },
    create: { slug: "review-fixtures", nameKo: "검토", nameEn: "Review", sortOrder: -10 },
  });
  const noImage = await prisma.product.upsert({
    where: { slug: "review-no-image" },
    update: { published: true, listed: true, imageUrl: "", images: [], categoryId: category.id },
    create: {
      slug: "review-no-image",
      titleKo: "검토용 무사진 상품",
      titleEn: "Review no-image item",
      descriptionKo: "사진이 없는 카드 렌더링을 확인합니다.",
      descriptionEn: "Exercises product cards without images.",
      published: true,
      listed: true,
      imageUrl: "",
      images: [],
      priceKind: "KRW_FIXED",
      priceAmount: 12_000n,
      allowedFulfillments: ["PICKUP"],
      categoryId: category.id,
    },
  });
  await prisma.productVariant.upsert({
    where: { sku: "REVIEW-NOIMAGE-AVAILABLE" },
    update: { productId: noImage.id, stockOnHand: 7, reservedStock: 0, active: true },
    create: { productId: noImage.id, sku: "REVIEW-NOIMAGE-AVAILABLE", optionLabelKo: "기본", optionLabelEn: "Default", stockOnHand: 7 },
  });
  const images = ["/images/space-tour/gallery.webp", "/images/space-tour/library.webp", "/images/space-tour/lounge.webp"];
  const photo = await prisma.product.upsert({
    where: { slug: "review-photo-gallery" },
    update: { published: true, listed: true, imageUrl: images[0], images, categoryId: category.id },
    create: {
      slug: "review-photo-gallery",
      titleKo: "검토용 사진 상품",
      titleEn: "Review photo gallery item",
      descriptionKo: "실제 센터 사진 여러 장과 판매/품절 옵션을 확인합니다.",
      descriptionEn: "Uses real center photos and available/sold-out variants.",
      published: true,
      listed: true,
      imageUrl: images[0],
      images,
      priceKind: "KRW_FIXED",
      priceAmount: 21_000n,
      allowedFulfillments: ["PICKUP", "DOMESTIC"],
      categoryId: category.id,
    },
  });
  await prisma.productVariant.upsert({
    where: { sku: "REVIEW-PHOTO-AVAILABLE" },
    update: { productId: photo.id, stockOnHand: 9, reservedStock: 0, active: true, optionLabelKo: "판매 가능", optionLabelEn: "Available" },
    create: { productId: photo.id, sku: "REVIEW-PHOTO-AVAILABLE", optionLabelKo: "판매 가능", optionLabelEn: "Available", stockOnHand: 9, billableWeightG: 300 },
  });
  await prisma.productVariant.upsert({
    where: { sku: "REVIEW-PHOTO-SOLDOUT" },
    update: { productId: photo.id, stockOnHand: 0, reservedStock: 0, active: true, optionLabelKo: "품절", optionLabelEn: "Sold out" },
    create: { productId: photo.id, sku: "REVIEW-PHOTO-SOLDOUT", optionLabelKo: "품절", optionLabelEn: "Sold out", stockOnHand: 0, billableWeightG: 300 },
  });
  await prisma.$disconnect();
}

async function resetBetweenFiles(env) {
  process.env = env;
  const { prisma } = await import("../src/server/db.ts");
  await prisma.adminLoginAttempt.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
}

async function init() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await readFile(credentialsFile);
    const runtime = await loadRuntime();
    console.log(`Existing PostgreSQL review runner preserved for ${runtime.databaseName}.`);
    return;
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "ENOENT") throw error;
  }
  const databaseName = `${dbPrefix}${randomBytes(8).toString("hex")}_test`;
  const databaseUrl = `postgresql://${encodeURIComponent(dbUser)}@127.0.0.1:5432/${databaseName}`;
  databaseNameFromUrl(databaseUrl);
  const settings = privateSettings(databaseName);
  const credentials = { env: { APP_ORIGIN: origin, APP_MODE: "review", PAYMENT_MODE: "review", EMAIL_MODE: "capture", DATABASE_URL: databaseUrl }, password: randomBytes(32).toString("base64url") };
  const { createPasswordHash } = await import("../src/server/events/password.ts");
  settings.adminPasswordHash = await createPasswordHash(credentials.password);
  await createDatabase(databaseName);
  try {
    await mkdir(settings.dataDir, { recursive: true, mode: 0o700 });
    await mkdir(settings.uploadRoot, { recursive: true, mode: 0o700 });
    await writePrivateJson(credentialsFile, credentials);
    await writePrivateJson(settingsFile, settings);
    await migrateAndSeed(environment(credentials, settings));
    console.log(`Created isolated PostgreSQL review runner for ${databaseName}. Credential values are not printed.`);
  } catch (error) {
    await rm(credentialsFile, { force: true });
    await rm(settingsFile, { force: true });
    await dropDatabase(databaseName);
    throw error;
  }
}

async function start(args) {
  const { credentials, settings } = await loadRuntime();
  const serverSnapshot = await mkdtemp(join(directory, "server-"));
  const standalone = join(serverSnapshot, "web");
  try {
    await cp(join(root, ".next-events/standalone"), serverSnapshot, { recursive: true, errorOnExist: true });
    await cp(join(root, "public"), join(standalone, "public"), { recursive: true, errorOnExist: true });
    await cp(join(root, ".next-events/static"), join(standalone, ".next-events/static"), { recursive: true, errorOnExist: true });
  } catch (error) {
    await rm(serverSnapshot, { recursive: true, force: true });
    throw new Error("Missing immutable .next-events standalone/static snapshot. Run the approved review build first; review:pg will not fake it.", { cause: error });
  }
  const env = { ...environment(credentials, settings), HOSTNAME: "127.0.0.1", PORT: "3633" };
  const child = spawn(process.execPath, [join(standalone, "server.js"), ...args], { cwd: standalone, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.once("exit", async (code, signal) => {
    await rm(serverSnapshot, { recursive: true, force: true });
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

async function testFiles(args) {
  const { credentials, settings } = await loadRuntime();
  const env = environment(credentials, settings);
  const files = expandTestFiles(args);
  let failed = false;
  try {
    for (const file of files) {
      await resetBetweenFiles(env);
      try {
        if (file.endsWith(".spec.ts")) {
          const exactFile = `^${join(root, file).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
          await run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.config.ts", "--workers", "1", exactFile], {
            env: { ...env, ADMIN_PASSWORD: credentials.password },
          });
        } else await run(process.execPath, ["--conditions=react-server", "--import", "tsx", "--test", "--test-concurrency=1", file], { env });
      } catch (error) {
        failed = true;
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
  } finally {
    const { prisma } = await import("../src/server/db.ts");
    await prisma.$disconnect();
  }
  if (failed) process.exitCode = 1;
}

async function cleanup() {
  const { databaseName } = await loadRuntime();
  await dropDatabase(databaseName);
  await rm(credentialsFile, { force: true });
  await rm(settingsFile, { force: true });
  await rm(join(directory, "data"), { recursive: true, force: true });
  await rm(join(directory, "uploads"), { recursive: true, force: true });
  console.log(`Dropped owned review database ${databaseName} and removed private runner settings.`);
}

export async function main(argv = process.argv.slice(2)) {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Use Node 24 for the PostgreSQL review runner.");
  const { command, args } = parseCommand(argv);
  if (command === "--help") { console.log(help); return; }
  if (command === "init") await init();
  else if (command === "start") await start(args);
  else if (command === "test") await testFiles(args);
  else if (command === "cleanup") await cleanup();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
