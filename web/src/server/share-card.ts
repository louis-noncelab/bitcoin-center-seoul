import "server-only";

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { imagePathSchema } from "@/lib/events-contract";
import { resolveImageFile } from "@/server/events/images";
import { shareCardSize } from "@/content/share";

const shade = Buffer.from(
  `<svg width="${shareCardSize.width}" height="${shareCardSize.height}" viewBox="0 0 ${shareCardSize.width} ${shareCardSize.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a120c" stop-opacity="0.78"/><stop offset="0.42" stop-color="#1a120c" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/><rect y="${shareCardSize.height - 6}" width="100%" height="6" fill="#f7931a"/></svg>`,
);

function brandFile(name: string): string {
  return path.join(process.cwd(), "public", "brand", name);
}

export function defaultShareCardPath(): string {
  return brandFile("share-default.jpg");
}

let markPromise: Promise<Buffer> | undefined;

function brandMark(): Promise<Buffer> {
  markPromise ??= sharp(brandFile("bcs-horizontal-reverse.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      for (let index = 0; index < data.length; index += 4) {
        const brightness = Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0);
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = brightness;
      }
      return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize({ height: 54 })
        .png()
        .toBuffer();
    })
    .catch((error: unknown) => {
      markPromise = undefined;
      throw error;
    });
  return markPromise;
}

export async function composeShareCard(source: Buffer): Promise<Buffer> {
  const mark = await brandMark();
  const markMeta = await sharp(mark).metadata();
  const markHeight = markMeta.height ?? 54;
  return sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize(shareCardSize.width, shareCardSize.height, { fit: "cover", position: "attention" })
    .composite([
      { input: shade, top: 0, left: 0 },
      { input: mark, top: shareCardSize.height - 28 - markHeight, left: 40 },
    ])
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();
}

async function contentFile(publicPath: string): Promise<string | null> {
  if (publicPath === "" || !imagePathSchema.safeParse(publicPath).success) return null;
  try {
    const candidate = resolveImageFile(publicPath);
    const resolved = await fs.promises.realpath(candidate);
    const stat = await fs.promises.stat(resolved);
    return stat.isFile() ? resolved : null;
  } catch {
    return null;
  }
}

export async function renderShareCard(publicPath: string): Promise<Buffer> {
  const file = await contentFile(publicPath);
  if (!file) return fs.promises.readFile(defaultShareCardPath());
  return composeShareCard(await fs.promises.readFile(file));
}
