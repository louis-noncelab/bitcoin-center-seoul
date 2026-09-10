import "server-only";
import type { NextRequest } from "next/server";
import { noticeInputSchema } from "@/lib/notices-contract";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { ApiError } from "@/server/events/errors";
import { dataResponse, itemId, jsonBody, route, type ItemContext } from "@/server/events/http";
import { deleteNotice, listNotices, noticeBySlug, saveNotice } from "@/server/notices";

export async function publicNotices() { return route(() => dataResponse(listNotices())); }
export async function publicNotice(_request: NextRequest, context: { readonly params: Promise<{ readonly slug: string }> }) {
  return route(async () => {
    const notice = noticeBySlug((await context.params).slug);
    if (!notice) throw new ApiError(404, "NOT_FOUND", "공지를 찾을 수 없습니다.");
    return dataResponse(notice);
  });
}
export async function adminNoticesGet(request: NextRequest) {
  return route(() => { requireAdmin(request); return dataResponse(listNotices(true)); });
}
export async function adminNoticesPost(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    return dataResponse(saveNotice(await jsonBody(request, noticeInputSchema)), 201);
  });
}
export async function adminNoticePut(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    return dataResponse(saveNotice(await jsonBody(request, noticeInputSchema), await itemId(context), expectedRevision(request)));
  });
}
export async function adminNoticeDelete(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    deleteNotice(await itemId(context), expectedRevision(request)); return dataResponse({ deleted: true });
  });
}
