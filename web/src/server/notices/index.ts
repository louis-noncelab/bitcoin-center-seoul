import "server-only";
import { noticeRecordSchema, type NoticeInput, type NoticeRecord } from "@/lib/notices-contract";
import { prisma } from "@/server/db";
import { ApiError } from "@/server/events/errors";
import { reserveRevision } from "@/server/events/revision";
import { storedTagsSchema } from "@/server/events/tags";

const noticeRowSchema = noticeRecordSchema.extend({ tags: storedTagsSchema });

function storedTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function fromRow(row: {
  id: number; revision: number; slug: string; title: string; titleEn: string; description: string; descriptionEn: string;
  isActive: number; tags: string; createdAt: Date; updatedAt: Date;
}): NoticeRecord {
  return noticeRowSchema.parse({
    id: row.id, revision: row.revision, slug: row.slug, title: row.title, titleEn: row.titleEn,
    description: row.description, descriptionEn: row.descriptionEn, is_active: row.isActive === 1 ? 1 : 0, tags: row.tags,
    created_at: storedTime(row.createdAt), updated_at: storedTime(row.updatedAt),
  });
}

export async function listNotices(includeInactive = false): Promise<NoticeRecord[]> {
  const rows = await prisma.notice.findMany({ where: includeInactive ? {} : { isActive: 1 }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return rows.map(fromRow);
}

export async function getNotice(id: number, includeInactive = false): Promise<NoticeRecord | null> {
  const row = await prisma.notice.findFirst({ where: { id, ...(includeInactive ? {} : { isActive: 1 }) } });
  return row ? fromRow(row) : null;
}

export async function noticeBySlug(slug: string): Promise<NoticeRecord | null> {
  const alias = await prisma.noticeSlug.findUnique({ where: { slug } });
  if (!alias) return null;
  return getNotice(alias.noticeId);
}

export async function saveNotice(input: NoticeInput, id?: number, revision?: number): Promise<NoticeRecord> {
  const savedId = await prisma.$transaction(async (tx) => {
    if (id !== undefined) {
      await reserveRevision(tx, "notices", id, revision);
      if (!await tx.notice.findUnique({ where: { id } })) throw new ApiError(404, "NOT_FOUND", "공지를 찾을 수 없습니다.");
    }
    const owner = await tx.noticeSlug.findUnique({ where: { slug: input.slug } });
    if (owner && owner.noticeId !== id) throw new ApiError(409, "SLUG_CONFLICT", "이미 사용 중인 URL 슬러그입니다.");
    const data = { slug: input.slug, title: input.title, titleEn: input.titleEn, description: input.description, descriptionEn: input.descriptionEn, isActive: input.is_active, tags: JSON.stringify(input.tags) };
    const noticeId = id === undefined ? (await tx.notice.create({ data })).id : (await tx.notice.update({ where: { id }, data })).id;
    await tx.noticeSlug.upsert({ where: { slug: input.slug }, create: { slug: input.slug, noticeId }, update: { noticeId } });
    return noticeId;
  });
  const saved = await getNotice(savedId, true);
  if (!saved) throw new ApiError(500, "SAVE_FAILED", "공지를 저장하지 못했습니다.");
  return saved;
}

export async function deleteNotice(id: number, revision: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "notices", id, revision);
    await tx.notice.delete({ where: { id } });
    await tx.noticeSlug.deleteMany({ where: { noticeId: id } });
  });
}
