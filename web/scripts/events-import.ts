import { legacyVenueType } from "../src/server/events/venue-migration";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { z } from "zod";
import { imagePathSchema } from "../src/lib/events-contract";
import { configuredDatabasePath, configuredUploadsPath } from "../src/server/events/config";
import { openDatabase } from "../src/server/events/db";
import { ApiError } from "../src/server/events/errors";

const expectedSnapshotHash = "1fb988fe27003823f27a1958f72b8b24ea37f18f22c162119c04c4d096a5cb3a";
const webRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = path.resolve(webRoot, "../.local/production-snapshot-2026-09-09");
const localRoot = path.resolve(webRoot, ".local");
const text = (maximum: number) => z.string().max(maximum);
const timestamps = { created_at: text(100), updated_at: text(100) } as const;
const eventRowSchema = z.object({
  id: z.number().int().positive(), title: text(200), titleEn: text(200), date: text(32), time: text(100),
  location: text(300), locationEn: text(300), description: text(20_000), descriptionEn: text(20_000),
  image: imagePathSchema, link: text(2048), ...timestamps,
}).strict();
const highlightRowSchema = z.object({
  id: z.number().int().positive(), title: text(200), titleEn: text(200), meta: text(200), metaEn: text(200),
  description: text(20_000), descriptionEn: text(20_000), category: text(100), categoryEn: text(100),
  date: text(32), startDate: text(32), endDate: text(32), host: text(300), hostEn: text(300),
  image: imagePathSchema, link: text(2048), icon: text(100), sort_order: z.number().int(),
  is_active: z.union([z.literal(0), z.literal(1)]), ...timestamps,
}).strict();
const snapshotSchema = z.object({
  events: z.array(eventRowSchema).length(14),
  highlights: z.array(highlightRowSchema).length(40),
}).passthrough();

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function assertLocalTarget(target: string): void {
  const allowed = fs.realpathSync(localRoot);
  let ancestor = target;
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new ApiError(400, "UNSAFE_IMPORT_TARGET", "가져오기 대상 경로가 올바르지 않습니다.");
    ancestor = parent;
  }
  const resolved = fs.realpathSync(ancestor);
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${path.sep}`)) {
    throw new ApiError(400, "UNSAFE_IMPORT_TARGET", "가져오기 대상은 web/.local 내부여야 합니다.");
  }
}

function loadSnapshot() {
  const bytes = fs.readFileSync(path.join(sourceRoot, "production-data.json"));
  if (sha256(bytes) !== expectedSnapshotHash) {
    throw new ApiError(400, "SNAPSHOT_HASH_MISMATCH", "검증된 콘텐츠 스냅샷과 해시가 다릅니다.");
  }
  return snapshotSchema.parse(JSON.parse(bytes.toString("utf8")));
}

function copySnapshotImages(targetRoot: string, expectedPaths: ReadonlySet<string>): number {
  const manifest = fs.readFileSync(path.join(sourceRoot, "images.sha256"), "utf8").trim().split("\n");
  if (manifest.length !== 48) throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "이미지 목록이 올바르지 않습니다.");
  const entries: { readonly hash: string; readonly publicPath: string; readonly source: string; readonly destination: string }[] = [];
  const manifestPaths = new Set<string>();
  for (const line of manifest) {
    const match = /^([a-f0-9]{64})  (images\/[A-Za-z0-9_./-]+)$/.exec(line);
    if (!match?.[1] || !match[2]) throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "이미지 목록이 올바르지 않습니다.");
    const publicPath = imagePathSchema.parse(`/${match[2]}`);
    const source = path.resolve(sourceRoot, match[2]);
    const destination = path.resolve(targetRoot, publicPath.slice("/images/".length));
    if (!source.startsWith(`${sourceRoot}${path.sep}`) || !destination.startsWith(`${targetRoot}${path.sep}`)) {
      throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "이미지 경로가 올바르지 않습니다.");
    }
    const bytes = fs.readFileSync(source);
    if (sha256(bytes) !== match[1]) throw new ApiError(400, "IMAGE_HASH_MISMATCH", "검증된 이미지와 해시가 다릅니다.");
    if (manifestPaths.has(publicPath)) throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "이미지 목록에 중복 경로가 있습니다.");
    manifestPaths.add(publicPath);
    entries.push({ hash: match[1], publicPath, source, destination });
  }
  if (manifestPaths.size !== expectedPaths.size || [...expectedPaths].some((image) => !manifestPaths.has(image))) {
    throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "콘텐츠와 이미지 목록이 일치하지 않습니다.");
  }

  let copied = 0;
  for (const entry of entries) {
    const { destination, hash, source } = entry;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    try {
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
      copied += 1;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        if (sha256(fs.readFileSync(destination)) !== hash) {
          throw new ApiError(400, "IMAGE_HASH_MISMATCH", "기존 검토 이미지와 검증된 이미지의 해시가 다릅니다.");
        }
        continue;
      }
      throw error;
    }
  }
  return copied;
}

function importRows(db: Database.Database, snapshot: z.infer<typeof snapshotSchema>) {
  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO events
      (id, title, titleEn, date, time, venueType, location, locationEn, description, descriptionEn, image, link, created_at, updated_at)
    VALUES (@id, @title, @titleEn, @date, @time, @venueType, @location, @locationEn, @description, @descriptionEn, @image, @link, @created_at, @updated_at)
  `);
  const insertHighlight = db.prepare(`
    INSERT OR IGNORE INTO highlights
      (id, title, titleEn, meta, metaEn, description, descriptionEn, category, categoryEn, date, startDate,
       endDate, host, hostEn, image, link, icon, sort_order, is_active, created_at, updated_at)
    VALUES (@id, @title, @titleEn, @meta, @metaEn, @description, @descriptionEn, @category, @categoryEn, @date,
      @startDate, @endDate, @host, @hostEn, @image, @link, @icon, @sort_order, @is_active, @created_at, @updated_at)
  `);
  const insertImage = db.prepare(
    "INSERT OR IGNORE INTO content_images (kind, content_id, position, path) VALUES (?, ?, 0, ?)",
  );
  return db.transaction(() => {
    let events = 0;
    let highlights = 0;
    for (const event of snapshot.events) {
      if (insertEvent.run({ ...event, venueType: legacyVenueType(event.location, event.locationEn) }).changes === 1) {
        events += 1;
        if (event.image) insertImage.run("event", event.id, event.image);
      }
    }
    for (const highlight of snapshot.highlights) {
      if (insertHighlight.run(highlight).changes === 1) {
        highlights += 1;
        if (highlight.image) insertImage.run("highlight", highlight.id, highlight.image);
      }
    }
    return { events, highlights };
  })();
}

async function main(): Promise<void> {
  const databasePath = configuredDatabasePath();
  if (!databasePath.startsWith(`${localRoot}${path.sep}`)) {
    throw new ApiError(400, "UNSAFE_IMPORT_TARGET", "가져오기 대상은 web/.local 아래의 명시적 검토 DB여야 합니다.");
  }
  assertLocalTarget(databasePath);
  const uploadsPath = configuredUploadsPath();
  if (!uploadsPath.startsWith(`${localRoot}${path.sep}`)) {
    throw new ApiError(400, "UNSAFE_IMPORT_TARGET", "가져오기 이미지 대상은 web/.local 아래여야 합니다.");
  }
  assertLocalTarget(uploadsPath);
  const snapshot = loadSnapshot();
  const expectedImages = new Set([...snapshot.events, ...snapshot.highlights].map(({ image }) => image).filter(Boolean));
  if (expectedImages.size !== 48) throw new ApiError(400, "IMAGE_MANIFEST_INVALID", "콘텐츠 이미지 경로가 올바르지 않습니다.");
  const images = copySnapshotImages(uploadsPath, expectedImages);
  const db = openDatabase(databasePath);
  try {
    const imported = importRows(db, snapshot);
    process.stdout.write(`events=${imported.events} highlights=${imported.highlights} images=${images}\n`);
  } finally {
    db.close();
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof ApiError || error instanceof z.ZodError) {
    process.stderr.write("검토 콘텐츠를 가져오지 못했습니다. 스냅샷과 로컬 설정을 확인해주세요.\n");
    process.exitCode = 1;
  } else {
    throw error;
  }
}
