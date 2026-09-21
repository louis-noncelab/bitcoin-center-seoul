import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/content/site";
import { centerContent } from "@/content/center";
import "@/styles/commerce.css";

export function pageLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
export function commerceMetadata(locale: Locale, page: { readonly path: string; readonly title: string; readonly description?: string }): Metadata {
  const base = pageMetadata(locale);
  const title = `${page.title} | ${centerContent[locale].hero.title}`;
  const description = page.description?.slice(0, 200) ?? (locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul");
  return { ...base, title, description,
    alternates: { canonical: `/${locale}${page.path}`, languages: { ko: `/ko${page.path}`, en: `/en${page.path}`, "x-default": `/ko${page.path}` } },
    openGraph: { ...base.openGraph, title, description, url: `/${locale}${page.path}` },
    twitter: { ...base.twitter, title, description },
  };
}
export function safeLink(value: string): string | null {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
