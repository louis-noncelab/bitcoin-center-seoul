import type Database from "better-sqlite3";
import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { z } from "zod";
import { contentImagesSchema, imagePathSchema } from "../../lib/events-contract";

// Shared with the environment-free backup CLI, which also reads legacy schemas.
export function imageReferences(db: Database.Database, publicOnly = false): readonly string[] {
  const paths = new Set<string>();
  const rowSchema = z.object({ image: imagePathSchema.optional(), images: z.string().optional(), description: z.string().optional(), descriptionEn: z.string().optional() });
  for (const table of ["events", "highlights", "notices", "collection_items", "visit_reviews"] as const) {
    const columns = db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`).all().map(({ name }) => name);
    const fields = ["image", "images", "description", "descriptionEn"].filter((field) => columns.includes(field));
    if (!fields.length) continue;
    const rows = db.prepare(`SELECT ${fields.join(", ")} FROM ${table}${publicOnly && columns.includes("is_active") ? " WHERE is_active = 1" : ""}`).all();
    for (const value of rows) {
      const row = rowSchema.parse(value);
      if (row.image) paths.add(row.image);
      if (row.images) for (const image of contentImagesSchema.parse(JSON.parse(row.images))) paths.add(image);
      for (const source of [row.description, row.descriptionEn]) {
        if (!source) continue;
        for (const image of markdownImageReferences(source)) paths.add(image);
      }
    }
  }
  const hasImages = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'content_images'").get();
  if (hasImages) {
    const rows = db.prepare(`SELECT path FROM content_images${publicOnly ? " WHERE (kind = 'event' AND content_id IN (SELECT id FROM events)) OR (kind = 'highlight' AND content_id IN (SELECT id FROM highlights WHERE is_active = 1))" : ""}`).all();
    for (const row of z.array(z.object({ path: imagePathSchema })).parse(rows)) if (row.path) paths.add(row.path);
  }
  return [...paths].sort();
}

export function markdownImageReferences(source: string): readonly string[] {
  const paths = new Set<string>();
  const definitions = new Map<string, string>();
  const references: string[] = [];
  function visit(node: Nodes) {
    if (node.type === "image") add(node.url);
    if (node.type === "definition" && !definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
    if (node.type === "imageReference") references.push(node.identifier);
    if ("children" in node) for (const child of node.children) visit(child);
  }
  function add(url: string) { const parsed = imagePathSchema.safeParse(url); if (parsed.success && parsed.data) paths.add(parsed.data); }
  visit(fromMarkdown(source));
  for (const identifier of references) { const url = definitions.get(identifier); if (url) add(url); }
  return [...paths];
}
