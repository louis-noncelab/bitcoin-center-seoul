import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/content/site";
import { shareImages } from "@/content/share";
import { centerContent } from "@/content/center";
import { markdownExcerpt } from "@/lib/markdown";
import "@/styles/commerce.css";

export function pageLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
export function commerceMetadata(locale: Locale, page: { readonly path: string; readonly title: string; readonly description?: string }, options?: { readonly indexed?: boolean; readonly image?: string }): Metadata {
  const indexed = options?.indexed !== false;
  const base = pageMetadata(locale);
  const title = `${page.title} | ${centerContent[locale].hero.title}`;
  const description = (page.description ? markdownExcerpt(page.description) : "") || (locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul");
  const canonical = `/${locale}${page.path}`;
  const images = options?.image ? shareImages(options.image, page.title) : undefined;
  return { ...base, title, description,
    robots: indexed ? base.robots : { index: false, follow: false },
    alternates: indexed
      ? { canonical, languages: { ko: `/ko${page.path}`, en: `/en${page.path}`, "x-default": `/ko${page.path}` } }
      : { canonical },
    openGraph: { ...base.openGraph, title, description, url: canonical, ...(images ? { images } : {}) },
    twitter: { ...base.twitter, title, description, ...(options?.image ? { images: [options.image] } : {}) },
  };
}
export function safeLink(value: string): string | null {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
