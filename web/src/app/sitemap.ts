import type { MetadataRoute } from "next";
import { publicSections, siteOrigin } from "@/content/site";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", ...publicSections.map((section) => `/${section}`)].flatMap(
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
