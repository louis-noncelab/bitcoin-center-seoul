import "server-only";
import { cache } from "react";
import { reviewRecordSchema, reviewSelectionSchema, type ReviewInput, type ReviewRecord, type ReviewSelectionInput } from "@/lib/reviews-contract";
import { getDatabase } from "@/server/events/db";
import { reserveRevision } from "@/server/events/revision";
import { markdownImageReferences } from "@/server/events/image-references";
import { requireExistingImages } from "@/server/events/images";
import { ApiError } from "@/server/events/errors";
export function listReviews(includeInactive = false): ReviewRecord[] {
  return getDatabase().prepare(`SELECT * FROM visit_reviews ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY sort_order ASC, id DESC`).all().map((row) => reviewRecordSchema.parse(row));
}
export function getReview(id: number): ReviewRecord | null {
  const row = getDatabase().prepare("SELECT * FROM visit_reviews WHERE id = ?").get(id);
  return row ? reviewRecordSchema.parse(row) : null;
}
export function reviewBySlug(slug: string): ReviewRecord | null {
  const row = getDatabase().prepare(`SELECT visit_reviews.* FROM visit_reviews
    JOIN review_slugs ON visit_reviews.id = review_slugs.review_id
    WHERE review_slugs.slug = ? AND is_active = 1 AND description != '' AND visit_reviews.slug != ''`).get(slug);
  return row ? reviewRecordSchema.parse(row) : null;
}
export function getReviewSelection() {
  const row = getDatabase().prepare<[], { readonly featured_id: number | null; readonly home_ids: string; readonly revision: number }>("SELECT featured_id, home_ids, revision FROM review_selection WHERE id = 1").get();
  if (!row) throw new ApiError(500, "SELECTION_UNAVAILABLE", "후기 노출 설정을 불러오지 못했습니다.");
  return reviewSelectionSchema.parse({ ...row, home_ids: JSON.parse(row.home_ids) });
}
export const publicReviews = cache(() => {
  const db = getDatabase();
  return db.transaction(() => {
    const records = listReviews();
    const selection = getReviewSelection();
    return { records, featured: records.find((item) => item.id === selection.featured_id && item.image) ?? null,
      home: selection.home_ids.flatMap((id) => records.filter((item) => item.id === id)) };
  })();
});
export function saveReview(input: ReviewInput, id?: number, revision?: number): ReviewRecord {
  requireExistingImages([...(input.image ? [input.image] : []), ...markdownImageReferences(input.description), ...markdownImageReferences(input.descriptionEn)]);
  const db = getDatabase();
  return db.transaction(() => {
    if (id !== undefined) reserveRevision("visit_reviews", id, revision);
    const owner = input.slug ? db.prepare<[string], { readonly review_id: number }>("SELECT review_id FROM review_slugs WHERE slug = ?").get(input.slug) : undefined;
    if (owner && owner.review_id !== id) throw new ApiError(409, "SLUG_CONFLICT", "이미 사용 중인 URL 슬러그입니다.");
    let savedId = id;
    if (savedId === undefined) {
      savedId = Number(db.prepare(`INSERT INTO visit_reviews
        (kind,url,author,date,title,titleEn,summary,summaryEn,slug,description,descriptionEn,feature_title,feature_titleEn,image,sort_order,is_active)
        VALUES (@kind,@url,@author,@date,@title,@titleEn,@summary,@summaryEn,@slug,@description,@descriptionEn,@feature_title,@feature_titleEn,@image,@sort_order,@is_active)`).run(input).lastInsertRowid);
    } else {
      db.prepare(`UPDATE visit_reviews SET kind=@kind,url=@url,author=@author,date=@date,title=@title,titleEn=@titleEn,
        summary=@summary,summaryEn=@summaryEn,slug=@slug,description=@description,descriptionEn=@descriptionEn,feature_title=@feature_title,feature_titleEn=@feature_titleEn,
        image=@image,sort_order=@sort_order,is_active=@is_active,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...input, id: savedId });
    }
    if (input.slug) db.prepare("INSERT OR IGNORE INTO review_slugs (slug,review_id) VALUES (?,?)").run(input.slug, savedId);
    const saved = getReview(savedId);
    if (!saved) throw new ApiError(500, "SAVE_FAILED", "후기를 저장하지 못했습니다.");
    return saved;
  }).immediate();
}
export function deleteReview(id: number, revision: number): void {
  const db = getDatabase();
  db.transaction(() => { reserveRevision("visit_reviews", id, revision); db.prepare("DELETE FROM visit_reviews WHERE id = ?").run(id); }).immediate();
}
export function saveReviewSelection(input: ReviewSelectionInput, revision: number) {
  const db = getDatabase();
  return db.transaction(() => {
    reserveRevision("review_selection", 1, revision);
    const selected = new Set([...input.home_ids, ...(input.featured_id === null ? [] : [input.featured_id])]);
    for (const id of selected) {
      const review = getReview(id);
      if (!review || !review.is_active) throw new ApiError(400, "REVIEW_UNAVAILABLE", "공개된 후기를 선택해 주세요. 삭제되거나 비공개된 항목이 포함되어 있습니다.");
      if (id === input.featured_id && !review.image) throw new ApiError(400, "COVER_REQUIRED", "대표 후기는 썸네일이 필요합니다.");
    }
    db.prepare("UPDATE review_selection SET featured_id=?, home_ids=? WHERE id=1").run(input.featured_id, JSON.stringify(input.home_ids));
    return getReviewSelection();
  }).immediate();
}
