import "server-only";
import { prisma, type Tx } from "@/server/db";
import { HttpError } from "@/server/http";
import type { ProductCategoryInput } from "./validation";

export function publicCategory(category: { id: string; slug: string; nameKo: string; nameEn: string; sortOrder: number; active: boolean }) {
  return {
    id: category.id,
    slug: category.slug,
    nameKo: category.nameKo,
    nameEn: category.nameEn,
    sortOrder: category.sortOrder,
    active: category.active,
  };
}

export async function listPublicCategories() {
  const categories = await prisma.productCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameKo: "asc" }],
  });
  return categories.map(publicCategory);
}

export async function listAdminCategories() {
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameKo: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return categories.map((category) => ({ ...publicCategory(category), productCount: category._count.products }));
}

async function lockSlug(tx: Tx, slug: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`product-category:${slug}`}, 0))`;
}

export async function saveCategory(input: ProductCategoryInput, actorId: string, id?: string) {
  return prisma.$transaction(async (tx) => {
    if (id) await tx.$queryRaw`SELECT id FROM "ProductCategory" WHERE id = ${id} FOR UPDATE`;
    const current = id ? await tx.productCategory.findUnique({ where: { id } }) : null;
    if (id && !current) throw new HttpError(404, "NOT_FOUND", "Category not found.");
    await lockSlug(tx, input.slug);
    const clash = await tx.productCategory.findUnique({ where: { slug: input.slug } });
    if (clash && clash.id !== current?.id) throw new HttpError(409, "SLUG_EXISTS", "이미 사용 중인 주소입니다. / Slug is already in use.");
    const category = current
      ? await tx.productCategory.update({ where: { id: current.id }, data: input })
      : await tx.productCategory.create({ data: input });
    await tx.auditLog.create({
      data: {
        actorId,
        action: current ? "category.updated" : "category.created",
        targetType: "ProductCategory",
        targetId: category.id,
        summary: { slug: category.slug, active: category.active },
      },
    });
    return publicCategory(category);
  });
}

export async function deactivateCategory(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProductCategory" WHERE id = ${id} FOR UPDATE`;
    const category = await tx.productCategory.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!category) throw new HttpError(404, "NOT_FOUND", "Category not found.");
    await tx.productCategory.update({ where: { id }, data: { active: false } });
    await tx.auditLog.create({
      data: { actorId, action: "category.deactivated", targetType: "ProductCategory", targetId: id, summary: { productCount: category._count.products } },
    });
    return { id, active: false as const, productCount: category._count.products };
  });
}

export async function resolveCategoryId(tx: Tx, categoryId: string | null | undefined) {
  const id = categoryId?.trim() || null;
  if (!id) return null;
  const category = await tx.productCategory.findUnique({ where: { id }, select: { id: true } });
  if (!category) throw new HttpError(400, "INVALID_CATEGORY", "카테고리를 다시 선택해 주세요. / Choose a valid category.");
  return category.id;
}
