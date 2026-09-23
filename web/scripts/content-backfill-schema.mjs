import { z } from "zod";

const text = z.string();
const integer = z.number().int();
const flag = z.union([z.literal(0), z.literal(1)]).transform((value) => value === 1);
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z)?$/)
  .transform((value) => {
    const date = new Date(`${value.replace(" ", "T").replace(/Z$/, "")}Z`);
    if (Number.isNaN(date.getTime())) throw new BackfillError("INVALID_TIMESTAMP");
    return date;
  });

export class BackfillError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const definition = (table, fields, numbers = [], flags = [], dates = [], defaults = {}) => {
  const shape = Object.fromEntries(fields.map((name) => {
    const schema = name === "featured_id" ? integer.nullable() : dates.includes(name) ? timestamp : flags.includes(name) ? flag : numbers.includes(name) ? integer : text;
    return [name, Object.hasOwn(defaults, name) ? schema.default(defaults[name]) : schema];
  }));
  return { table, fields, schema: z.object(shape).strip(), dates };
};

const temporal = ["created_at", "updated_at"];
export const contentTables = [
  definition("center_events", ["id", "revision", "registrationClosed", "title", "titleEn", "date", "time", "venueType", "location", "locationEn", "description", "descriptionEn", "image", "link", "ticketPriceKrw", "ticketCapacity", "externalPayment", "isOnline", "onlineUrl", "onlineInstructions", "onlineInstructionsEn", "tags", ...temporal], ["id", "revision", "ticketCapacity"], ["registrationClosed", "externalPayment", "isOnline"], temporal,
    { revision: 1, registrationClosed: 0, venueType: "external", ticketPriceKrw: "", ticketCapacity: 0, externalPayment: 1, isOnline: 0, onlineUrl: "", onlineInstructions: "", onlineInstructionsEn: "", tags: "[]" }),
  definition("center_highlights", ["id", "revision", "title", "titleEn", "meta", "metaEn", "category", "categoryEn", "date", "startDate", "endDate", "host", "hostEn", "description", "descriptionEn", "image", "link", "icon", "sort_order", "is_active", "tags", ...temporal], ["id", "revision", "sort_order", "is_active"], [], temporal,
    { revision: 1, tags: "[]" }),
  definition("content_images", ["kind", "content_id", "position", "path"], ["content_id", "position"]),
  definition("content_slugs", ["kind", "slug", "content_id", "is_current"], ["content_id"], ["is_current"]),
  definition("notices", ["id", "revision", "slug", "title", "titleEn", "description", "descriptionEn", "is_active", "tags", ...temporal], ["id", "revision", "is_active"], [], temporal,
    { revision: 1, tags: "[]" }),
  definition("notice_slugs", ["slug", "notice_id"], ["notice_id"]),
  definition("collection_items", ["id", "revision", "kind", "slug", "purchaseUrl", "soldOut", "title", "titleEn", "creator", "creatorEn", "description", "descriptionEn", "images", "sort_order", "is_active", ...temporal], ["id", "revision", "sort_order", "is_active"], ["soldOut"], temporal,
    { revision: 1, slug: "", purchaseUrl: "", soldOut: 0 }),
  definition("visit_reviews", ["id", "revision", "kind", "url", "author", "date", "title", "titleEn", "summary", "summaryEn", "slug", "description", "descriptionEn", "feature_title", "feature_titleEn", "image", "sort_order", "is_active", ...temporal], ["id", "revision", "sort_order", "is_active"], [], temporal,
    { revision: 1, slug: "", description: "", descriptionEn: "" }),
  definition("review_slugs", ["slug", "review_id"], ["review_id"]),
  definition("review_selection", ["id", "revision", "featured_id", "home_ids"], ["id", "revision"], [], [], { revision: 1, home_ids: "[]" }),
  definition("center_opening_overrides", ["date", "status"]),
];

export const sqliteTableName = (table) => ({ center_events: "events", center_highlights: "highlights" })[table] ?? table;
export const serialTables = ["center_events", "center_highlights", "notices", "collection_items", "visit_reviews"];

export function normalizedRow(spec, row) {
  const parsed = spec.schema.parse(row);
  for (const name of ["tags", "images", "home_ids"]) {
    if (!Object.hasOwn(parsed, name)) continue;
    const value = z.array(name === "home_ids" ? integer.positive() : text).parse(JSON.parse(parsed[name]));
    parsed[name] = JSON.stringify(value);
  }
  return parsed;
}

export function comparableRow(spec, row) {
  return Object.fromEntries(spec.fields.map((field) => [field, spec.dates.includes(field) ? new Date(row[field]).toISOString() : row[field]]));
}
