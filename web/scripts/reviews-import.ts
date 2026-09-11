import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";
import sharp from "sharp";
import { z } from "zod";
import { reviewInputSchema, reviewRecordSchema, reviewSelectionSchema, type ReviewInput } from "../src/lib/reviews-contract";
import { markdownImageReferences } from "../src/server/events/image-references";
import { getDatabase } from "../src/server/events/db";
import { saveReview, saveReviewSelection } from "../src/server/reviews";
import { ApiError } from "../src/server/events/errors";

const absolutePath = z.string().min(1).refine(value => path.isAbsolute(value) && !value.includes("\0")).transform(value => path.resolve(value));
const optionsSchema = z.object({ bundle: absolutePath, db: absolutePath, uploads: absolutePath, apply: z.boolean().default(false) }).strict();
const keySchema = z.string().trim().min(1).max(200);
const bundleSchema = z.object({
  version: z.literal(1),
  reviews: z.array(reviewInputSchema.safeExtend({ key: keySchema })).max(10_000),
  selection: z.object({ featured_key: keySchema.nullable(), home_keys: z.array(keySchema).max(3) }).strict(),
}).strict();
type Bundle = z.infer<typeof bundleSchema>;
type ImageFile = { readonly source: string; readonly relative: string; readonly sha256: string };
class ImportError extends Error { constructor(readonly code: string) { super(code); } }
const help = "Usage: node --conditions=react-server --import tsx scripts/reviews-import.ts --bundle /absolute/bundle --db /absolute/existing.db --uploads /absolute/images [--apply]\nDefault: dry-run. Node 24. No environment files are loaded. Back up before --apply.\n";

function stat(filename: string): fs.Stats | undefined {
  try { return fs.lstatSync(filename); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined; throw error; }
}
function destinationRoot(filename: string): string {
  if (stat(filename)) return fs.realpathSync(filename);
  return path.join(destinationRoot(path.dirname(filename)), path.basename(filename));
}
function containedPath(root: string, relative: string): string {
  const candidate = path.resolve(root, relative);
  if (!candidate.startsWith(`${root}${path.sep}`)) throw new ImportError("UNSAFE_IMAGE_PATH");
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (stat(current)?.isSymbolicLink()) throw new ImportError("UNSAFE_IMAGE_PATH");
  }
  return candidate;
}
function digest(filename: string): string { return createHash("sha256").update(fs.readFileSync(filename)).digest("hex"); }
function assertUnique(values: readonly string[]): void {
  if (new Set(values).size !== values.length) throw new ImportError("DUPLICATE_BUNDLE_VALUE");
}
function parseBundle(root: string): Bundle {
  const manifest = containedPath(root, "reviews.json");
  if (!stat(manifest)?.isFile() || fs.statSync(manifest).size > 16 * 1024 * 1024) throw new ImportError("INVALID_BUNDLE_FILE");
  const bundle = bundleSchema.parse(JSON.parse(fs.readFileSync(manifest, "utf8")));
  assertUnique(bundle.reviews.map(review => review.key));
  assertUnique(bundle.reviews.map(review => review.url));
  assertUnique(bundle.reviews.map(review => review.slug).filter(Boolean));
  assertUnique(bundle.selection.home_keys);
  for (const key of new Set([...bundle.selection.home_keys, ...(bundle.selection.featured_key ? [bundle.selection.featured_key] : [])])) {
    const selected = bundle.reviews.find(review => review.key === key);
    if (!selected || !selected.is_active || (key === bundle.selection.featured_key && !selected.image)) throw new ImportError("INVALID_SELECTION");
  }
  return bundle;
}
async function inspectImages(bundle: Bundle, source: string, target: string): Promise<readonly ImageFile[]> {
  const references = new Set(bundle.reviews.flatMap(review => [review.image, ...markdownImageReferences(review.description), ...markdownImageReferences(review.descriptionEn)]).filter(Boolean));
  const images: ImageFile[] = [];
  for (const reference of references) {
    const relative = reference.slice("/images/".length);
    const filename = containedPath(source, path.join("images", relative));
    const information = stat(filename);
    if (!information?.isFile() || information.size > 10 * 1024 * 1024) throw new ImportError("INVALID_IMAGE_FILE");
    const decoder = sharp(filename, { failOn: "error", limitInputPixels: 40_000_000 });
    const metadata = await decoder.metadata();
    if (!metadata.format || !["avif", "gif", "heif", "jpeg", "png", "webp"].includes(metadata.format)) throw new ImportError("INVALID_IMAGE_FILE");
    await decoder.resize(1, 1).raw().toBuffer();
    const sha256 = digest(filename);
    const existing = containedPath(target, relative);
    if (stat(existing) && (!stat(existing)?.isFile() || digest(existing) !== sha256)) throw new ImportError("IMAGE_CONTENT_CONFLICT");
    images.push({ source: filename, relative, sha256 });
  }
  return images;
}
function planImport(db: Database.Database, bundle: Bundle) {
  const hasTable = (name: string) => !!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(name);
  const records = hasTable("visit_reviews") ? db.prepare("SELECT * FROM visit_reviews").all().map(row => reviewRecordSchema.parse(row)) : [];
  const slugs = hasTable("review_slugs") ? db.prepare<[], { readonly slug: string; readonly review_id: number }>("SELECT slug,review_id FROM review_slugs").all() : [];
  const row = hasTable("review_selection") ? db.prepare<[], { readonly featured_id: number | null; readonly home_ids: string; readonly revision: number }>("SELECT featured_id,home_ids,revision FROM review_selection WHERE id=1").get() : undefined;
  const selection = row ? reviewSelectionSchema.parse({ ...row, home_ids: JSON.parse(row.home_ids) }) : { featured_id: null, home_ids: [], revision: 1 };
  const ids = new Map<string, number>();
  const pending: { readonly key: string; readonly input: ReviewInput }[] = [];
  for (const { key, ...input } of bundle.reviews) {
    const matches = records.filter(record => record.url === input.url || (input.slug && record.slug === input.slug));
    if (matches.length > 1) throw new ImportError("REVIEW_CONTENT_CONFLICT");
    const existing = matches[0];
    const owner = input.slug ? slugs.find(slug => slug.slug === input.slug) : undefined;
    if (owner && owner.review_id !== existing?.id) throw new ImportError("SLUG_CONFLICT");
    if (existing) {
      const stored = reviewRecordSchema.omit({ id: true, revision: true, created_at: true, updated_at: true }).strip().parse(existing);
      if (JSON.stringify(reviewInputSchema.parse(stored)) !== JSON.stringify(reviewInputSchema.parse(input))) throw new ImportError("REVIEW_CONTENT_CONFLICT");
      ids.set(key, existing.id);
    } else pending.push({ key, input });
  }
  const featured = bundle.selection.featured_key === null ? null : ids.get(bundle.selection.featured_key);
  const home = bundle.selection.home_keys.map(key => ids.get(key));
  const identical = featured === selection.featured_id && JSON.stringify(home) === JSON.stringify(selection.home_ids);
  const fresh = selection.revision === 1 && selection.featured_id === null && selection.home_ids.length === 0;
  if (!fresh && !identical) throw new ImportError("SELECTION_CONFLICT");
  return { ids, pending, selection, updateSelection: !identical };
}
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { bundle: { type: "string" }, db: { type: "string" }, uploads: { type: "string" }, apply: { type: "boolean" }, help: { type: "boolean" } } });
  if (values.help) { process.stdout.write(help); return; }
  if (process.versions.node.split(".")[0] !== "24") throw new ImportError("NODE_24_REQUIRED");
  const options = optionsSchema.parse(values);
  const source = fs.realpathSync(options.bundle);
  const filename = fs.realpathSync(options.db);
  const target = destinationRoot(options.uploads);
  if (!fs.statSync(source).isDirectory() || !fs.statSync(filename).isFile() || (stat(target) && !stat(target)?.isDirectory())) throw new ImportError("INVALID_SOURCE_OR_TARGET");
  if (target === source || target.startsWith(`${source}${path.sep}`) || source.startsWith(`${target}${path.sep}`)) throw new ImportError("OVERLAPPING_IMAGE_ROOTS");
  const bundle = parseBundle(source);
  const images = await inspectImages(bundle, source, target);
  const readonly = new Database(filename, { readonly: true, fileMustExist: true });
  let plan: ReturnType<typeof planImport>;
  try { plan = readonly.transaction(() => planImport(readonly, bundle))(); }
  finally { readonly.close(); }
  if (!options.apply) {
    process.stdout.write(`dry-run complete: insert=${plan.pending.length} unchanged=${plan.ids.size} images=${images.length}\n`);
    return;
  }
  process.env.BCS_EVENTS_DB = filename;
  process.env.BCS_EVENTS_UPLOADS = target;
  const db = getDatabase();
  const copied: string[] = [];
  try {
    db.transaction(() => {
      plan = planImport(db, bundle);
      for (const image of images) {
        const destination = containedPath(target, image.relative);
        if (stat(destination)) {
          if (!stat(destination)?.isFile() || digest(destination) !== image.sha256) throw new ImportError("IMAGE_CONTENT_CONFLICT");
          continue;
        }
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(image.source, destination, fs.constants.COPYFILE_EXCL);
        copied.push(destination);
        if (digest(destination) !== image.sha256) throw new ImportError("SOURCE_IMAGE_CHANGED");
      }
      for (const { key, input } of plan.pending) plan.ids.set(key, saveReview(input).id);
      if (plan.updateSelection) {
        const idFor = (key: string): number => { const id = plan.ids.get(key); if (id === undefined) throw new ImportError("INVALID_SELECTION"); return id; };
        saveReviewSelection({ featured_id: bundle.selection.featured_key === null ? null : idFor(bundle.selection.featured_key), home_ids: bundle.selection.home_keys.map(idFor) }, plan.selection.revision);
      }
    }).immediate();
  } catch (error) {
    for (const filename of copied) fs.unlinkSync(filename);
    throw error;
  } finally { db.close(); }
  process.stdout.write(`import complete: inserted=${plan.pending.length} images_copied=${copied.length}\n`);
}
try { await main(); } catch (error) {
  const code = error instanceof ImportError || error instanceof ApiError ? error.code : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError ? "INVALID_ARGUMENT_OR_BUNDLE" : "IMPORT_IO_OR_DATABASE_FAILED";
  process.stderr.write(`Review import failed: ${code}. No existing review or image is overwritten.\n`);
  process.exitCode = 1;
}
