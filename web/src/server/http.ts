import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { getServerConfig } from "./config";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

function response(value: unknown, status: number): Response {
  return new Response(stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...(status === 503 ? { "Retry-After": "3600" } : {}),
    },
  });
}

export function json(data: unknown, status = 200): Response {
  return response({ data }, status);
}

export async function handleApi(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError) {
      return response({ error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      } }, error.status);
    }
    if (error instanceof z.ZodError) {
      return response({ error: {
        code: "INVALID_INPUT",
        message: "입력 내용을 확인해 주세요. / Check the entered information.",
        fields: Object.fromEntries(error.issues.map((issue) => [
          issue.path.join("."), issue.message,
        ])),
      } }, 400);
    }
    // Error text can include credentials, submitted values or provider URLs.
    console.error("[api] Unexpected server error", error instanceof Error ? error.name : "UnknownError");
    return response({ error: {
      code: "INTERNAL_ERROR",
      message: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요. / Please try again shortly.",
    } }, 500);
  }
}

export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== new URL(getServerConfig().appOrigin).origin) {
    throw new HttpError(403, "ORIGIN_REJECTED", "허용되지 않은 요청입니다. / Request origin is not allowed.");
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "ORIGIN_REJECTED", "허용되지 않은 요청입니다. / Cross-site request is not allowed.");
  }
}

export async function readBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  maxBytes = 65_536,
): Promise<z.output<Schema>> {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json" || request.headers.has("content-encoding")) {
    throw new HttpError(415, "UNSUPPORTED_BODY", "JSON 형식으로 요청해 주세요. / Send a JSON request.");
  }
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new HttpError(413, "BODY_TOO_LARGE", "입력 크기를 줄여 주세요. / Request body is too large.");
  }
  if (!request.body) throw new HttpError(400, "EMPTY_BODY", "입력 내용이 없습니다. / Request body is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "BODY_TOO_LARGE", "입력 크기를 줄여 주세요. / Request body is too large.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "입력 형식을 확인해 주세요. / Request JSON is invalid.");
  }
  return schema.parse(input);
}

export function getClientKey(request: Request): string {
  const supplied = getServerConfig().trustProxy ? request.headers.get("x-real-ip") : null;
  const address = supplied && isIP(supplied) ? supplied : "unidentified";
  return createHash("sha256").update(address).digest("hex");
}
