// Seeds the commerce slice with enough data to exercise cart -> checkout locally.
// Safe to re-run: every row is upserted by a stable key.
//
//   set -a && . ./.env.local && set +a && npm run db:seed
import { prisma } from "@/server/db";

async function main() {
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site", btcPriceSource: "UPBIT", paymentProvider: "ZAPRITE", productDisplayUnit: "SATS" },
  });

  const zone = await prisma.shippingZone.upsert({
    where: { id: "zone-domestic" },
    update: { nameKo: "국내", nameEn: "Domestic", active: true },
    create: { id: "zone-domestic", nameKo: "국내", nameEn: "Domestic" },
  });
  await prisma.shippingCountry.upsert({
    where: { code: "KR" },
    update: { zoneId: zone.id, requiresPostalCode: true },
    create: { code: "KR", zoneId: zone.id, requiresPostalCode: true },
  });
  for (const [maxWeightG, amountKrw] of [[1000, 3500n], [5000, 5000n], [20000, 9000n]] as const) {
    await prisma.shippingRate.upsert({
      where: { zoneId_maxWeightG: { zoneId: zone.id, maxWeightG } },
      update: { amountKrw },
      create: { zoneId: zone.id, maxWeightG, amountKrw },
    });
  }

  const category = await prisma.productCategory.upsert({
    where: { slug: "books" },
    update: { nameKo: "책", nameEn: "Books" },
    create: { slug: "books", nameKo: "책", nameEn: "Books", sortOrder: 0 },
  });

  const book = await prisma.product.upsert({
    where: { slug: "bitcoin-standard" },
    update: { published: true, priceKind: "KRW_FIXED", priceAmount: 28_000n, categoryId: category.id },
    create: {
      slug: "bitcoin-standard",
      titleKo: "비트코인 스탠다드", titleEn: "The Bitcoin Standard",
      descriptionKo: "센터에서 판매하는 비트코인 입문서입니다.",
      descriptionEn: "An introductory bitcoin title sold at the center.",
      published: true,
      priceKind: "KRW_FIXED",
      priceAmount: 28_000n,
      allowedFulfillments: ["PICKUP", "DOMESTIC"],
      categoryId: category.id,
    },
  });
  await prisma.productVariant.upsert({
    where: { sku: "BOOK-BTC-STD" },
    update: { stockOnHand: 20, billableWeightG: 450, active: true },
    create: {
      productId: book.id, sku: "BOOK-BTC-STD",
      optionLabelKo: "단권", optionLabelEn: "Single copy",
      stockOnHand: 20, billableWeightG: 450,
    },
  });

  const variants = await prisma.productVariant.findMany({ where: { product: { published: true } }, include: { product: true } });
  for (const variant of variants) {
    console.log(`${variant.sku}  ${variant.product.slug}  id=${variant.id}  stock=${variant.stockOnHand}`);
  }
}

await main();
await prisma.$disconnect();
