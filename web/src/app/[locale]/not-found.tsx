import type { Metadata } from "next";
import { locale as getRootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { NotFoundPage } from "@/components/site/not-found-page";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await notFoundLocale();
  return {
    title: locale === "ko" ? "페이지를 찾을 수 없습니다 | Bitcoin Center Seoul" : "Page not found | Bitcoin Center Seoul",
    robots: { index: false, follow: false },
  };
}

async function notFoundLocale(): Promise<Locale> {
  const candidate = await getRootLocale().catch(() => "ko");
  return hasLocale(routing.locales, candidate) ? candidate : "ko";
}

export default async function NotFound() {
  return <NotFoundPage locale={await notFoundLocale()} />;
}
