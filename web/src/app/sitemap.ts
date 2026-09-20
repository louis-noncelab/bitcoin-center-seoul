import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicSections, siteOrigin } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import { listReviews } from "@/server/reviews";
import { listNotices } from "@/server/notices";
import { libraryKinds } from "@/lib/collection-contract";
import { listCollection } from "@/server/collection";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [events, highlights] = await Promise.all([
    listEvents(),
    listHighlights(),
  ]);
  const paths = [
    "",
    "/experience/wallet",
    "/notices",
    "/news",
    "/collection",
    "/goods",
    "/experience/board-game",
    "/reviews",
    ...listReviews()
      .filter((review) => review.slug && review.description)
      .map((review) => `/reviews/${review.slug}`),
    ...listCollection(false, libraryKinds).map(
      (item) => `/collection/${item.slug || item.id}`,
    ),
    ...listCollection(false, ["boardgame"]).map(
      (item) => `/experience/board-game/${item.slug || item.id}`,
    ),
    ...listNotices().map((notice) => `/notices/${notice.slug}`),
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
