import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/server/events/errors";

export function expectedRevision(request: Request): number {
  const value = request.headers.get("if-match");
  if (value === null) throw new ApiError(428, "REVISION_REQUIRED", "최신 내용을 불러온 뒤 다시 시도해주세요.");
  if (!/^"[1-9]\d*"$/.test(value)) throw new ApiError(400, "INVALID_REVISION", "수정 버전이 올바르지 않습니다.");
  const revision = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(revision)) throw new ApiError(400, "INVALID_REVISION", "수정 버전이 올바르지 않습니다.");
  return revision;
}

type ContentTable = "events" | "highlights" | "notices" | "collection_items" | "visit_reviews" | "review_selection";

export async function reserveRevision(tx: Prisma.TransactionClient, table: ContentTable, id: number, revision: number | undefined): Promise<void> {
  if (revision === undefined) throw new ApiError(428, "REVISION_REQUIRED", "최신 내용을 불러온 뒤 다시 시도해주세요.");
  const where = { id, revision };
  const data = { revision: { increment: 1 } };
  const updated = await (table === "events" ? tx.centerEvent.updateMany({ where, data })
    : table === "highlights" ? tx.centerHighlight.updateMany({ where, data })
    : table === "notices" ? tx.notice.updateMany({ where, data })
    : table === "collection_items" ? tx.collectionItem.updateMany({ where, data })
    : table === "visit_reviews" ? tx.visitReview.updateMany({ where, data })
    : tx.reviewSelection.updateMany({ where, data }));
  if (updated.count === 1) return;
  const current = await (table === "events" ? tx.centerEvent.findUnique({ where: { id } })
    : table === "highlights" ? tx.centerHighlight.findUnique({ where: { id } })
    : table === "notices" ? tx.notice.findUnique({ where: { id } })
    : table === "collection_items" ? tx.collectionItem.findUnique({ where: { id } })
    : table === "visit_reviews" ? tx.visitReview.findUnique({ where: { id } })
    : tx.reviewSelection.findUnique({ where: { id } }));
  if (!current) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
  throw new ApiError(409, "EDIT_CONFLICT", "다른 사람이 먼저 수정했습니다. 최신 내용을 확인해주세요.");
}
