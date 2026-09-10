import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { imagePathSchema } from "@/lib/events-contract";
import { adminRequest, errorText } from "./request";

const mimeTypes: readonly string[] = ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"];
export const imageUploadAccept = mimeTypes.join(",");

export class ImageSelectionError extends Error {
  constructor(readonly kind: "limits" | "type") { super(`IMAGE_SELECTION_${kind}`); }
}

export async function uploadImages(files: readonly File[], signal?: AbortSignal): Promise<string[]> {
  if (!files.length || files.length > 12 || files.some((file) => file.size > 10 * 1024 ** 2) || files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 ** 2) {
    throw new ImageSelectionError("limits");
  }
  if (files.some((file) => !mimeTypes.includes(file.type))) throw new ImageSelectionError("type");
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const schema = z.object({ images: z.array(imagePathSchema.min(1)).length(files.length) });
  const result = await adminRequest("/api/admin/images", schema, { method: "POST", body, ...(signal ? { signal } : {}) });
  return result.images;
}

export function imageUploadErrorText(error: unknown, locale: Locale) {
  const messages = {
    limits: { ko: "한 번에 사진 12장, 각 10MB, 총 30MB까지 첨부할 수 있습니다.", en: "Attach up to 12 images, 10MB each and 30MB in total." },
    type: { ko: "JPG, PNG, WebP, GIF, AVIF 사진을 선택해 주세요.", en: "Choose JPG, PNG, WebP, GIF or AVIF images." },
  } as const;
  return error instanceof ImageSelectionError ? messages[error.kind][locale] : errorText(error, locale);
}
