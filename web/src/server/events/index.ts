import "server-only";

import {
  contentSlugSchema,
  eventRecordSchema,
  highlightRecordSchema,
  type EventInput,
  type EventRecord,
  type HighlightInput,
  type HighlightRecord,
} from "@/lib/events-contract";
import { getDatabase } from "@/server/events/db";
import { ApiError } from "@/server/events/errors";
import { requireExistingImages } from "@/server/events/images";
import { reserveRevision } from "@/server/events/revision";
import { storedTagsSchema } from "@/server/events/tags";
import { centerEventLocation } from "@/lib/event-location";

type EventRow = Omit<EventRecord, "images" | "tags" | "registrationClosed" | "ticketCapacity" | "externalPayment" | "isOnline"> & { readonly tags: string; readonly registrationClosed: number; readonly ticketCapacity: number; readonly externalPayment: number; readonly isOnline: number };
type HighlightRow = Omit<HighlightRecord, "images" | "tags"> & { readonly tags: string };
type ContentKind = "event" | "highlight";
type Visibility = { readonly includeInactive?: boolean };

const eventSelect = `
  SELECT id, revision, registrationClosed, title, titleEn, date, time, venueType, location, locationEn,
         description, descriptionEn, image, link, ticketPriceKrw, ticketCapacity, externalPayment, isOnline, onlineUrl, onlineInstructions, onlineInstructionsEn, tags,
         COALESCE((SELECT slug FROM content_slugs WHERE kind = 'event' AND content_id = events.id AND is_current = 1), '') AS slug
  FROM events`;
const highlightSelect = `
  SELECT id, revision, title, titleEn, meta, metaEn, category, categoryEn, date,
         startDate, endDate, host, hostEn, description, descriptionEn,
         image, link, icon, sort_order, is_active, tags,
         COALESCE((SELECT slug FROM content_slugs WHERE kind = 'highlight' AND content_id = highlights.id AND is_current = 1), '') AS slug
  FROM highlights`;
const highlightOrder = `
  ORDER BY COALESCE(NULLIF(endDate, ''), NULLIF(startDate, ''), REPLACE(date, '.', '-')) DESC, id DESC`;

function imagesFor(kind: ContentKind, contentId: number, legacyImage: string): string[] {
  const rows = getDatabase()
    .prepare<[ContentKind, number], { readonly path: string }>(
      "SELECT path FROM content_images WHERE kind = ? AND content_id = ? ORDER BY position",
    )
    .all(kind, contentId);
  return rows.length > 0 ? rows.map(({ path }) => path) : legacyImage ? [legacyImage] : [];
}

function eventFrom(row: EventRow): EventRecord {
  const images = imagesFor("event", row.id, row.image);
  return eventRecordSchema.parse({ ...row, registrationClosed: row.registrationClosed === 1, externalPayment: row.externalPayment === 1, isOnline: row.isOnline === 1, tags: storedTagsSchema.parse(row.tags), image: images[0] ?? "", link: normalizedLink(row.link), onlineUrl: normalizedLink(row.onlineUrl), images });
}

function highlightFrom(row: HighlightRow): HighlightRecord {
  const images = imagesFor("highlight", row.id, row.image);
  return highlightRecordSchema.parse({ ...row, tags: storedTagsSchema.parse(row.tags), image: images[0] ?? "", link: normalizedLink(row.link), images });
}

function normalizedLink(link: string): string {
  const value = link.trim();
  return /^www\./i.test(value) ? `https://${value}` : value;
}

function replaceImages(kind: ContentKind, contentId: number, images: readonly string[]): void {
  const db = getDatabase();
  db.prepare<[ContentKind, number]>("DELETE FROM content_images WHERE kind = ? AND content_id = ?").run(kind, contentId);
  const insert = db.prepare<[ContentKind, number, number, string]>(
    "INSERT INTO content_images (kind, content_id, position, path) VALUES (?, ?, ?, ?)",
  );
  images.forEach((image, position) => insert.run(kind, contentId, position, image));
}

function setSlug(kind: ContentKind, contentId: number, slug: string): void {
  const db = getDatabase();
  const owner = db.prepare<[ContentKind, string], { readonly content_id: number }>(
    "SELECT content_id FROM content_slugs WHERE kind = ? AND slug = ?",
  ).get(kind, slug);
  if (owner && owner.content_id !== contentId) {
    throw new ApiError(409, "SLUG_CONFLICT", "다른 게시물에서 사용 중이거나 이전에 사용한 주소입니다. 다른 주소를 입력해주세요.");
  }
  db.prepare<[ContentKind, number]>("UPDATE content_slugs SET is_current = 0 WHERE kind = ? AND content_id = ? AND is_current = 1").run(kind, contentId);
  if (slug) {
    db.prepare<[ContentKind, string, number]>(`
      INSERT INTO content_slugs (kind, slug, content_id, is_current) VALUES (?, ?, ?, 1)
      ON CONFLICT (kind, slug) DO UPDATE SET is_current = 1
    `).run(kind, slug, contentId);
  }
}

function contentIdByPath(kind: ContentKind, value: string): number | null {
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  const slug = contentSlugSchema.safeParse(value);
  if (!slug.success || slug.data === "") return null;
  return getDatabase().prepare<[ContentKind, string], { readonly content_id: number }>(
    "SELECT content_id FROM content_slugs WHERE kind = ? AND slug = ?",
  ).get(kind, slug.data)?.content_id ?? null;
}

export function getEventByPath(value: string): EventRecord | null {
  const id = contentIdByPath("event", value);
  return id === null ? null : getEvent(id);
}

export function getHighlightByPath(value: string, options: Visibility = {}): HighlightRecord | null {
  const id = contentIdByPath("highlight", value);
  return id === null ? null : getHighlight(id, options);
}

export function listEvents(): EventRecord[] {
  return getDatabase()
    .prepare<[], EventRow>(`${eventSelect} ORDER BY date DESC, time DESC, id DESC`)
    .all()
    .map(eventFrom);
}

export function getEvent(id: number): EventRecord | null {
  const row = getDatabase().prepare<[number], EventRow>(`${eventSelect} WHERE id = ?`).get(id);
  return row ? eventFrom(row) : null;
}

export function listHighlights(options: Visibility = {}): HighlightRecord[] {
  const where = options.includeInactive ? "" : " WHERE is_active = 1";
  return getDatabase()
    .prepare<[], HighlightRow>(`${highlightSelect}${where}${highlightOrder}`)
    .all()
    .map(highlightFrom);
}

export function listHighlightsPage(requestedPage: number) {
  const db = getDatabase();
  return db.transaction(() => {
    const total = db.prepare<[], { readonly total: number }>("SELECT COUNT(*) AS total FROM highlights WHERE is_active = 1").get()?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 12));
    const page = Math.min(totalPages, Math.max(1, requestedPage));
    const highlights = db.prepare<[number, number], HighlightRow>(`${highlightSelect} WHERE is_active = 1${highlightOrder} LIMIT ? OFFSET ?`)
      .all(12, (page - 1) * 12).map(highlightFrom);
    return { highlights, page, totalPages };
  })();
}

export function getHighlight(id: number, options: Visibility = {}): HighlightRecord | null {
  const active = options.includeInactive ? "" : " AND is_active = 1";
  const row = getDatabase()
    .prepare<[number], HighlightRow>(`${highlightSelect} WHERE id = ?${active}`)
    .get(id);
  return row ? highlightFrom(row) : null;
}

export function createEvent(input: EventInput): EventRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  const create = db.transaction(() => {
    const image = input.images[0] ?? "";
    const result = db.prepare(`
      INSERT INTO events (registrationClosed, title, titleEn, date, time, venueType, location, locationEn, description, descriptionEn, image, link, ticketPriceKrw, ticketCapacity, externalPayment, isOnline, onlineUrl, onlineInstructions, onlineInstructionsEn, tags)
      VALUES (@registrationClosed, @title, @titleEn, @date, @time, @venueType, @location, @locationEn, @description, @descriptionEn, @image, @link, @ticketPriceKrw, @ticketCapacity, @externalPayment, @isOnline, @onlineUrl, @onlineInstructions, @onlineInstructionsEn, @tags)
    `).run({ ...input, registrationClosed: input.registrationClosed ? 1 : 0, externalPayment: input.externalPayment ? 1 : 0, isOnline: input.isOnline ? 1 : 0, ...(input.venueType === "center" && !input.isOnline ? centerEventLocation : {}), image, tags: JSON.stringify(input.tags) });
    const id = Number(result.lastInsertRowid);
    replaceImages("event", id, input.images);
    setSlug("event", id, input.slug);
    return id;
  });
  const event = getEvent(create());
  if (!event) throw new ApiError(500, "WRITE_FAILED", "행사 저장에 실패했습니다.");
  return event;
}

export function setEventRegistration(id: number, registrationClosed: boolean, revision: number): EventRecord {
  const db = getDatabase();
  return db.transaction(() => {
    reserveRevision("events", id, revision);
    db.prepare("UPDATE events SET registrationClosed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(Number(registrationClosed), id);
    return getEvent(id)!;
  }).immediate();
}

export function updateEvent(id: number, input: EventInput, revision: number): EventRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  db.transaction(() => {
    reserveRevision("events", id, revision);
    const image = input.images[0] ?? "";
    const result = db.prepare(`
      UPDATE events SET registrationClosed = COALESCE(@registrationClosed, registrationClosed), title = @title, titleEn = @titleEn, date = @date, time = @time,
        venueType = @venueType, location = @location, locationEn = @locationEn, description = @description,
        descriptionEn = @descriptionEn, image = @image, link = @link, ticketPriceKrw = @ticketPriceKrw, ticketCapacity = @ticketCapacity, externalPayment = @externalPayment, isOnline = @isOnline, onlineUrl = @onlineUrl, onlineInstructions = @onlineInstructions, onlineInstructionsEn = @onlineInstructionsEn, tags = @tags, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...input, registrationClosed: input.registrationClosed === undefined ? null : Number(input.registrationClosed), externalPayment: input.externalPayment ? 1 : 0, isOnline: input.isOnline ? 1 : 0, ...(input.venueType === "center" && !input.isOnline ? centerEventLocation : {}), id, image, tags: JSON.stringify(input.tags) });
    if (result.changes === 0) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
    replaceImages("event", id, input.images);
    setSlug("event", id, input.slug);
  })();
  const event = getEvent(id);
  if (!event) throw new ApiError(500, "WRITE_FAILED", "행사 저장에 실패했습니다.");
  return event;
}

export function paidOnlineSessions(skus: readonly string[]) {
  const ids = [...new Set(skus.flatMap((sku) => {
    const match = /^MEETUP-(\d+)$/.exec(sku);
    return match ? [Number(match[1])] : [];
  }))];
  if (!ids.length) return [];
  const rows = getDatabase().prepare<number[], { readonly title: string; readonly titleEn: string; readonly onlineUrl: string; readonly onlineInstructions: string; readonly onlineInstructionsEn: string }>(
    `SELECT title, titleEn, onlineUrl, onlineInstructions, onlineInstructionsEn FROM events WHERE isOnline = 1 AND onlineUrl <> '' AND id IN (${ids.map(() => "?").join(",")})`,
  ).all(...ids);
  return rows.map((row) => ({ titleKo: row.title, titleEn: row.titleEn, url: normalizedLink(row.onlineUrl), note: row.onlineInstructions, noteEn: row.onlineInstructionsEn }));
}

export function deleteEvent(id: number, revision: number): void {
  const db = getDatabase();
  db.transaction(() => {
    reserveRevision("events", id, revision);
    const result = db.prepare<[number]>("DELETE FROM events WHERE id = ?").run(id);
    if (result.changes === 0) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
    db.prepare<[ContentKind, number]>("DELETE FROM content_images WHERE kind = ? AND content_id = ?").run("event", id);
    db.prepare<[ContentKind, number]>("DELETE FROM content_slugs WHERE kind = ? AND content_id = ?").run("event", id);
  })();
}

export function createHighlight(input: HighlightInput): HighlightRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  const create = db.transaction(() => {
    const image = input.images[0] ?? "";
    const result = db.prepare(`
      INSERT INTO highlights (title, titleEn, meta, metaEn, category, categoryEn, date, startDate, endDate,
        host, hostEn, description, descriptionEn, image, link, icon, sort_order, is_active, tags)
      VALUES (@title, @titleEn, @meta, @metaEn, @category, @categoryEn, @date, @startDate, @endDate,
        @host, @hostEn, @description, @descriptionEn, @image, @link, @icon, @sort_order, @is_active, @tags)
    `).run({ ...input, image, tags: JSON.stringify(input.tags) });
    const id = Number(result.lastInsertRowid);
    replaceImages("highlight", id, input.images);
    setSlug("highlight", id, input.slug);
    return id;
  });
  const highlight = getHighlight(create(), { includeInactive: true });
  if (!highlight) throw new ApiError(500, "WRITE_FAILED", "하이라이트 저장에 실패했습니다.");
  return highlight;
}

export function updateHighlight(id: number, input: HighlightInput, revision: number): HighlightRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  db.transaction(() => {
    reserveRevision("highlights", id, revision);
    const image = input.images[0] ?? "";
    const result = db.prepare(`
      UPDATE highlights SET title = @title, titleEn = @titleEn, meta = @meta, metaEn = @metaEn,
        category = @category, categoryEn = @categoryEn, date = @date, startDate = @startDate, endDate = @endDate,
        host = @host, hostEn = @hostEn, description = @description, descriptionEn = @descriptionEn,
        image = @image, link = @link, icon = @icon, sort_order = @sort_order, is_active = @is_active, tags = @tags,
        updated_at = CURRENT_TIMESTAMP WHERE id = @id
    `).run({ ...input, id, image, tags: JSON.stringify(input.tags) });
    if (result.changes === 0) throw new ApiError(404, "NOT_FOUND", "하이라이트를 찾을 수 없습니다.");
    replaceImages("highlight", id, input.images);
    setSlug("highlight", id, input.slug);
  })();
  const highlight = getHighlight(id, { includeInactive: true });
  if (!highlight) throw new ApiError(500, "WRITE_FAILED", "하이라이트 저장에 실패했습니다.");
  return highlight;
}

export function deleteHighlight(id: number, revision: number): void {
  const db = getDatabase();
  db.transaction(() => {
    reserveRevision("highlights", id, revision);
    const result = db.prepare<[number]>("DELETE FROM highlights WHERE id = ?").run(id);
    if (result.changes === 0) throw new ApiError(404, "NOT_FOUND", "하이라이트를 찾을 수 없습니다.");
    db.prepare<[ContentKind, number]>("DELETE FROM content_images WHERE kind = ? AND content_id = ?").run("highlight", id);
    db.prepare<[ContentKind, number]>("DELETE FROM content_slugs WHERE kind = ? AND content_id = ?").run("highlight", id);
  })();
}
