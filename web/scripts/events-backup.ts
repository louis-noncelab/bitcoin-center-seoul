import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";
import { z } from "zod";
import { imagePathSchema } from "../src/lib/events-contract";

const absolutePath = z.string().min(1).refine((value) => path.isAbsolute(value) && !value.includes("\0")).transform((value) => path.resolve(value));
const optionsSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("backup"), database: absolutePath, images: absolutePath, output: absolutePath }).strict(),
  z.object({ command: z.literal("restore-check"), backup: absolutePath }).strict(),
]);
const archivedPath = z.string().refine((value) => value === "events.db" || imagePathSchema.safeParse(`/${value}`).success);
const fileSchema = z.object({ path: archivedPath, bytes: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const manifestSchema = z.object({
  version: z.literal(1), createdAt: z.iso.datetime(), files: z.array(fileSchema).min(1).max(100_000),
}).strict().refine(({ files }) => files.filter((file) => file.path === "events.db").length === 1 && new Set(files.map((file) => file.path)).size === files.length);
const maximumManifestBytes = 16 * 1024 * 1024;
const help = `Usage:
  node --import tsx scripts/events-backup.ts backup --database /absolute/events.db --images /absolute/images --output /private/backups/new-directory
  node --import tsx scripts/events-backup.ts restore-check --backup /private/backups/existing-directory
  node --import tsx scripts/events-backup.ts --help

Node 22. No environment files are loaded. The output parent must already exist and be private (0700).
backup creates a new directory with an online SQLite snapshot, referenced images and a SHA-256 manifest.
restore-check verifies and restores only inside a fresh temporary directory, then removes it. It never replaces an active database.
`;

class BackupError extends Error {
  constructor(readonly code: string) { super(code); }
}

function containedFile(root: string, relative: string): string {
  const filename = path.join(root, relative);
  const resolved = fs.realpathSync(filename);
  if (!resolved.startsWith(`${root}${path.sep}`) || !fs.lstatSync(filename).isFile()) throw new BackupError("UNSAFE_FILE");
  return resolved;
}

function synchronize(filename: string): void {
  const descriptor = fs.openSync(filename, "r");
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function copyPrivate(source: string, destination: string): void {
  const directory = path.dirname(destination);
  const firstCreated = fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(destination, 0o600);
  synchronize(destination);
  // Persist both the copied file and any newly created archive directories.
  let current = directory;
  for (;;) {
    synchronize(current);
    if (!firstCreated || current === path.dirname(firstCreated)) break;
    current = path.dirname(current);
  }
}

async function digest(filename: string): Promise<{ readonly bytes: number; readonly sha256: string }> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of fs.createReadStream(filename)) {
    if (!Buffer.isBuffer(chunk)) throw new BackupError("FILE_READ_FAILED");
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function imageReferences(db: Database.Database): readonly string[] {
  if (db.pragma("integrity_check", { simple: true }) !== "ok") throw new BackupError("DATABASE_INTEGRITY_FAILED");
  const hasImages = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'content_images'").get();
  const rows = db.prepare(`SELECT image AS path FROM events UNION SELECT image AS path FROM highlights${hasImages ? " UNION SELECT path FROM content_images" : ""}`).all();
  return z.array(z.object({ path: imagePathSchema })).parse(rows).map((row) => row.path).filter(Boolean).sort();
}

async function backup(options: z.infer<typeof optionsSchema> & { readonly command: "backup" }): Promise<number> {
  const source = fs.realpathSync(options.database);
  const images = fs.realpathSync(options.images);
  const parent = fs.realpathSync(path.dirname(options.output));
  const output = path.join(parent, path.basename(options.output));
  if (!fs.statSync(source).isFile() || !fs.statSync(images).isDirectory()) throw new BackupError("INVALID_SOURCE");
  if ((fs.statSync(parent).mode & 0o077) !== 0 || output === images || output.startsWith(`${images}${path.sep}`)) throw new BackupError("UNSAFE_OUTPUT");
  fs.mkdirSync(output, { mode: 0o700 });
  try {
    const snapshot = path.join(output, "events.db");
    const db = new Database(source, { readonly: true, fileMustExist: true, timeout: 5000 });
    try {
      const timeout = AbortSignal.timeout(120_000);
      await db.backup(snapshot, { progress: () => { timeout.throwIfAborted(); return 256; } });
    } finally { db.close(); }
    fs.chmodSync(snapshot, 0o600);
    const saved = new Database(snapshot, { fileMustExist: true });
    let references: readonly string[];
    try {
      saved.pragma("trusted_schema = OFF");
      saved.pragma("journal_mode = DELETE");
      references = imageReferences(saved);
    } finally { saved.close(); }
    synchronize(snapshot);
    const files: z.infer<typeof fileSchema>[] = [{ path: "events.db", ...await digest(snapshot) }];
    for (const publicPath of references) {
      const archivePath = publicPath.slice(1);
      const destination = path.join(output, archivePath);
      copyPrivate(containedFile(images, publicPath.slice("/images/".length)), destination);
      files.push({ path: archivePath, ...await digest(destination) });
    }
    const manifest = manifestSchema.parse({ version: 1, createdAt: new Date().toISOString(), files });
    const filename = path.join(output, "manifest.json");
    const serialized = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    if (serialized.length > maximumManifestBytes) throw new BackupError("MANIFEST_TOO_LARGE");
    fs.writeFileSync(filename, serialized, { flag: "wx", mode: 0o600 });
    synchronize(filename);
    synchronize(output);
    synchronize(parent);
    return references.length;
  } catch (error) {
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

async function restoreCheck(archive: string): Promise<number> {
  const root = fs.realpathSync(archive);
  const manifestFile = containedFile(root, "manifest.json");
  if (fs.statSync(manifestFile).size > maximumManifestBytes) throw new BackupError("MANIFEST_TOO_LARGE");
  const manifest = manifestSchema.parse(JSON.parse(fs.readFileSync(manifestFile, "utf8")));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-restore-check-"));
  try {
    for (const file of manifest.files) {
      const destination = path.join(temporary, file.path);
      copyPrivate(containedFile(root, file.path), destination);
      const actual = await digest(destination);
      if (actual.bytes !== file.bytes || actual.sha256 !== file.sha256) throw new BackupError("FILE_HASH_MISMATCH");
    }
    const db = new Database(path.join(temporary, "events.db"), { readonly: true, fileMustExist: true });
    let references: readonly string[];
    try {
      db.pragma("trusted_schema = OFF");
      references = imageReferences(db);
    } finally { db.close(); }
    const expected = new Set(["events.db", ...references.map((reference) => reference.slice(1))]);
    if (manifest.files.length !== expected.size || manifest.files.some((file) => !expected.has(file.path))) throw new BackupError("IMAGE_MANIFEST_MISMATCH");
    return references.length;
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { database: { type: "string" }, images: { type: "string" }, output: { type: "string" }, backup: { type: "string" }, help: { type: "boolean" } },
  });
  if (values.help && positionals.length === 0) { process.stdout.write(help); return; }
  if (process.versions.node.split(".")[0] !== "22") throw new BackupError("NODE_22_REQUIRED");
  if (positionals.length !== 1) throw new BackupError("INVALID_ARGUMENTS");
  const options = optionsSchema.parse({ command: positionals[0], ...values });
  process.umask(0o077);
  switch (options.command) {
    case "backup": process.stdout.write(`backup complete: images=${await backup(options)}\n`); return;
    case "restore-check": process.stdout.write(`restore-check complete: images=${await restoreCheck(options.backup)}\n`); return;
    default: { const impossible: never = options; throw impossible; }
  }
}

try { await main(); } catch (error) {
  const code = error instanceof BackupError ? error.code : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError ? "INVALID_ARGUMENT_OR_MANIFEST" : "BACKUP_IO_OR_DATABASE_FAILED";
  process.stderr.write(`Backup operation failed: ${code}. Check arguments, private paths, free space, database integrity and referenced images.\n`);
  process.exitCode = 1;
}
