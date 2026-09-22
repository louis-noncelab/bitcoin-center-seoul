import "server-only";
import { contentImagesSchema, imagePathSchema } from "@/lib/events-contract";
import { prisma } from "@/server/db";
import { markdownImageReferences } from "@/server/events/image-references";

export async function referencedImagePaths(publicOnly = false): Promise<readonly string[]> {
  const paths = new Set<string>();
  const events = await prisma.centerEvent.findMany({ select: { id: true, image: true, description: true, descriptionEn: true } });
  const highlights = await prisma.centerHighlight.findMany({
    where: publicOnly ? { isActive: 1 } : {},
    select: { id: true, image: true, description: true, descriptionEn: true },
  });
  const notices = await prisma.notice.findMany({ where: publicOnly ? { isActive: 1 } : {}, select: { description: true, descriptionEn: true } });
  const collection = await prisma.collectionItem.findMany({ where: publicOnly ? { isActive: 1 } : {}, select: { images: true, description: true, descriptionEn: true } });
  const reviews = await prisma.visitReview.findMany({ where: publicOnly ? { isActive: 1 } : {}, select: { image: true, description: true, descriptionEn: true } });
  const products = await prisma.product.findMany({ select: { imageUrl: true, images: true, descriptionKo: true, descriptionEn: true, contentFormat: true, published: true } });
  for (const row of [...events, ...highlights, ...reviews]) if (row.image) paths.add(row.image);
  for (const product of products) {
    if (publicOnly && !product.published) continue;
    if (product.imageUrl) paths.add(product.imageUrl);
    for (const image of product.images ?? []) paths.add(image);
    if (product.contentFormat === "MARKDOWN") {
      for (const source of [product.descriptionKo, product.descriptionEn]) {
        for (const image of markdownImageReferences(source)) paths.add(image);
      }
    }
  }
  for (const row of collection) {
    for (const image of contentImagesSchema.parse(JSON.parse(row.images))) paths.add(image);
  }
  for (const row of [...events, ...highlights, ...notices, ...collection, ...reviews]) {
    for (const source of [row.description, row.descriptionEn]) {
      if (source) for (const image of markdownImageReferences(source)) paths.add(image);
    }
  }
  const eventIds = new Set(events.map((row) => row.id));
  const highlightIds = new Set(highlights.map((row) => row.id));
  const images = await prisma.contentImage.findMany();
  for (const image of images) {
    if (!publicOnly || (image.kind === "event" && eventIds.has(image.contentId)) || (image.kind === "highlight" && highlightIds.has(image.contentId))) {
      if (imagePathSchema.safeParse(image.path).success) paths.add(image.path);
    }
  }
  return [...paths].sort();
}
