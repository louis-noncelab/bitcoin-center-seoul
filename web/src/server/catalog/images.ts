import "server-only";
import { prisma } from "@/server/db";
import { markdownImageReferences } from "@/server/events/image-references";

export async function isPublishedProductImage(publicPath: string): Promise<boolean> {
  // Content-only installations have no commerce database configured.
  if (!process.env.DATABASE_URL) return false;
  const products = await prisma.product.findMany({
    where: { published: true },
    select: { imageUrl: true, images: true, descriptionKo: true, descriptionEn: true, contentFormat: true },
  });
  return products.some((product) => product.imageUrl === publicPath || product.images?.includes(publicPath) || (
    product.contentFormat === "MARKDOWN" && [product.descriptionKo, product.descriptionEn]
      .some((source) => markdownImageReferences(source).includes(publicPath))
  ));
}
