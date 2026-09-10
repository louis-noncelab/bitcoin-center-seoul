import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localePrefix: "always",
  localeDetection: true,
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // Page metadata and sitemap own the canonical locale URLs.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
