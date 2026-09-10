import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/server/events/errors";

export type ItemContext = { readonly params: Promise<{ readonly id: string }> };
export type ImageContext = { readonly params: Promise<{ readonly path: string[] }> };

export function dataResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: { "cache-control": "no-store" } });
}

export async function route(action: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "입력값을 확인해주세요." } },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." } },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

async function boundedBody(request: Request, maximumBytes: number): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new ApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.");
  }
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new ApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.");
    }
    chunks.push(result.value);
  }
  return Buffer.concat(chunks);
}

export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON 요청만 허용됩니다.");
  }
  const body = await boundedBody(request, 256 * 1024);
  let value: unknown;
  try {
    value = JSON.parse(body.toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new ApiError(400, "INVALID_JSON", "JSON 형식이 올바르지 않습니다.");
    throw error;
  }
  return schema.parse(value);
}

export async function multipartFiles(request: Request): Promise<File[]> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "multipart/form-data 요청만 허용됩니다.");
  }
  const body = await boundedBody(request, 31 * 1024 * 1024);
  let form: FormData;
  try {
    form = await new Response(Uint8Array.from(body), { headers: { "content-type": contentType } }).formData();
  } catch (error) {
    if (error instanceof TypeError) throw new ApiError(400, "INVALID_MULTIPART", "업로드 요청이 올바르지 않습니다.");
    throw error;
  }
  return [...form.values()].filter((value): value is File => typeof value !== "string");
}

export async function itemId(context: ItemContext): Promise<number> {
  const { id } = await context.params;
  return z.coerce.number().int().positive().parse(id);
}
