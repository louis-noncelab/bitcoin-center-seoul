import "server-only";
import { isEventProduct, requireOrdinaryProduct } from "./event-products";
import { eventAcceptsTickets, ticketEventId } from "@/server/events/ticket-eligibility";
import { prisma } from "@/server/db";
import { collectImagePaths, deleteUnusedImages, placeImagesInSlugFolder, rewriteImagePaths } from "@/server/events/images";
import { markdownImageReferences } from "@/server/events/image-references";
import { HttpError } from "@/server/http";
import { resolveCategoryId } from "./categories";
import type { ProductInput } from "./validation";

const publicInclude = { variants: { where: { active: true } }, category: true } as const;

export async function listProducts() {
  const products = await prisma.product.findMany({ where: { published: true, listed: true }, orderBy: { createdAt: "desc" }, include: publicInclude });
  return products.map(publicProduct);
}

export async function listCheckoutProduct(variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, active: true, product: { published: true } },
    include: { product: { include: publicInclude } },
  });
  const eventId = variant ? ticketEventId(variant.sku) : null;
  if (eventId !== null) {
    const event = await prisma.centerEvent.findUnique({ where: { id: eventId } });
    if (!event || !eventAcceptsTickets(event)) return [];
  }
  return variant ? [publicProduct(variant.product)] : [];
}

export async function getProduct(slug: string) {
  const product = await prisma.product.findFirst({ where: { slug, published: true, listed: true }, include: publicInclude });
  if (!product) throw new HttpError(404, "NOT_FOUND", "상품을 찾을 수 없습니다. / Product not found.");
  return publicProduct(product);
}

export function publicProduct(product: Awaited<ReturnType<typeof prisma.product.findMany<{ include: typeof publicInclude }>>>[number]) {
  const category = product.category?.active
    ? { slug: product.category.slug, nameKo: product.category.nameKo, nameEn: product.category.nameEn }
    : null;
  return {
    id: product.id, slug: product.slug, titleKo: product.titleKo, titleEn: product.titleEn,
    descriptionKo: product.descriptionKo, descriptionEn: product.descriptionEn, contentFormat: product.contentFormat,
    imageUrl: product.imageUrl, images: product.images?.length ? product.images : (product.imageUrl ? [product.imageUrl] : []), createdAt: product.createdAt.toISOString(),
    priceKind: product.priceKind, priceAmount: product.priceAmount.toString(),
    listPriceAmount: product.listPriceAmount?.toString() ?? null,
    allowedFulfillments: product.allowedFulfillments,
    memberOnly: product.memberOnly, updatedAt: product.updatedAt, categoryId: product.categoryId, category,
    // Reserved stock belongs to orders awaiting payment, so only the free remainder is offered.
    variants: product.variants.map((variant) => ({
      id: variant.id, sku: variant.sku,
      optionLabelKo: variant.optionLabelKo, optionLabelEn: variant.optionLabelEn,
      availableStock: variant.stockOnHand - variant.reservedStock,
    })),
  };
}

export async function listAdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { variants: { orderBy: { sku: "asc" } }, category: true },
  });
  return products.filter((product) => !isEventProduct(product)).map((product) => ({
    id: product.id, slug: product.slug, titleKo: product.titleKo, titleEn: product.titleEn,
    descriptionKo: product.descriptionKo, descriptionEn: product.descriptionEn,
    imageUrl: product.imageUrl, images: product.images?.length ? product.images : (product.imageUrl ? [product.imageUrl] : []), published: product.published, memberOnly: product.memberOnly,
    priceKind: product.priceKind, priceAmount: product.priceAmount.toString(),
    listPriceAmount: product.listPriceAmount?.toString() ?? "",
    allowedFulfillments: product.allowedFulfillments,
    categoryId: product.categoryId, categoryNameKo: product.category?.nameKo ?? null,
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map((variant) => ({
      id: variant.id, sku: variant.sku,
      optionLabelKo: variant.optionLabelKo, optionLabelEn: variant.optionLabelEn,
      stockOnHand: variant.stockOnHand, reservedStock: variant.reservedStock,
      billableWeightG: variant.billableWeightG, active: variant.active,
    })),
  }));
}

export async function saveProduct(input: ProductInput, actorId: string, id?: string) {
  requireOrdinaryProduct(input);
  const previous = id ? await prisma.product.findUnique({ where: { id }, select: { imageUrl: true, images: true, descriptionKo: true, descriptionEn: true } }) : null;
  const rawImages = [...new Set([...(input.images?.length ? input.images : (input.imageUrl ? [input.imageUrl] : [])).slice(0, 12), ...markdownImageReferences(input.descriptionKo), ...markdownImageReferences(input.descriptionEn)])];
  const placed = await placeImagesInSlugFolder("products", input.slug, rawImages);
  const descriptionKo = rewriteImagePaths(input.descriptionKo, rawImages, placed.images);
  const descriptionEn = rewriteImagePaths(input.descriptionEn, rawImages, placed.images);
  const gallery = (input.images?.length ? input.images : (input.imageUrl ? [input.imageUrl] : [])).slice(0, 12).map((image) => placed.images[rawImages.indexOf(image)] ?? image);
  try {
  const result = await prisma.$transaction(async (tx) => {
    if (id) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    const current = id ? await tx.product.findUnique({ where: { id }, include: { variants: true } }) : null;
    if (id && !current) throw new HttpError(404, "NOT_FOUND", "상품을 찾을 수 없습니다. / Product not found.");
    if (current) {
      requireOrdinaryProduct(current);
      // Product first, then SKU order: quote and order creation take the same locks in this order.
      for (const variant of [...current.variants].sort((a, b) => a.sku.localeCompare(b.sku))) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variant.id} FOR UPDATE`;
      }
      const locked = await tx.productVariant.findMany({ where: { productId: current.id } });
      for (const variant of input.variants) {
        const stored = locked.find((item) => item.id === variant.id);
        if (variant.id && !stored) throw new HttpError(400, "INVALID_VARIANT", "이 상품의 옵션이 아닙니다. / Variant does not belong to this product.");
        if (stored && stored.sku !== variant.sku) throw new HttpError(409, "SKU_IMMUTABLE", "SKU는 바꿀 수 없습니다. 새 옵션을 만들어 주세요. / Create a new variant to change its SKU.");
        if (stored && variant.stockOnHand < stored.reservedStock) throw new HttpError(409, "STOCK_RESERVED", "결제 대기 중인 수량보다 적게 줄일 수 없습니다. / Stock cannot drop below reservations.");
      }
    } else if (input.variants.some((variant) => variant.id)) {
      throw new HttpError(400, "INVALID_VARIANT", "새 옵션에는 ID를 지정할 수 없습니다. / New variants cannot specify an ID.");
    }
    const { variants, priceAmount, listPriceAmount, categoryId, contentFormat, images: listedImages, imageUrl, ...fields } = input;
    void listedImages;
    void imageUrl;
    const images = gallery;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`product:${fields.slug}`}, 0))`;
    const clash = await tx.product.findUnique({ where: { slug: fields.slug } });
    if (clash && clash.id !== current?.id) throw new HttpError(409, "SLUG_EXISTS", "이미 사용 중인 주소입니다. / Slug is already in use.");
    const resolvedCategoryId = await resolveCategoryId(tx, categoryId);
    const listPrice = listPriceAmount === undefined ? undefined : (listPriceAmount === "" ? null : BigInt(listPriceAmount));
    const data = {
      ...fields, descriptionKo, descriptionEn, imageUrl: images[0] ?? "", images, priceAmount: BigInt(priceAmount), categoryId: resolvedCategoryId,
      ...(contentFormat !== undefined ? { contentFormat } : {}),
      ...(listPrice !== undefined ? { listPriceAmount: listPrice } : {}),
    };
    const product = current
      ? await tx.product.update({ where: { id: current.id }, data })
      : await tx.product.create({ data });
    // Variants are never deleted: order items reference them. Omitted ones are deactivated.
    if (current) {
      await tx.productVariant.updateMany({
        where: { productId: product.id, id: { notIn: variants.flatMap((variant) => variant.id ? [variant.id] : []) } },
        data: { active: false },
      });
    }
    for (const variant of variants) {
      const { id: variantId, ...variantData } = variant;
      if (variantId) await tx.productVariant.update({ where: { id: variantId }, data: variantData });
      else await tx.productVariant.create({ data: { ...variantData, productId: product.id } });
    }
    await tx.auditLog.create({ data: {
      actorId, action: current ? "product.updated" : "product.created",
      targetType: "Product", targetId: product.id,
      summary: { slug: product.slug, published: product.published, variantCount: variants.length },
    } });
    const saved = await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true, category: true } });
    return saved;
  });
  const kept = new Set(collectImagePaths(gallery, descriptionKo, descriptionEn));
  await deleteUnusedImages(collectImagePaths(previous?.imageUrl, previous?.images, previous?.descriptionKo, previous?.descriptionEn).filter((image) => !kept.has(image)));
  return result;
  } catch (error) {
    await placed.restore();
    throw error;
  }
}

export async function archiveProduct(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    const product = await tx.product.findUnique({ where: { id }, include: { variants: true } });
    if (!product) throw new HttpError(404, "NOT_FOUND", "상품을 찾을 수 없습니다. / Product not found.");
    requireOrdinaryProduct(product);
    await tx.product.update({ where: { id }, data: { published: false } });
    await tx.auditLog.create({ data: { actorId, action: "product.archived", targetType: "Product", targetId: id, summary: { published: false } } });
    return { id, archived: true };
  });
}
