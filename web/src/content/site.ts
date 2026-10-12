import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { markdownExcerpt } from "@/lib/markdown";
import { publicIndexingEnabled } from "@/lib/public-indexing";
import { withoutWordJoiners } from "@/lib/text";
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

const searchTitles = {
  ko: {
    home: "홍대의 비트코인 모임과 체험 공간",
    about: "서울의 비트코인 문화 공간",
    programs: "비트코인 강의와 밋업 일정",
    experience: "비트코인 전시와 하드웨어 지갑 체험",
    journal: "비트코인 밋업과 행사 기록",
    visit: "홍대입구 오시는 길과 운영시간",
  },
  en: {
    home: "Meetups and a community space in Hongdae",
    about: "A Bitcoin community space in Seoul",
    programs: "Bitcoin classes and meetups in Seoul",
    experience: "Bitcoin art and hardware wallet demos",
    journal: "Bitcoin meetup stories and photos",
    visit: "Directions and opening hours in Hongdae",
  },
} as const;

export function pageMetadata(
  locale: Locale,
  section?: PublicSection,
): Metadata {
  const content = section
    ? centerContent[locale][section]
    : centerContent[locale].hero;
  const path = section ? `/${section}` : "";
  const siteName = centerContent[locale].hero.title;
  const pageTitle = searchTitles[locale][section ?? "home"];
  const title = section ? `${pageTitle} | ${siteName}` : `${siteName} | ${pageTitle}`;
  const description = withoutWordJoiners(content.introduction);
  const imageAlt = defaultShareAlt(locale);

  return {
    metadataBase: new URL(siteOrigin),
    title: withoutWordJoiners(title),
    description,
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
      description,
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
      description,
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
  const cleanTitle = withoutWordJoiners(title);
  return {
    ...metadata,
    title: `${cleanTitle} | ${centerContent[locale].hero.title}`,
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
      title: cleanTitle,
      description: excerpt,
      url: `/${locale}${path}`,
      type: section === "journal" ? "article" : "website",
      images: shareImages(imageUrl, cleanTitle),
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description: excerpt,
      images: [imageUrl],
    },
  };
}
