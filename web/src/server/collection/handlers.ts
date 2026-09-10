import "server-only";
import type { NextRequest } from "next/server";
import { collectionInputSchema } from "@/lib/collection-contract";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { ApiError } from "@/server/events/errors";
import { dataResponse, itemId, jsonBody, route, type ItemContext } from "@/server/events/http";
import { deleteCollectionItem, getCollectionItem, listCollection, saveCollectionItem } from "@/server/collection";

export async function publicCollection() { return route(() => dataResponse(listCollection())); }
export async function publicCollectionItem(_request: NextRequest, context: ItemContext) {
  return route(async () => {
    const item = getCollectionItem(await itemId(context));
    if (!item) throw new ApiError(404, "NOT_FOUND", "도서·작품을 찾을 수 없습니다.");
    return dataResponse(item);
  });
}
export async function adminCollectionGet(request: NextRequest) {
  return route(() => { requireAdmin(request); return dataResponse(listCollection(true)); });
}
export async function adminCollectionPost(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    return dataResponse(saveCollectionItem(await jsonBody(request, collectionInputSchema)), 201);
  });
}
export async function adminCollectionPut(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    return dataResponse(saveCollectionItem(await jsonBody(request, collectionInputSchema), await itemId(context), expectedRevision(request)));
  });
}
export async function adminCollectionDelete(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    deleteCollectionItem(await itemId(context), expectedRevision(request)); return dataResponse({ deleted: true });
  });
}
