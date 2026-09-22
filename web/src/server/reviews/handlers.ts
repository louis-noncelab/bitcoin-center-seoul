import "server-only";
import type { NextRequest } from "next/server";
import { reviewInputSchema, reviewSelectionInputSchema } from "@/lib/reviews-contract";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { dataResponse, itemId, jsonBody, route, type ItemContext } from "@/server/events/http";
import { deleteReview, getReviewSelection, listReviews, saveReview, saveReviewSelection } from "./index";

export async function adminReviewsGet(request: NextRequest) {
  return route(async () => { await requireAdmin(request); return dataResponse({ records: await listReviews(true), selection: await getReviewSelection() }); });
}
export async function adminReviewsPost(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveReview(await jsonBody(request, reviewInputSchema)), 201);
  });
}
export async function adminReviewsPut(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveReview(await jsonBody(request, reviewInputSchema), await itemId(context), expectedRevision(request)));
  });
}
export async function adminReviewsDelete(request: NextRequest, context: ItemContext) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    await deleteReview(await itemId(context), expectedRevision(request));
    return dataResponse({ deleted: true });
  });
}
export async function adminReviewSelectionPut(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    return dataResponse(await saveReviewSelection(await jsonBody(request, reviewSelectionInputSchema), expectedRevision(request)));
  });
}
