import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Metadata } from "sharp";
import { imagePathSchema } from "@/lib/events-contract";
import { configuredUploadsPath } from "@/server/events/config";
import { ApiError } from "@/server/events/errors";
import { markdownImageReferences } from "@/server/events/image-references";

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

export type ImageFolder = "events" | "highlights" | "collection" | "reviews" | "products";

export function rewriteImagePaths(value: string, sources: readonly string[], targets: readonly string[]): string {
  return sources.reduce((text, source, index) => {
    const target = targets[index];
    return source && target && source !== target ? text.split(source).join(target) : text;
  }, value);
}

async function undoMoves(moved: readonly { readonly from: string; readonly to: string }[]): Promise<void> {
  for (const step of [...moved].reverse()) {
    await fs.promises.mkdir(path.dirname(step.from), { recursive: true });
    await fs.promises.rename(step.to, step.from).catch(() => undefined);
  }
}

export async function placeImagesInSlugFolder(folder: ImageFolder, slug: string, images: readonly string[]): Promise<{ readonly images: readonly string[]; restore: () => Promise<void> }> {
  if (slug === "") return { images, restore: async () => {} };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/[a-z]/.test(slug)) {
    throw new ApiError(400, "INVALID_IMAGE_PATH", "이미지 경로가 올바르지 않습니다.");
  }
  const root = imageRoot();
  const moved: { from: string; to: string }[] = [];
  const placed: string[] = [];
  const seen = new Map<string, string>();
  try {
    for (const image of images) {
      const previous = seen.get(image);
      if (previous) {
        placed.push(previous);
        continue;
      }
      const parsed = imagePathSchema.safeParse(image);
      if (!parsed.success || parsed.data === "") {
        placed.push(image);
        seen.set(image, image);
        continue;
      }
      let source: string;
      try {
        source = fs.realpathSync(resolveImageFile(parsed.data));
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          placed.push(image);
          seen.set(image, image);
          continue;
        }
        throw error;
      }
      if (!source.startsWith(`${root}${path.sep}`) || !fs.statSync(source).isFile()) {
        throw new ApiError(400, "INVALID_IMAGE_PATH", "이미지 경로가 올바르지 않습니다.");
      }
      const filename = path.basename(source);
      if (!/^[A-Za-z0-9_-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(filename)) {
        throw new ApiError(400, "INVALID_IMAGE_PATH", "이미지 경로가 올바르지 않습니다.");
      }
      const directory = path.join(root, "uploads", folder, slug);
      fs.mkdirSync(directory, { recursive: true });
      const target = path.join(directory, filename);
      const publicPath = `/images/uploads/${folder}/${slug}/${filename}`;
      if (source !== target) {
        await fs.promises.rename(source, target);
        moved.push({ from: source, to: target });
        await fs.promises.rmdir(path.dirname(source)).catch(() => undefined);
      }
      placed.push(publicPath);
      seen.set(image, publicPath);
    }
  } catch (error) {
    await undoMoves(moved);
    throw error;
  }
  return { images: placed, restore: () => undoMoves(moved) };
}

export function collectImagePaths(...values: readonly (string | readonly string[] | null | undefined)[]): string[] {
  const paths = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string") {
      if (value.startsWith("/images/")) paths.add(value);
      for (const image of markdownImageReferences(value)) paths.add(image);
    } else {
      for (const image of value) if (image.startsWith("/images/")) paths.add(image);
    }
  }
  return [...paths];
}

export async function deleteUnusedImages(candidates: readonly string[], used?: ReadonlySet<string>): Promise<void> {
  const unique = [...new Set(candidates.filter((image) => image.startsWith("/images/")))];
  if (unique.length === 0) return;
  let referenced: ReadonlySet<string>;
  if (used) referenced = used;
  else {
    try {
      referenced = new Set(await (await import("@/server/events/content-images")).referencedImagePaths(false));
    } catch {
      return;
    }
  }
  const root = imageRoot();
  const uploads = path.join(root, "uploads");
  for (const image of unique) {
    if (referenced.has(image)) continue;
    const parsed = imagePathSchema.safeParse(image);
    if (!parsed.success || parsed.data === "") continue;
    let file: string;
    try {
      file = fs.realpathSync(resolveImageFile(parsed.data));
    } catch {
      continue;
    }
    if (!file.startsWith(`${root}${path.sep}`)) continue;
    await fs.promises.unlink(file).catch(() => undefined);
    let directory = path.dirname(file);
    while (directory.startsWith(`${uploads}${path.sep}`)) {
      try {
        await fs.promises.rmdir(directory);
      } catch {
        break;
      }
      directory = path.dirname(directory);
    }
  }
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
