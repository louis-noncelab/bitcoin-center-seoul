import "server-only";
import { getDatabase } from "@/server/events/db";
import { ApiError } from "@/server/events/errors";

export function expectedRevision(request: Request): number {
  const value = request.headers.get("if-match");
  if (value === null) throw new ApiError(428, "REVISION_REQUIRED", "최신 내용을 불러온 뒤 다시 시도해주세요.");
  if (!/^"[1-9]\d*"$/.test(value)) throw new ApiError(400, "INVALID_REVISION", "수정 버전이 올바르지 않습니다.");
  const revision = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(revision)) throw new ApiError(400, "INVALID_REVISION", "수정 버전이 올바르지 않습니다.");
  return revision;
}

export function reserveRevision(table: "events" | "highlights" | "notices" | "collection_items", id: number, revision: number | undefined): void {
  const db = getDatabase();
  if (!db.inTransaction) throw new ApiError(500, "TRANSACTION_REQUIRED", "저장 트랜잭션이 필요합니다.");
  if (revision === undefined) throw new ApiError(428, "REVISION_REQUIRED", "최신 내용을 불러온 뒤 다시 시도해주세요.");
  const result = db.prepare(`UPDATE ${table} SET revision = revision + 1 WHERE id = ? AND revision = ?`).run(id, revision);
  if (result.changes === 1) return;
  if (!db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
  throw new ApiError(409, "EDIT_CONFLICT", "다른 사람이 먼저 수정했습니다. 최신 내용을 확인해주세요.");
}
