import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Metadata } from "sharp";
import { imagePathSchema } from "@/lib/events-contract";
import { configuredUploadsPath } from "@/server/events/config";
import { ApiError } from "@/server/events/errors";

const maximumFileBytes = 10 * 1024 * 1024;
const maximumTotalBytes = 30 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const allowedFormats = new Set(["avif", "gif", "heif", "jpeg", "png", "webp"]);

function imageRoot(): string {
  const root = configuredUploadsPath();
  fs.mkdirSync(root, { recursive: true });
  return fs.realpathSync(root);
}

export function resolveImageFile(publicPath: string): string {
  imagePathSchema.parse(publicPath);
  const root = imageRoot();
  const candidate = path.resolve(root, publicPath.slice("/images/".length));
  if (!candidate.startsWith(`${root}${path.sep}`)) {
    throw new ApiError(400, "INVALID_IMAGE_PATH", "이미지 경로가 올바르지 않습니다.");
  }
  return candidate;
}

export function requireExistingImages(images: readonly string[]): void {
  const root = imageRoot();
  for (const image of images) {
    const candidate = resolveImageFile(image);
    let resolved: string;
    try {
      resolved = fs.realpathSync(candidate);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new ApiError(400, "IMAGE_NOT_FOUND", "선택한 이미지 파일을 찾을 수 없습니다.");
      }
      throw error;
    }
    if (!resolved.startsWith(`${root}${path.sep}`) || !fs.statSync(resolved).isFile()) {
      throw new ApiError(400, "INVALID_IMAGE_PATH", "이미지 경로가 올바르지 않습니다.");
    }
  }
}

export async function storeUploadedImages(files: readonly File[]): Promise<string[]> {
  if (files.length === 0) throw new ApiError(400, "NO_IMAGES", "업로드할 이미지가 없습니다.");
  if (files.length > 12) throw new ApiError(413, "TOO_MANY_IMAGES", "이미지는 한 번에 12개까지 업로드할 수 있습니다.");
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > maximumTotalBytes) throw new ApiError(413, "UPLOAD_TOO_LARGE", "전체 이미지 용량은 30MB 이하여야 합니다.");
  for (const file of files) {
    if (file.size > maximumFileBytes) throw new ApiError(413, "IMAGE_TOO_LARGE", "각 이미지는 10MB 이하여야 합니다.");
    if (!allowedMimeTypes.has(file.type)) throw new ApiError(400, "INVALID_IMAGE", "지원하지 않는 이미지 형식입니다.");
  }

  const outputs: Buffer[] = [];
  for (const file of files) {
    const source = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 40_000_000 });
    let metadata: Metadata;
    try {
      metadata = await source.metadata();
    } catch (error) {
      if (error instanceof Error) throw new ApiError(400, "INVALID_IMAGE", "손상되었거나 지원하지 않는 이미지입니다.");
      throw error;
    }
    if (!metadata.format || !metadata.width || !metadata.height || !allowedFormats.has(metadata.format)) {
      throw new ApiError(400, "INVALID_IMAGE", "손상되었거나 지원하지 않는 이미지입니다.");
    }
    try {
      outputs.push(await source
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer());
    } catch (error) {
      if (error instanceof Error) throw new ApiError(400, "INVALID_IMAGE", "이미지를 처리할 수 없습니다.");
      throw error;
    }
  }

  const month = new Date().toISOString().slice(0, 7);
  const directory = path.join(imageRoot(), "uploads", month);
  fs.mkdirSync(directory, { recursive: true });
  const paths: string[] = [];
  for (const output of outputs) {
    const name = `${randomUUID()}.webp`;
    await fs.promises.writeFile(path.join(directory, name), output, { flag: "wx" });
    paths.push(`/images/uploads/${month}/${name}`);
  }
  return paths;
}
