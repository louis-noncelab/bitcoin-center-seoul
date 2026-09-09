import "server-only";
import { getDatabase } from "@/server/events/db";
import { ApiError } from "@/server/events/errors";
import { noticeRecordSchema, type NoticeInput, type NoticeRecord } from "@/lib/notices-contract";

export function listNotices(includeInactive = false): NoticeRecord[] {
  return getDatabase().prepare(`SELECT * FROM notices ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY created_at DESC, id DESC`).all().map((row) => noticeRecordSchema.parse(row));
}
export function getNotice(id: number, includeInactive = false): NoticeRecord | null {
  const row = getDatabase().prepare(`SELECT * FROM notices WHERE id = ? ${includeInactive ? "" : "AND is_active = 1"}`).get(id);
  return row ? noticeRecordSchema.parse(row) : null;
}
export function noticeBySlug(slug: string): NoticeRecord | null {
  const row = getDatabase().prepare("SELECT notices.* FROM notices JOIN notice_slugs ON notices.id = notice_slugs.notice_id WHERE notice_slugs.slug = ? AND is_active = 1").get(slug);
  return row ? noticeRecordSchema.parse(row) : null;
}
export function saveNotice(input: NoticeInput, id?: number): NoticeRecord {
  const db = getDatabase();
  return db.transaction(() => {
    if (id !== undefined && !getNotice(id, true)) throw new ApiError(404, "NOT_FOUND", "공지를 찾을 수 없습니다.");
    const owner = db.prepare<[string], { readonly notice_id: number }>("SELECT notice_id FROM notice_slugs WHERE slug = ?").get(input.slug);
    if (owner && owner.notice_id !== id) throw new ApiError(409, "SLUG_CONFLICT", "이미 사용 중인 URL 슬러그입니다.");
    const values = [input.slug, input.title, input.titleEn, input.description, input.descriptionEn, input.is_active];
    let noticeId = id;
    if (noticeId === undefined) {
      noticeId = Number(db.prepare("INSERT INTO notices (slug,title,titleEn,description,descriptionEn,is_active) VALUES (?,?,?,?,?,?)").run(...values).lastInsertRowid);
    } else {
      db.prepare("UPDATE notices SET slug=?,title=?,titleEn=?,description=?,descriptionEn=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(...values, noticeId);
    }
    db.prepare("INSERT OR IGNORE INTO notice_slugs (slug,notice_id) VALUES (?,?)").run(input.slug, noticeId);
    const saved = getNotice(noticeId, true);
    if (!saved) throw new ApiError(500, "SAVE_FAILED", "공지를 저장하지 못했습니다.");
    return saved;
  })();
}
export function deleteNotice(id: number): void {
  const db = getDatabase();
  db.transaction(() => {
    if (!db.prepare("DELETE FROM notices WHERE id = ?").run(id).changes) throw new ApiError(404, "NOT_FOUND", "공지를 찾을 수 없습니다.");
    db.prepare("DELETE FROM notice_slugs WHERE notice_id = ?").run(id);
  })();
}
