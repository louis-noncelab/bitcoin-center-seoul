import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localePrefix: "always",
  localeDetection: false,
  // Page metadata and sitemap own the canonical locale URLs.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
