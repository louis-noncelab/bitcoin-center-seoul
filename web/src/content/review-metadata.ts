import type { Metadata } from "next";
import type { ReviewRecord } from "@/lib/reviews-contract";
import type { Locale } from "@/i18n/routing";
import { markdownExcerpt } from "@/lib/markdown";
import { defaultShareImage, shareCardPath, shareImages } from "./share";
import { pageMetadata, siteOrigin } from "./site";
import { visitReview } from "./visit-reviews";

export function reviewMetadata(record: ReviewRecord, locale: Locale): Metadata {
  const base = pageMetadata(locale);
  const review = visitReview(record);
  const title = review.title[locale];
  const description = markdownExcerpt(review.summary[locale]);
  const path = `/reviews/${record.slug}`;
  const imageUrl = record.image ? shareCardPath("reviews", record.slug) : defaultShareImage;
  return {
    ...base, title: `${title} | Bitcoin Center Seoul`, description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, type: "article", title, description, url: `/${locale}${path}`, images: shareImages(imageUrl, title) },
    twitter: { ...base.twitter, title, description, images: [imageUrl] },
  };
}

export function reviewStructuredData(record: ReviewRecord, locale: Locale) {
  const review = visitReview(record);
  const url = `${siteOrigin}/${locale}/reviews/${record.slug}`;
  return {
    "@context": "https://schema.org", "@graph": [
      {
        "@type": "Article", "@id": `${url}#article`, mainEntityOfPage: url,
        headline: review.title[locale], description: markdownExcerpt(review.summary[locale]),
        inLanguage: locale === "en" && record.descriptionEn ? "en" : "ko",
        author: { "@type": "Organization", name: "Bitcoin Center Seoul", url: siteOrigin },
        publisher: { "@type": "Organization", name: "Bitcoin Center Seoul", url: siteOrigin },
        citation: record.url,
        image: [`${siteOrigin}${record.image ? shareCardPath("reviews", record.slug) : defaultShareImage}`],
      },
      {
        "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "ko" ? "홈" : "Home", item: `${siteOrigin}/${locale}` },
          { "@type": "ListItem", position: 2, name: locale === "ko" ? "방문 후기" : "Visitor stories", item: `${siteOrigin}/${locale}/reviews` },
          { "@type": "ListItem", position: 3, name: review.title[locale], item: url },
        ],
      },
    ],
  };
}
