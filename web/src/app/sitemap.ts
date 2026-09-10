import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicSections, siteOrigin } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import { listNotices } from "@/server/notices";
import { listCollection } from "@/server/collection";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [events, highlights] = await Promise.all([listEvents(), listHighlights()]);
  const paths = [
    "",
    "/experience/wallet",
    "/notices",
    "/collection",
    ...listCollection().map((item) => `/collection/${item.id}`),
    ...listNotices().map((notice) => `/notices/${notice.slug}`),
    ...publicSections.map((section) => `/${section}`),
    ...events.map((event) => `/programs/${event.slug || event.id}`),
    ...highlights.map((highlight) => `/journal/${highlight.slug || highlight.id}`),
  ];
  return paths.flatMap(
    (path) =>
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
