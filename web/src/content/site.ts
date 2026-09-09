import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { centerContent } from "./center";
import { centerMedia } from "./media";

export const publicSections = [
  "about",
  "programs",
  "experience",
  "journal",
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
  const image = centerMedia.lounge.image;

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description: content.introduction,
    robots: { index: false, follow: false },
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
      images: [
        {
          url: image.src,
          width: image.width,
          height: image.height,
          alt: centerMedia.lounge.alt[locale],
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: content.introduction,
      images: [image.src],
    },
  };
}

export function recordMetadata(
  locale: Locale,
  section: Extract<PublicSection, "programs" | "journal">,
  identifier: string | number,
  title: string,
  description: string,
): Metadata {
  const metadata = pageMetadata(locale, section);
  const path = `/${section}/${identifier}`;
  return {
    ...metadata,
    title: `${title} | ${centerContent[locale].hero.title}`,
    description,
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
      description,
      url: `/${locale}${path}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
