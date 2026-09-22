import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { markdownExcerpt } from "@/lib/markdown";
import { publicIndexingEnabled } from "@/lib/public-indexing";
import { centerContent } from "./center";
import { defaultShareAlt, defaultShareImage, shareImages } from "./share";

export const publicSections = [
  "about",
  "programs",
  "journal",
  "experience",
  "visit",
] as const;
export type PublicSection = (typeof publicSections)[number];
export const siteOrigin = centerContent.ko.visit.website.href;

export function pageMetadata(
  locale: Locale,
  section?: PublicSection,
): Metadata {
  const content = section
    ? centerContent[locale][section]
    : centerContent[locale].hero;
  const path = section ? `/${section}` : "";
  const siteName = centerContent[locale].hero.title;
  const pageTitle = section === "about"
    ? centerContent[locale].nav[1].label
    : content.title;
  const title = pageTitle.includes(siteName)
    ? pageTitle
    : `${pageTitle} | ${siteName}`;
  const imageAlt = defaultShareAlt(locale);

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description: content.introduction,
    robots: { index: publicIndexingEnabled(), follow: publicIndexingEnabled() },
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ko: `/ko${path}`,
        en: `/en${path}`,
        "x-default": `/ko${path}`,
      },
    },
    openGraph: {
      title,
      description: content.introduction,
      siteName,
      url: `/${locale}${path}`,
      locale: locale === "ko" ? "ko_KR" : "en_US",
      alternateLocale: locale === "ko" ? "en_US" : "ko_KR",
      type: "website",
      images: shareImages(defaultShareImage, imageAlt),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: content.introduction,
      images: [defaultShareImage],
    },
  };
}

export function recordMetadata(
  locale: Locale,
  section: Extract<PublicSection, "programs" | "journal">,
  identifier: string | number,
  title: string,
  description: string,
  imageUrl = defaultShareImage,
): Metadata {
  const metadata = pageMetadata(locale, section);
  const path = `/${section}/${identifier}`;
  const excerpt = markdownExcerpt(description);
  return {
    ...metadata,
    title: `${title} | ${centerContent[locale].hero.title}`,
    description: excerpt,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ko: `/ko${path}`,
        en: `/en${path}`,
        "x-default": `/ko${path}`,
      },
    },
    openGraph: {
      ...metadata.openGraph,
      title,
      description: excerpt,
      url: `/${locale}${path}`,
      type: section === "journal" ? "article" : "website",
      images: shareImages(imageUrl, title),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: excerpt,
      images: [imageUrl],
    },
  };
}
