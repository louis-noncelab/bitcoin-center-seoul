import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicSections, siteOrigin } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import { listReviews } from "@/server/reviews";
import { guestbookPage } from "@/server/guestbook";
import { listNotices } from "@/server/notices";
import { libraryKinds } from "@/lib/collection-contract";
import { listCollection } from "@/server/collection";
import { listProducts } from "@/server/catalog";
import { anniversaryYears } from "@/lib/anniversary";
import { seoulDate } from "@/lib/center-status";
import { prisma } from "@/server/db";

type SitemapPath = { readonly path: string; readonly lastModified?: Date | string };

function contentModifiedAt(utc: string): Date {
  // Legacy content DTOs omit the timezone from their UTC timestamps.
  return new Date(`${utc.replace(" ", "T")}Z`);
}

async function listedShopPaths(): Promise<SitemapPath[]> {
  try {
    const products = await listProducts();
    return [{ path: "/shop" }, ...products.map((product) => ({ path: `/shop/${product.slug}`, lastModified: product.updatedAt }))];
  } catch {
    // A catalog failure must not drop the rest of the sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [events, highlights, shopPaths, reviews, library, boardGames, goods, notices, eventDates, highlightDates] = await Promise.all([
    listEvents(),
    listHighlights(),
    listedShopPaths(),
    listReviews(),
    listCollection(false, libraryKinds),
    listCollection(false, ["boardgame"]),
    listCollection(false, ["goods"]),
    listNotices(),
    prisma.centerEvent.findMany({ select: { id: true, updatedAt: true } }),
    prisma.centerHighlight.findMany({ where: { isActive: 1 }, select: { id: true, updatedAt: true } }),
  ]);
  const eventUpdated = new Map(eventDates.map((row) => [row.id, row.updatedAt]));
  const highlightUpdated = new Map(highlightDates.map((row) => [row.id, row.updatedAt]));
  const staticPaths = [
    "",
    ...((await guestbookPage()).total > 0 ? ["/guestbook"] : []),
    "/experience/wallet",
    "/notices",
    "/news",
    ...anniversaryYears(seoulDate()).map((year) => `/anniversary/${year}`),
    "/collection",
    "/goods",
    "/experience/board-game",
    "/reviews",
    "/business-info",
    "/privacy-policy",
    "/terms-of-service",
    "/refund-policy",
    ...publicSections.map((section) => `/${section}`),
  ];
  const paths: SitemapPath[] = [
    ...staticPaths.map((path) => ({ path })),
    ...shopPaths,
    ...reviews
      .filter((review) => review.slug && review.description)
      .map((review) => ({ path: `/reviews/${review.slug}`, lastModified: contentModifiedAt(review.updated_at) })),
    ...library.map(
      (item) => ({ path: `/collection/${item.slug || item.id}`, lastModified: contentModifiedAt(item.updated_at) }),
    ),
    ...boardGames.map(
      (item) => ({ path: `/experience/board-game/${item.slug || item.id}`, lastModified: contentModifiedAt(item.updated_at) }),
    ),
    ...goods.map((item) => ({ path: `/goods/${item.slug || item.id}`, lastModified: contentModifiedAt(item.updated_at) })),
    ...notices.map((notice) => ({ path: `/notices/${notice.slug}`, lastModified: contentModifiedAt(notice.updated_at) })),
    ...events.map((event) => ({ path: `/programs/${event.slug || event.id}`, lastModified: eventUpdated.get(event.id) })),
    ...highlights.map(
      (highlight) => ({ path: `/journal/${highlight.slug || highlight.id}`, lastModified: highlightUpdated.get(highlight.id) }),
    ),
  ];
  return paths.flatMap(({ path, lastModified }) =>
    routing.locales.map((locale) => ({
      url: `${siteOrigin}/${locale}${path}`,
      ...(lastModified ? { lastModified } : {}),
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
