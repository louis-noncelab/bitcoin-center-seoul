import "server-only";
import { collectionRecordSchema, type CollectionInput, type CollectionKind, type CollectionRecord } from "@/lib/collection-contract";
import { contentSlugSchema } from "@/lib/events-contract";
import { prisma } from "@/server/db";
import { ApiError } from "@/server/events/errors";
import { collectImagePaths, deleteUnusedImages, placeImagesInSlugFolder, requireExistingImages, rewriteImagePaths } from "@/server/events/images";
import { reserveRevision } from "@/server/events/revision";

function storedTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function fromRow(row: {
  id: number; revision: number; kind: string; slug: string; purchaseUrl: string; soldOut: boolean; title: string; titleEn: string;
  creator: string; creatorEn: string; description: string; descriptionEn: string; images: string; sortOrder: number; isActive: number;
  createdAt: Date; updatedAt: Date;
}): CollectionRecord {
  return collectionRecordSchema.parse({
    id: row.id, revision: row.revision, kind: row.kind, slug: row.slug, purchaseUrl: row.purchaseUrl, soldOut: row.soldOut,
    title: row.title, titleEn: row.titleEn, creator: row.creator, creatorEn: row.creatorEn,
    description: row.description, descriptionEn: row.descriptionEn, images: JSON.parse(row.images),
    sort_order: row.sortOrder, is_active: row.isActive === 1 ? 1 : 0,
    created_at: storedTime(row.createdAt), updated_at: storedTime(row.updatedAt),
  });
}

export async function listCollection(includeInactive = false, kinds?: readonly CollectionKind[]): Promise<CollectionRecord[]> {
  const rows = await prisma.collectionItem.findMany({
    where: { ...(includeInactive ? {} : { isActive: 1 }), ...(kinds ? { kind: { in: [...kinds] } } : {}) },
    orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
  });
  return rows.map(fromRow);
}

export async function getCollectionItem(id: number, includeInactive = false, kinds?: readonly CollectionKind[]): Promise<CollectionRecord | null> {
  const row = await prisma.collectionItem.findFirst({
    where: { id, ...(includeInactive ? {} : { isActive: 1 }), ...(kinds ? { kind: { in: [...kinds] } } : {}) },
  });
  return row ? fromRow(row) : null;
}

export async function getCollectionByPath(value: string, includeInactive = false, kinds?: readonly CollectionKind[]): Promise<CollectionRecord | null> {
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? getCollectionItem(id, includeInactive, kinds) : null;
  }
  const slug = contentSlugSchema.safeParse(value);
  if (!slug.success || slug.data === "") return null;
  const row = await prisma.collectionItem.findFirst({
    where: { slug: slug.data, ...(includeInactive ? {} : { isActive: 1 }), ...(kinds ? { kind: { in: [...kinds] } } : {}) },
  });
  return row ? fromRow(row) : null;
}

export function collectionHref(record: CollectionRecord): string {
  const base = record.kind === "boardgame" ? "/experience/board-game" : record.kind === "goods" ? "/goods" : "/collection";
  return `${base}/${record.slug || record.id}`;
}

async function assertSlugAvailable(slug: string, id?: number): Promise<void> {
  if (!slug) return;
  const owner = await prisma.collectionItem.findFirst({ where: { slug } });
  if (owner && owner.id !== id) throw new ApiError(409, "SLUG_CONFLICT", "다른 항목에서 사용 중인 주소입니다. 다른 주소를 입력해 주세요.");
}

export async function saveCollectionItem(input: CollectionInput, id?: number, revision?: number): Promise<CollectionRecord> {
  requireExistingImages(input.images);
  const previous = id === undefined ? null : await getCollectionItem(id, true);
  const placed = await placeImagesInSlugFolder("collection", input.slug, input.images);
  const description = rewriteImagePaths(input.description, input.images, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, input.images, placed.images);
  try {
  const savedId = await prisma.$transaction(async (tx) => {
    if (id !== undefined) await reserveRevision(tx, "collection_items", id, revision);
    await assertSlugAvailable(input.slug, id);
    const data = {
      kind: input.kind, slug: input.slug, purchaseUrl: "", soldOut: false, title: input.title, titleEn: input.titleEn,
      creator: input.creator, creatorEn: input.creatorEn, description, descriptionEn,
      images: JSON.stringify(placed.images), sortOrder: input.sort_order, isActive: input.is_active,
    };
    const saved = id === undefined ? await tx.collectionItem.create({ data }) : await tx.collectionItem.update({ where: { id }, data });
    return saved.id;
  });
  const saved = await getCollectionItem(savedId, true);
  if (!saved) throw new ApiError(500, "SAVE_FAILED", "항목을 저장하지 못했습니다.");
  const kept = new Set(collectImagePaths(placed.images, description, descriptionEn));
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn).filter((image) => !kept.has(image)));
  return saved;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function deleteCollectionItem(id: number, revision: number): Promise<void> {
  const previous = await getCollectionItem(id, true);
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "collection_items", id, revision);
    await tx.collectionItem.delete({ where: { id } });
  });
  await deleteUnusedImages(collectImagePaths(previous?.images, previous?.description, previous?.descriptionEn));
}

export async function setCollectionSoldOut(id: number, _soldOut: boolean, revision: number): Promise<never> {
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "collection_items", id, revision);
    if (!await tx.collectionItem.findUnique({ where: { id } })) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
    throw new ApiError(400, "UNSUPPORTED_COLLECTION_KIND", "품절은 상점 재고로 관리합니다. 보드게임과 작품은 구매하지 않습니다.");
  });
  throw new ApiError(400, "UNSUPPORTED_COLLECTION_KIND", "품절은 상점 재고로 관리합니다. 보드게임과 작품은 구매하지 않습니다.");
}
