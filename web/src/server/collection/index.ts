import "server-only";
import { collectionRecordSchema, type CollectionInput, type CollectionKind, type CollectionRecord } from "@/lib/collection-contract";
import { contentSlugSchema } from "@/lib/events-contract";
import { reserveRevision } from "@/server/events/revision";
import { getDatabase } from "@/server/events/db";
import { ApiError } from "@/server/events/errors";
import { requireExistingImages } from "@/server/events/images";

type CollectionRow = Omit<CollectionRecord, "images" | "soldOut"> & { readonly images: string; readonly soldOut: number };
const fromRow = (row: CollectionRow): CollectionRecord => collectionRecordSchema.parse({ ...row, soldOut: Boolean(row.soldOut), images: JSON.parse(row.images) });

const kindFilter = (kinds?: readonly CollectionKind[]) =>
  kinds ? ` AND kind IN (${kinds.map((kind) => `'${kind}'`).join(", ")})` : "";

export function listCollection(includeInactive = false, kinds?: readonly CollectionKind[]): CollectionRecord[] {
  return getDatabase().prepare<[], CollectionRow>(`SELECT * FROM collection_items WHERE 1 = 1 ${includeInactive ? "" : "AND is_active = 1"}${kindFilter(kinds)} ORDER BY sort_order ASC, id DESC`).all().map(fromRow);
}

export function getCollectionItem(id: number, includeInactive = false, kinds?: readonly CollectionKind[]): CollectionRecord | null {
  const row = getDatabase().prepare<[number], CollectionRow>(`SELECT * FROM collection_items WHERE id = ? ${includeInactive ? "" : "AND is_active = 1"}${kindFilter(kinds)}`).get(id);
  return row ? fromRow(row) : null;
}

export function getCollectionByPath(value: string, includeInactive = false, kinds?: readonly CollectionKind[]): CollectionRecord | null {
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? getCollectionItem(id, includeInactive, kinds) : null;
  }
  const slug = contentSlugSchema.safeParse(value);
  if (!slug.success || slug.data === "") return null;
  const row = getDatabase().prepare<[string], CollectionRow>(`SELECT * FROM collection_items WHERE slug = ? ${includeInactive ? "" : "AND is_active = 1"}${kindFilter(kinds)}`).get(slug.data);
  return row ? fromRow(row) : null;
}

export function collectionHref(record: CollectionRecord): string {
  const base = record.kind === "boardgame" ? "/experience/board-game" : record.kind === "goods" ? "/goods" : "/collection";
  return `${base}/${record.slug || record.id}`;
}

function assertSlugAvailable(slug: string, id?: number): void {
  if (!slug) return;
  const owner = getDatabase().prepare<[string], { readonly id: number }>("SELECT id FROM collection_items WHERE slug = ?").get(slug);
  if (owner && owner.id !== id) throw new ApiError(409, "SLUG_CONFLICT", "다른 항목에서 사용 중인 주소입니다. 다른 주소를 입력해 주세요.");
}

export function saveCollectionItem(input: CollectionInput, id?: number, revision?: number): CollectionRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  return db.transaction(() => {
    if (id !== undefined) reserveRevision("collection_items", id, revision);
    assertSlugAvailable(input.slug, id);
    const values = { ...input, soldOut: input.soldOut === undefined ? null : Number(input.soldOut), images: JSON.stringify(input.images) };
    let savedId = id;
    if (savedId === undefined) {
      savedId = Number(db.prepare(`INSERT INTO collection_items (kind,slug,purchaseUrl,soldOut,title,titleEn,creator,creatorEn,description,descriptionEn,images,sort_order,is_active)
        VALUES (@kind,@slug,@purchaseUrl,COALESCE(@soldOut,0),@title,@titleEn,@creator,@creatorEn,@description,@descriptionEn,@images,@sort_order,@is_active)`).run(values).lastInsertRowid);
    } else {
      const result = db.prepare(`UPDATE collection_items SET kind=@kind,slug=@slug,purchaseUrl=@purchaseUrl,soldOut=COALESCE(@soldOut,soldOut),title=@title,titleEn=@titleEn,creator=@creator,creatorEn=@creatorEn,
        description=@description,descriptionEn=@descriptionEn,images=@images,sort_order=@sort_order,is_active=@is_active,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...values, id: savedId });
      if (!result.changes) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
    }
    const saved = getCollectionItem(savedId, true);
    if (!saved) throw new ApiError(500, "SAVE_FAILED", "항목을 저장하지 못했습니다.");
    return saved;
  })();
}

export function deleteCollectionItem(id: number, revision: number): void {
  const db = getDatabase();
  db.transaction(() => {
    reserveRevision("collection_items", id, revision);
    db.prepare("DELETE FROM collection_items WHERE id = ?").run(id);
  })();
}

export function setCollectionSoldOut(id: number, soldOut: boolean, revision: number): CollectionRecord {
  const db = getDatabase();
  return db.transaction(() => {
    reserveRevision("collection_items", id, revision);
    db.prepare("UPDATE collection_items SET soldOut = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(Number(soldOut), id);
    const saved = getCollectionItem(id, true);
    if (!saved) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
    return saved;
  }).immediate();
}
