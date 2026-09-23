import "server-only";
import { cache } from "react";
import { reviewRecordSchema, reviewSelectionSchema, type ReviewInput, type ReviewRecord, type ReviewSelectionInput } from "@/lib/reviews-contract";
import { prisma } from "@/server/db";
import { ApiError } from "@/server/events/errors";
import { markdownImageReferences } from "@/server/events/image-references";
import { collectImagePaths, deleteUnusedImages, placeImagesInSlugFolder, requireExistingImages, rewriteImagePaths } from "@/server/events/images";
import { reserveRevision } from "@/server/events/revision";

function storedTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function fromReview(row: {
  id: number; revision: number; kind: string; url: string; author: string; date: string; title: string; titleEn: string;
  summary: string; summaryEn: string; slug: string; description: string; descriptionEn: string; featureTitle: string;
  featureTitleEn: string; image: string; sortOrder: number; isActive: number; createdAt: Date; updatedAt: Date;
}): ReviewRecord {
  return reviewRecordSchema.parse({
    id: row.id, revision: row.revision, kind: row.kind, url: row.url, author: row.author, date: row.date,
    title: row.title, titleEn: row.titleEn, summary: row.summary, summaryEn: row.summaryEn, slug: row.slug,
    description: row.description, descriptionEn: row.descriptionEn, feature_title: row.featureTitle,
    feature_titleEn: row.featureTitleEn, image: row.image, sort_order: row.sortOrder,
    is_active: row.isActive === 1 ? 1 : 0, created_at: storedTime(row.createdAt), updated_at: storedTime(row.updatedAt),
  });
}

export async function listReviews(includeInactive = false): Promise<ReviewRecord[]> {
  const rows = await prisma.visitReview.findMany({ where: includeInactive ? {} : { isActive: 1 }, orderBy: [{ sortOrder: "asc" }, { id: "desc" }] });
  return rows.map(fromReview);
}

export async function getReview(id: number): Promise<ReviewRecord | null> {
  const row = await prisma.visitReview.findUnique({ where: { id } });
  return row ? fromReview(row) : null;
}

export async function reviewBySlug(slug: string): Promise<ReviewRecord | null> {
  const alias = await prisma.reviewSlug.findUnique({ where: { slug } });
  if (!alias) return null;
  const row = await prisma.visitReview.findFirst({ where: { id: alias.reviewId, isActive: 1, NOT: { description: "" }, slug: { not: "" } } });
  return row ? fromReview(row) : null;
}

export async function getReviewSelection() {
  const row = await prisma.reviewSelection.findUnique({ where: { id: 1 } });
  if (!row) throw new ApiError(500, "SELECTION_UNAVAILABLE", "후기 노출 설정을 불러오지 못했습니다.");
  return reviewSelectionSchema.parse({ featured_id: row.featuredId, home_ids: JSON.parse(row.homeIds), revision: row.revision });
}

export const publicReviews = cache(async () => {
  const records = await listReviews();
  const selection = await getReviewSelection();
  return {
    records,
    featured: records.find((item) => item.id === selection.featured_id && item.image) ?? null,
    home: selection.home_ids.flatMap((id) => records.filter((item) => item.id === id)),
  };
});

export async function saveReview(input: ReviewInput, id?: number, revision?: number): Promise<ReviewRecord> {
  const previous = id === undefined ? null : await getReview(id);
  const sources = [...new Set([...(input.image ? [input.image] : []), ...markdownImageReferences(input.description), ...markdownImageReferences(input.descriptionEn)])];
  requireExistingImages(sources);
  const placed = await placeImagesInSlugFolder("reviews", input.slug, sources);
  const image = input.image ? placed.images[sources.indexOf(input.image)] ?? "" : "";
  const description = rewriteImagePaths(input.description, sources, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, sources, placed.images);
  try {
  const savedId = await prisma.$transaction(async (tx) => {
    if (id !== undefined) await reserveRevision(tx, "visit_reviews", id, revision);
    if (input.slug) {
      const owner = await tx.reviewSlug.findUnique({ where: { slug: input.slug } });
      if (owner && owner.reviewId !== id) throw new ApiError(409, "SLUG_CONFLICT", "이미 사용 중인 URL 슬러그입니다.");
    }
    const data = {
      kind: input.kind, url: input.url, author: input.author, date: input.date, title: input.title, titleEn: input.titleEn,
      summary: input.summary, summaryEn: input.summaryEn, slug: input.slug, description, descriptionEn,
      featureTitle: input.feature_title, featureTitleEn: input.feature_titleEn, image, sortOrder: input.sort_order, isActive: input.is_active,
    };
    const reviewId = id === undefined ? (await tx.visitReview.create({ data })).id : (await tx.visitReview.update({ where: { id }, data })).id;
    if (input.slug) await tx.reviewSlug.upsert({ where: { slug: input.slug }, create: { slug: input.slug, reviewId }, update: {} });
    return reviewId;
  });
  const saved = await getReview(savedId);
  if (!saved) throw new ApiError(500, "SAVE_FAILED", "후기를 저장하지 못했습니다.");
  const kept = new Set(collectImagePaths(image, description, descriptionEn));
  await deleteUnusedImages(collectImagePaths(previous?.image, previous?.description, previous?.descriptionEn).filter((item) => !kept.has(item)));
  return saved;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function deleteReview(id: number, revision: number): Promise<void> {
  const previous = await getReview(id);
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "visit_reviews", id, revision);
    await tx.visitReview.delete({ where: { id } });
  });
  await deleteUnusedImages(collectImagePaths(previous?.image, previous?.description, previous?.descriptionEn));
}

export async function saveReviewSelection(input: ReviewSelectionInput, revision: number) {
  return prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "review_selection", 1, revision);
    const selected = new Set([...input.home_ids, ...(input.featured_id === null ? [] : [input.featured_id])]);
    for (const id of selected) {
      const review = await tx.visitReview.findUnique({ where: { id } });
      if (!review || review.isActive !== 1) throw new ApiError(400, "REVIEW_UNAVAILABLE", "공개된 후기를 선택해 주세요. 삭제되거나 비공개된 항목이 포함되어 있습니다.");
      if (id === input.featured_id && !review.image) throw new ApiError(400, "COVER_REQUIRED", "대표 후기는 썸네일이 필요합니다.");
    }
    const saved = await tx.reviewSelection.update({ where: { id: 1 }, data: { featuredId: input.featured_id, homeIds: JSON.stringify(input.home_ids) } });
    return reviewSelectionSchema.parse({ featured_id: saved.featuredId, home_ids: JSON.parse(saved.homeIds), revision: saved.revision });
  });
}
