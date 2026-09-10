import "server-only";
import { collectionRecordSchema, type CollectionInput, type CollectionRecord } from "@/lib/collection-contract";
import { getDatabase } from "@/server/events/db";
import { ApiError } from "@/server/events/errors";
import { requireExistingImages } from "@/server/events/images";

type CollectionRow = Omit<CollectionRecord, "images"> & { readonly images: string };
const fromRow = (row: CollectionRow): CollectionRecord => collectionRecordSchema.parse({ ...row, images: JSON.parse(row.images) });

export function listCollection(includeInactive = false): CollectionRecord[] {
  return getDatabase().prepare<[], CollectionRow>(`SELECT * FROM collection_items ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY sort_order ASC, id DESC`).all().map(fromRow);
}

export function getCollectionItem(id: number, includeInactive = false): CollectionRecord | null {
  const row = getDatabase().prepare<[number], CollectionRow>(`SELECT * FROM collection_items WHERE id = ? ${includeInactive ? "" : "AND is_active = 1"}`).get(id);
  return row ? fromRow(row) : null;
}

export function saveCollectionItem(input: CollectionInput, id?: number): CollectionRecord {
  requireExistingImages(input.images);
  const db = getDatabase();
  return db.transaction(() => {
    const values = { ...input, images: JSON.stringify(input.images) };
    let savedId = id;
    if (savedId === undefined) {
      savedId = Number(db.prepare(`INSERT INTO collection_items (kind,title,titleEn,creator,creatorEn,description,descriptionEn,images,sort_order,is_active)
        VALUES (@kind,@title,@titleEn,@creator,@creatorEn,@description,@descriptionEn,@images,@sort_order,@is_active)`).run(values).lastInsertRowid);
    } else {
      const result = db.prepare(`UPDATE collection_items SET kind=@kind,title=@title,titleEn=@titleEn,creator=@creator,creatorEn=@creatorEn,
        description=@description,descriptionEn=@descriptionEn,images=@images,sort_order=@sort_order,is_active=@is_active,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...values, id: savedId });
      if (!result.changes) throw new ApiError(404, "NOT_FOUND", "도서·작품을 찾을 수 없습니다.");
    }
    const saved = getCollectionItem(savedId, true);
    if (!saved) throw new ApiError(500, "SAVE_FAILED", "도서·작품을 저장하지 못했습니다.");
    return saved;
  })();
}

export function deleteCollectionItem(id: number): void {
  if (!getDatabase().prepare("DELETE FROM collection_items WHERE id = ?").run(id).changes) {
    throw new ApiError(404, "NOT_FOUND", "도서·작품을 찾을 수 없습니다.");
  }
}
