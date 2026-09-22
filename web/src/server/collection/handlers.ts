import "server-only";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { collectionInputSchema } from "@/lib/collection-contract";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { ApiError } from "@/server/events/errors";
import { dataResponse, itemId, jsonBody, route, type ItemContext } from "@/server/events/http";
import { deleteCollectionItem, getCollectionItem, listCollection, saveCollectionItem, setCollectionSoldOut } from "@/server/collection";

export async function publicCollection() { return route(async () => dataResponse(await listCollection())); }
export async function publicCollectionItem(_request: NextRequest, context: ItemContext) {
  return route(async () => {
    const item = await getCollectionItem(await itemId(context));
    if (!item) throw new ApiError(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
    return dataResponse(item);
  });
}
export async function adminCollectionGet(request: NextRequest) {
  return route(async () => { await requireAdmin(request); return dataResponse(await listCollection(true)); });
}
export async function adminCollectionPost(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveCollectionItem(await jsonBody(request, collectionInputSchema)), 201);
  });
}
export async function adminCollectionPut(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveCollectionItem(await jsonBody(request, collectionInputSchema), await itemId(context), expectedRevision(request)));
  });
}
export async function adminCollectionDelete(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    await deleteCollectionItem(await itemId(context), expectedRevision(request)); return dataResponse({ deleted: true });
  });
}

const soldOutSchema = z.object({ soldOut: z.boolean() }).strict();
export async function adminCollectionPatch(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    const { soldOut } = await jsonBody(request, soldOutSchema);
    return dataResponse(await setCollectionSoldOut(await itemId(context), soldOut, expectedRevision(request)));
  });
}
