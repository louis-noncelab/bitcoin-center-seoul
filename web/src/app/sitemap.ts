import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicSections, siteOrigin } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import { listReviews } from "@/server/reviews";
import { listNotices } from "@/server/notices";
import { libraryKinds } from "@/lib/collection-contract";
import { listCollection } from "@/server/collection";
import { listProducts } from "@/server/catalog";

async function listedShopPaths(): Promise<string[]> {
  try {
    const products = await listProducts();
    return ["/shop", ...products.map((product) => `/shop/${product.slug}`)];
  } catch {
    // A catalog failure must not drop the rest of the sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [events, highlights, shopPaths, reviews, library, boardGames, goods, notices] = await Promise.all([
    listEvents(),
    listHighlights(),
    listedShopPaths(),
    listReviews(),
    listCollection(false, libraryKinds),
    listCollection(false, ["boardgame"]),
    listCollection(false, ["goods"]),
    listNotices(),
  ]);
  const paths = [
    "",
    ...shopPaths,
    "/experience/wallet",
    "/notices",
    "/news",
    "/collection",
    "/goods",
    "/experience/board-game",
    "/reviews",
    ...reviews
      .filter((review) => review.slug && review.description)
      .map((review) => `/reviews/${review.slug}`),
    ...library.map(
      (item) => `/collection/${item.slug || item.id}`,
    ),
    ...boardGames.map(
      (item) => `/experience/board-game/${item.slug || item.id}`,
    ),
    ...goods.map((item) => `/goods/${item.slug || item.id}`),
    ...notices.map((notice) => `/notices/${notice.slug}`),
    ...publicSections.map((section) => `/${section}`),
    ...events.map((event) => `/programs/${event.slug || event.id}`),
    ...highlights.map(
      (highlight) => `/journal/${highlight.slug || highlight.id}`,
    ),
  ];
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${siteOrigin}/${locale}${path}`,
      alternates: {
        languages: {
          ko: `${siteOrigin}/ko${path}`,
          en: `${siteOrigin}/en${path}`,
          "x-default": `${siteOrigin}/ko${path}`,
        },
      },
    })),
  );
}
