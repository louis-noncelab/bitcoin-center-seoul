import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  contentSlugSchema,
  eventRecordSchema,
  highlightRecordSchema,
  type EventInput,
  type EventRecord,
  type HighlightInput,
  type HighlightRecord,
} from "@/lib/events-contract";
import { centerEventLocation } from "@/lib/event-location";
import { prisma } from "@/server/db";
import { ApiError } from "@/server/events/errors";
import { collectImagePaths, deleteUnusedImages, placeImagesInSlugFolder, requireExistingImages, rewriteImagePaths } from "@/server/events/images";
import { reserveRevision } from "@/server/events/revision";
import { storedTagsSchema } from "@/server/events/tags";

import { syncEventTicketInTransaction, retireEventTicketInTransaction } from "./tickets";

type ContentKind = "event" | "highlight";
type Visibility = { readonly includeInactive?: boolean };
type Db = Prisma.TransactionClient;

function normalizedLink(link: string): string {
  const value = link.trim();
  return /^www\./i.test(value) ? `https://${value}` : value;
}

function highlightRank(row: { readonly endDate: string; readonly startDate: string; readonly date: string }): string {
  return row.endDate || row.startDate || row.date.replaceAll(".", "-");
}

async function imageMap(kind: ContentKind, ids: readonly number[]): Promise<Map<number, string[]>> {
  const rows = ids.length === 0 ? [] : await prisma.contentImage.findMany({
    where: { kind, contentId: { in: [...ids] } },
    orderBy: { position: "asc" },
  });
  const grouped = new Map<number, string[]>();
  for (const row of rows) {
    const list = grouped.get(row.contentId) ?? [];
    list.push(row.path);
    grouped.set(row.contentId, list);
  }
  return grouped;
}

async function slugMap(kind: ContentKind, ids?: readonly number[]): Promise<Map<number, string>> {
  const rows = await prisma.contentSlug.findMany({ where: { kind, isCurrent: true, ...(ids ? { contentId: { in: [...ids] } } : {}) } });
  return new Map(rows.map((row) => [row.contentId, row.slug]));
}

function eventFrom(row: {
  readonly id: number; readonly revision: number; readonly registrationClosed: boolean; readonly title: string; readonly titleEn: string;
  readonly date: string; readonly time: string; readonly venueType: string; readonly location: string; readonly locationEn: string;
  readonly description: string; readonly descriptionEn: string; readonly image: string; readonly link: string; readonly ticketPriceKrw: string;
  readonly ticketCapacity: number; readonly externalPayment: boolean; readonly isOnline: boolean; readonly onlineUrl: string;
  readonly onlineInstructions: string; readonly onlineInstructionsEn: string; readonly tags: string;
}, images: readonly string[], slug: string): EventRecord {
  const gallery = images.length > 0 ? [...images] : row.image ? [row.image] : [];
  return eventRecordSchema.parse({
    id: row.id, revision: row.revision, registrationClosed: row.registrationClosed, slug, tags: storedTagsSchema.parse(row.tags),
    title: row.title, titleEn: row.titleEn, date: row.date, time: row.time, venueType: row.venueType,
    location: row.location, locationEn: row.locationEn, description: row.description, descriptionEn: row.descriptionEn,
    image: gallery[0] ?? "", link: normalizedLink(row.link), ticketPriceKrw: row.ticketPriceKrw, ticketCapacity: row.ticketCapacity,
    externalPayment: row.externalPayment, isOnline: row.isOnline, onlineUrl: normalizedLink(row.onlineUrl),
    onlineInstructions: row.onlineInstructions, onlineInstructionsEn: row.onlineInstructionsEn, images: gallery,
  });
}

function highlightFrom(row: {
  readonly id: number; readonly revision: number; readonly title: string; readonly titleEn: string; readonly meta: string; readonly metaEn: string;
  readonly category: string; readonly categoryEn: string; readonly date: string; readonly startDate: string; readonly endDate: string;
  readonly host: string; readonly hostEn: string; readonly description: string; readonly descriptionEn: string; readonly image: string;
  readonly link: string; readonly icon: string; readonly sortOrder: number; readonly isActive: number; readonly tags: string;
}, images: readonly string[], slug: string): HighlightRecord {
  const gallery = images.length > 0 ? [...images] : row.image ? [row.image] : [];
  return highlightRecordSchema.parse({
    id: row.id, revision: row.revision, slug, tags: storedTagsSchema.parse(row.tags), title: row.title, titleEn: row.titleEn,
    meta: row.meta, metaEn: row.metaEn, category: row.category, categoryEn: row.categoryEn, date: row.date,
    startDate: row.startDate, endDate: row.endDate, host: row.host, hostEn: row.hostEn,
    description: row.description, descriptionEn: row.descriptionEn, image: gallery[0] ?? "", link: normalizedLink(row.link),
    icon: row.icon, sort_order: row.sortOrder, is_active: row.isActive === 1 ? 1 : 0, images: gallery,
  });
}

async function replaceImages(tx: Db, kind: ContentKind, contentId: number, images: readonly string[]): Promise<void> {
  await tx.contentImage.deleteMany({ where: { kind, contentId } });
  if (images.length) {
    await tx.contentImage.createMany({ data: images.map((path, position) => ({ kind, contentId, position, path })) });
  }
}

async function setSlug(tx: Db, kind: ContentKind, contentId: number, slug: string): Promise<void> {
  if (slug) {
    const owner = await tx.contentSlug.findUnique({ where: { kind_slug: { kind, slug } } });
    if (owner && owner.contentId !== contentId) {
      throw new ApiError(409, "SLUG_CONFLICT", "다른 게시물에서 사용 중이거나 이전에 사용한 주소입니다. 다른 주소를 입력해주세요.");
    }
  }
  await tx.contentSlug.updateMany({ where: { kind, contentId, isCurrent: true }, data: { isCurrent: false } });
  if (slug) {
    await tx.contentSlug.upsert({
      where: { kind_slug: { kind, slug } },
      create: { kind, slug, contentId, isCurrent: true },
      update: { contentId, isCurrent: true },
    });
  }
}

async function contentIdByPath(kind: ContentKind, value: string): Promise<number | null> {
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  const slug = contentSlugSchema.safeParse(value);
  if (!slug.success || slug.data === "") return null;
  return (await prisma.contentSlug.findUnique({ where: { kind_slug: { kind, slug: slug.data } } }))?.contentId ?? null;
}

export async function getEventByPath(value: string): Promise<EventRecord | null> {
  const id = await contentIdByPath("event", value);
  return id === null ? null : getEvent(id);
}

export async function getHighlightByPath(value: string, options: Visibility = {}): Promise<HighlightRecord | null> {
  const id = await contentIdByPath("highlight", value);
  return id === null ? null : getHighlight(id, options);
}

export async function listEvents(): Promise<EventRecord[]> {
  const rows = await prisma.centerEvent.findMany({ orderBy: [{ date: "desc" }, { time: "desc" }, { id: "desc" }] });
  const [images, slugs] = await Promise.all([imageMap("event", rows.map((row) => row.id)), slugMap("event")]);
  return rows.map((row) => eventFrom(row, images.get(row.id) ?? [], slugs.get(row.id) ?? ""));
}

export async function getEvent(id: number): Promise<EventRecord | null> {
  const row = await prisma.centerEvent.findUnique({ where: { id } });
  if (!row) return null;
  const [images, slug] = await Promise.all([
    imageMap("event", [id]),
    prisma.contentSlug.findFirst({ where: { kind: "event", contentId: id, isCurrent: true } }),
  ]);
  return eventFrom(row, images.get(id) ?? [], slug?.slug ?? "");
}

export async function listHighlights(options: Visibility = {}): Promise<HighlightRecord[]> {
  const rows = await prisma.centerHighlight.findMany({ where: options.includeInactive ? {} : { isActive: 1 } });
  rows.sort((left, right) => highlightRank(right).localeCompare(highlightRank(left)) || right.id - left.id);
  const [images, slugs] = await Promise.all([imageMap("highlight", rows.map((row) => row.id)), slugMap("highlight")]);
  return rows.map((row) => highlightFrom(row, images.get(row.id) ?? [], slugs.get(row.id) ?? ""));
}

export async function listHighlightsPage(requestedPage: number) {
  const total = await prisma.centerHighlight.count({ where: { isActive: 1 } });
  const totalPages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const pageRows = await prisma.$queryRaw<{ readonly id: number }[]>`
    SELECT id FROM center_highlights WHERE is_active = 1
    ORDER BY COALESCE(NULLIF("endDate", ''), NULLIF("startDate", ''), REPLACE(date, '.', '-')) DESC, id DESC
    LIMIT 12 OFFSET ${(page - 1) * 12}`;
  const ids = pageRows.map((row) => row.id);
  const [rows, images, slugs] = await Promise.all([
    prisma.centerHighlight.findMany({ where: { id: { in: ids }, isActive: 1 } }),
    imageMap("highlight", ids), slugMap("highlight", ids),
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const highlights = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [highlightFrom(row, images.get(id) ?? [], slugs.get(id) ?? "")] : [];
  });
  return { highlights, page, totalPages };
}

export async function getHighlight(id: number, options: Visibility = {}): Promise<HighlightRecord | null> {
  const row = await prisma.centerHighlight.findFirst({ where: { id, ...(options.includeInactive ? {} : { isActive: 1 }) } });
  if (!row) return null;
  const [images, slug] = await Promise.all([
    imageMap("highlight", [id]),
    prisma.contentSlug.findFirst({ where: { kind: "highlight", contentId: id, isCurrent: true } }),
  ]);
  return highlightFrom(row, images.get(id) ?? [], slug?.slug ?? "");
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  requireExistingImages(input.images);
  const placed = await placeImagesInSlugFolder("events", input.slug, input.images);
  const description = rewriteImagePaths(input.description, input.images, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, input.images, placed.images);
  try {
  const id = await prisma.$transaction(async (tx) => {
    const image = placed.images[0] ?? "";
    const created = await tx.centerEvent.create({
      data: {
        registrationClosed: input.registrationClosed ?? false, title: input.title, titleEn: input.titleEn, date: input.date, time: input.time,
        venueType: input.venueType, location: input.location, locationEn: input.locationEn, description,
        descriptionEn, image, link: input.link, ticketPriceKrw: input.ticketPriceKrw, ticketCapacity: input.ticketCapacity,
        externalPayment: input.externalPayment, isOnline: input.isOnline, onlineUrl: input.onlineUrl, onlineInstructions: input.onlineInstructions,
        onlineInstructionsEn: input.onlineInstructionsEn, tags: JSON.stringify(input.tags),
        ...(input.venueType === "center" && !input.isOnline ? centerEventLocation : {}),
      },
    });
    await replaceImages(tx, "event", created.id, placed.images);
    await setSlug(tx, "event", created.id, input.slug);
    await syncEventTicketInTransaction(tx, created, 0);
    return created.id;
  });
  const event = await getEvent(id);
  if (!event) throw new ApiError(500, "WRITE_FAILED", "행사 저장에 실패했습니다.");
  return event;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function setEventRegistration(id: number, registrationClosed: boolean, revision: number): Promise<EventRecord> {
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "events", id, revision);
    const event = await tx.centerEvent.update({ where: { id }, data: { registrationClosed } });
    await syncEventTicketInTransaction(tx, event);
  });
  const event = await getEvent(id);
  if (!event) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
  return event;
}

export async function updateEvent(id: number, input: EventInput, revision: number): Promise<EventRecord> {
  requireExistingImages(input.images);
  const previous = await getEvent(id);
  const placed = await placeImagesInSlugFolder("events", input.slug, input.images);
  const description = rewriteImagePaths(input.description, input.images, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, input.images, placed.images);
  try {
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "events", id, revision);
    const current = await tx.centerEvent.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
    const updated = await tx.centerEvent.update({
      where: { id },
      data: {
        registrationClosed: input.registrationClosed ?? current.registrationClosed, title: input.title, titleEn: input.titleEn, date: input.date, time: input.time,
        venueType: input.venueType, location: input.location, locationEn: input.locationEn, description,
        descriptionEn, image: placed.images[0] ?? "", link: input.link, ticketPriceKrw: input.ticketPriceKrw,
        ticketCapacity: input.ticketCapacity, externalPayment: input.externalPayment, isOnline: input.isOnline, onlineUrl: input.onlineUrl,
        onlineInstructions: input.onlineInstructions, onlineInstructionsEn: input.onlineInstructionsEn, tags: JSON.stringify(input.tags),
        ...(input.venueType === "center" && !input.isOnline ? centerEventLocation : {}),
      },
    });
    await syncEventTicketInTransaction(tx, updated, current.ticketCapacity);
    await replaceImages(tx, "event", id, placed.images);
    await setSlug(tx, "event", id, input.slug);
  });
  const event = await getEvent(id);
  if (!event) throw new ApiError(500, "WRITE_FAILED", "행사 저장에 실패했습니다.");
  const kept = new Set(collectImagePaths(placed.images, description, descriptionEn));
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn).filter((image) => !kept.has(image)));
  return event;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function paidOnlineSessions(skus: readonly string[]) {
  const ids = [...new Set(skus.flatMap((sku) => {
    const match = /^MEETUP-(\d+)$/.exec(sku);
    return match ? [Number(match[1])] : [];
  }))];
  if (!ids.length) return [];
  const rows = await prisma.centerEvent.findMany({ where: { id: { in: ids }, isOnline: true, NOT: { onlineUrl: "" } } });
  return rows.map((row) => ({ titleKo: row.title, titleEn: row.titleEn, url: normalizedLink(row.onlineUrl), note: row.onlineInstructions, noteEn: row.onlineInstructionsEn }));
}

export async function deleteEvent(id: number, revision: number): Promise<void> {
  const previous = await getEvent(id);
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "events", id, revision);
    await retireEventTicketInTransaction(tx, id);
    await tx.centerEvent.delete({ where: { id } });
    await tx.contentImage.deleteMany({ where: { kind: "event", contentId: id } });
    await tx.contentSlug.deleteMany({ where: { kind: "event", contentId: id } });
  });
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn));
}

export async function createHighlight(input: HighlightInput): Promise<HighlightRecord> {
  requireExistingImages(input.images);
  const placed = await placeImagesInSlugFolder("highlights", input.slug, input.images);
  const description = rewriteImagePaths(input.description, input.images, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, input.images, placed.images);
  try {
  const id = await prisma.$transaction(async (tx) => {
    const created = await tx.centerHighlight.create({
      data: {
        title: input.title, titleEn: input.titleEn, meta: input.meta, metaEn: input.metaEn, category: input.category, categoryEn: input.categoryEn,
        date: input.date, startDate: input.startDate, endDate: input.endDate, host: input.host, hostEn: input.hostEn,
        description, descriptionEn, image: placed.images[0] ?? "", link: input.link, icon: input.icon,
        sortOrder: input.sort_order, isActive: input.is_active, tags: JSON.stringify(input.tags),
      },
    });
    await replaceImages(tx, "highlight", created.id, placed.images);
    await setSlug(tx, "highlight", created.id, input.slug);
    return created.id;
  });
  const highlight = await getHighlight(id, { includeInactive: true });
  if (!highlight) throw new ApiError(500, "WRITE_FAILED", "하이라이트 저장에 실패했습니다.");
  return highlight;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function updateHighlight(id: number, input: HighlightInput, revision: number): Promise<HighlightRecord> {
  requireExistingImages(input.images);
  const previous = await getHighlight(id, { includeInactive: true });
  const placed = await placeImagesInSlugFolder("highlights", input.slug, input.images);
  const description = rewriteImagePaths(input.description, input.images, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, input.images, placed.images);
  try {
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "highlights", id, revision);
    await tx.centerHighlight.update({
      where: { id },
      data: {
        title: input.title, titleEn: input.titleEn, meta: input.meta, metaEn: input.metaEn, category: input.category, categoryEn: input.categoryEn,
        date: input.date, startDate: input.startDate, endDate: input.endDate, host: input.host, hostEn: input.hostEn,
        description, descriptionEn, image: placed.images[0] ?? "", link: input.link, icon: input.icon,
        sortOrder: input.sort_order, isActive: input.is_active, tags: JSON.stringify(input.tags),
      },
    });
    await replaceImages(tx, "highlight", id, placed.images);
    await setSlug(tx, "highlight", id, input.slug);
  });
  const highlight = await getHighlight(id, { includeInactive: true });
  if (!highlight) throw new ApiError(500, "WRITE_FAILED", "하이라이트 저장에 실패했습니다.");
  const kept = new Set(collectImagePaths(placed.images, description, descriptionEn));
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn).filter((image) => !kept.has(image)));
  return highlight;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function deleteHighlight(id: number, revision: number): Promise<void> {
  const previous = await getHighlight(id, { includeInactive: true });
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "highlights", id, revision);
    await tx.centerHighlight.delete({ where: { id } });
    await tx.contentImage.deleteMany({ where: { kind: "highlight", contentId: id } });
    await tx.contentSlug.deleteMany({ where: { kind: "highlight", contentId: id } });
  });
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn));
}
