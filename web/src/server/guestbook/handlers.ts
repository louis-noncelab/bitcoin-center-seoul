import "server-only";
import type { NextRequest } from "next/server";
import { guestbookInputSchema } from "@/lib/guestbook-contract";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { dataResponse, itemId, jsonBody, route, type ItemContext } from "@/server/events/http";
import { deleteGuestbook, listGuestbookAdmin, saveGuestbook } from "@/server/guestbook";

export async function adminGuestbookGet(request: NextRequest) {
  return route(async () => { await requireAdmin(request); return dataResponse(await listGuestbookAdmin()); });
}
export async function adminGuestbookPost(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveGuestbook(await jsonBody(request, guestbookInputSchema)), 201);
  });
}
export async function adminGuestbookPut(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveGuestbook(await jsonBody(request, guestbookInputSchema), await itemId(context), expectedRevision(request)));
  });
}
export async function adminGuestbookDelete(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    await deleteGuestbook(await itemId(context), expectedRevision(request));
    return dataResponse({ deleted: true });
  });
}
