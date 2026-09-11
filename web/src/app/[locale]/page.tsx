import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { Home } from "@/components/site/home";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { pageMetadata } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import "@/styles/events-public.css";
import "@/styles/site.css";
import "@/styles/site-sections.css";

type Props = { readonly params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata(locale);
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const highlights = await listHighlights();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const nextEvent = listEvents()
    .filter(event => event.date.trim().replaceAll(".", "-") >= today)
    .sort((a, b) => a.date.trim().replaceAll(".", "-").localeCompare(b.date.trim().replaceAll(".", "-")) || a.time.localeCompare(b.time) || a.id - b.id)[0] ?? null;
  return (
    <>
      <SiteHeader locale={locale} home />
      <Home locale={locale} highlights={highlights} nextEvent={nextEvent} />
      <SiteFooter locale={locale} />
      <OrganizationJsonLd locale={locale} />
    </>
  );
}
