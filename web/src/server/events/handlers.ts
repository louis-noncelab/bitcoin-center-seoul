import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eventInputSchema, highlightInputSchema, imagePathSchema } from "@/lib/events-contract";
import {
  clearSessionCookie,
  currentSessionExpiry,
  isAuthenticated,
  login,
  loginClientKey,
  logout,
  requireAdmin,
  requireSameOrigin,
  setSessionCookie,
} from "@/server/events/auth";
import { expectedRevision } from "@/server/events/revision";
import { ApiError } from "@/server/events/errors";
import { referencedImagePaths } from "@/server/events/content-images";
import { isPublishedProductImage } from "@/server/catalog/images";
import { dataResponse, itemId, jsonBody, multipartFiles, route, type ImageContext, type ItemContext } from "@/server/events/http";
import { requireExistingImages, resolveImageFile, storeUploadedImages } from "@/server/events/images";
import {
  createEvent,
  createHighlight,
  deleteEvent,
  deleteHighlight,
  getEvent,
  getHighlight,
  listEvents,
  listHighlights,
  updateEvent,
  setEventRegistration,
  updateHighlight,
} from "@/server/events";
import { retireEventTicket, syncEventTicket } from "@/server/events/tickets";

const loginSchema = z.object({ password: z.string().min(1).max(1024) }).strict();

function withoutJoinLink<T extends { onlineUrl: string; onlineInstructions: string; onlineInstructionsEn: string }>(event: T) {
  const hidden = new Set(["onlineUrl", "onlineInstructions", "onlineInstructionsEn"]);
  return Object.fromEntries(Object.entries(event).filter(([key]) => !hidden.has(key))) as Omit<T, "onlineUrl" | "onlineInstructions" | "onlineInstructionsEn">;
}

export async function publicEvents(): Promise<Response> {
  return route(async () => dataResponse((await listEvents()).map(withoutJoinLink)));
}

export async function publicEvent(_request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    const event = await getEvent(await itemId(context));
    if (!event) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
    return dataResponse(withoutJoinLink(event));
  });
}

export async function publicHighlights(): Promise<Response> {
  return route(async () => dataResponse(await listHighlights()));
}

export async function publicHighlight(_request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    const highlight = await getHighlight(await itemId(context));
    if (!highlight) throw new ApiError(404, "NOT_FOUND", "하이라이트를 찾을 수 없습니다.");
    return dataResponse(highlight);
  });
}

export async function adminEventsGet(request: NextRequest): Promise<Response> {
  return route(async () => {
    await requireAdmin(request);
    return dataResponse(await listEvents());
  });
}

export async function adminEventsPost(request: NextRequest): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    const event = await createEvent(await jsonBody(request, eventInputSchema));
    await syncEventTicket(event, 0);
    return dataResponse(event, 201);
  });
}

export async function adminEventGet(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    await requireAdmin(request);
    const event = await getEvent(await itemId(context));
    if (!event) throw new ApiError(404, "NOT_FOUND", "행사를 찾을 수 없습니다.");
    return dataResponse(event);
  });
}

export async function adminEventPut(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    const id = await itemId(context);
    const previous = await getEvent(id);
    const event = await updateEvent(id, await jsonBody(request, eventInputSchema), expectedRevision(request));
    await syncEventTicket(event, previous?.ticketCapacity ?? event.ticketCapacity);
    return dataResponse(event);
  });
}

const registrationSchema = z.object({ registrationClosed: z.boolean() }).strict();

export async function adminEventPatch(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    const { registrationClosed } = await jsonBody(request, registrationSchema);
    const id = await itemId(context);
    const event = await setEventRegistration(id, registrationClosed, expectedRevision(request));
    await syncEventTicket(event);
    return dataResponse(event);
  });
}

export async function adminEventDelete(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    const id = await itemId(context);
    await deleteEvent(id, expectedRevision(request));
    await retireEventTicket(id);
    return dataResponse({ deleted: true });
  });
}

export async function adminHighlightsGet(request: NextRequest): Promise<Response> {
  return route(async () => {
    await requireAdmin(request);
    return dataResponse(await listHighlights({ includeInactive: true }));
  });
}

export async function adminHighlightsPost(request: NextRequest): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    return dataResponse(await createHighlight(await jsonBody(request, highlightInputSchema)), 201);
  });
}

export async function adminHighlightGet(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    await requireAdmin(request);
    const highlight = await getHighlight(await itemId(context), { includeInactive: true });
    if (!highlight) throw new ApiError(404, "NOT_FOUND", "하이라이트를 찾을 수 없습니다.");
    return dataResponse(highlight);
  });
}

export async function adminHighlightPut(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    return dataResponse(await updateHighlight(await itemId(context), await jsonBody(request, highlightInputSchema), expectedRevision(request)));
  });
}

export async function adminHighlightDelete(request: NextRequest, context: ItemContext): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    await deleteHighlight(await itemId(context), expectedRevision(request));
    return dataResponse({ deleted: true });
  });
}

export async function adminLogin(request: NextRequest): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    const { password } = await jsonBody(request, loginSchema);
    const response = dataResponse({ authenticated: true });
    setSessionCookie(response, await login(password, loginClientKey(request)));
    return response;
  });
}

export async function adminLogout(request: NextRequest): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await logout(request);
    const response = dataResponse({ authenticated: false });
    clearSessionCookie(response);
    return response;
  });
}

export async function adminSession(request: NextRequest): Promise<Response> {
  return route(async () => dataResponse({ authenticated: await isAuthenticated(request) }));
}

export async function adminSessions(request: NextRequest): Promise<Response> {
  return route(async () => {
    await requireAdmin(request);
    const expiresAt = await currentSessionExpiry(request);
    return dataResponse({ sessions: expiresAt == null ? [] : [{ current: true, expiresAt }] });
  });
}

export async function adminImages(request: NextRequest): Promise<Response> {
  return route(async () => {
    requireSameOrigin(request);
    await requireAdmin(request);
    return dataResponse({ images: await storeUploadedImages(await multipartFiles(request)) });
  });
}

export async function publicImage(request: NextRequest, context: ImageContext): Promise<Response> {
  return route(async () => {
    const { path: segments } = await context.params;
    const publicPath = imagePathSchema.parse(`/images/${segments.join("/")}`);
    // ponytail: scan current references for immediate revocation; index them if the collection grows substantially.
    if (!await isAuthenticated(request) && !(await referencedImagePaths(true)).includes(publicPath)
      && !await isPublishedProductImage(publicPath)) {
      throw new ApiError(404, "NOT_FOUND", "이미지를 찾을 수 없습니다.");
    }
    requireExistingImages([publicPath]);
    const file = resolveImageFile(publicPath);
    const size = fs.statSync(file).size;
    if (size > 30 * 1024 * 1024) throw new ApiError(413, "IMAGE_TOO_LARGE", "이미지 파일이 너무 큽니다.");
    const extension = path.extname(file).toLowerCase();
    const contentTypes: Readonly<Record<string, string>> = {
      ".avif": "image/avif", ".gif": "image/gif", ".jpeg": "image/jpeg", ".jpg": "image/jpeg",
      ".png": "image/png", ".webp": "image/webp",
    };
    const contentType = contentTypes[extension];
    if (!contentType) throw new ApiError(404, "NOT_FOUND", "이미지를 찾을 수 없습니다.");
    return new NextResponse(await fs.promises.readFile(file), {
      headers: {
        "cache-control": "private, no-store",
        "content-type": contentType,
        "x-content-type-options": "nosniff",
      },
    });
  });
}
