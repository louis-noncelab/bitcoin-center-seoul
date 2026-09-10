import { ArrowLeft } from "lucide-react";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { SectionContent } from "@/components/site/section-content";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { centerContent } from "@/content/center";
import { pageMetadata, publicSections } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { listEvents, listHighlightsPage } from "@/server/events";
import "@/styles/events-public.css";
import "@/styles/site.css";
import "@/styles/site-sections.css";

type Props = {
  readonly params: Promise<{ locale: string; section: string }>;
  readonly searchParams: Promise<{ readonly page?: string | string[] }>;
};

const journalPage = cache(async (locale: Locale, value: string | string[] | undefined) => {
  await connection();
  if (value !== undefined && (typeof value !== "string" || !/^[1-9]\d*$/.test(value))) redirect(`/${locale}/journal`);
  const result = listHighlightsPage(value === undefined ? 1 : Number(value));
  if (value !== undefined && (result.page === 1 || value !== String(result.page))) {
    redirect(`/${locale}/journal${result.page === 1 ? "" : `?page=${result.page}`}`);
  }
  return result;
});

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    publicSections.map((section) => ({ locale, section })),
  );
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale, section: value } = await params;
  const section = publicSections.find((item) => item === value);
  if (!hasLocale(routing.locales, locale) || !section) notFound();
  const metadata = pageMetadata(locale, section);
  if (section !== "journal") return metadata;
  const { page } = await journalPage(locale, (await searchParams).page);
  const query = page === 1 ? "" : `?page=${page}`;
  return {
    ...metadata,
    alternates: {
      canonical: `/${locale}/journal${query}`,
      languages: { ko: `/ko/journal${query}`, en: `/en/journal${query}`, "x-default": `/ko/journal${query}` },
    },
    openGraph: { ...metadata.openGraph, url: `/${locale}/journal${query}` },
  };
}

export default async function SectionPage({ params, searchParams }: Props) {
  const { locale, section: value } = await params;
  const section = publicSections.find((item) => item === value);
  if (!hasLocale(routing.locales, locale) || !section) notFound();
  const content = centerContent[locale][section];
  let events: EventRecord[] = [];
  let highlights: HighlightRecord[] = [];
  let today = "";
  let pagination = { page: 1, totalPages: 1 };
  if (section === "programs") {
    await connection();
    events = await listEvents();
    today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  } else if (section === "journal") {
    const result = await journalPage(locale, (await searchParams).page);
    highlights = result.highlights;
    pagination = result;
  }
  return (
    <>
      <SiteHeader locale={locale} section={section} />
      <main
        id="main"
        className={`container detail-page detail-${section}`}
        tabIndex={-1}
      >
        <div className="detail-heading">
          <Link href="/" locale={locale} className="button" data-variant="secondary">
            <ArrowLeft className="icon" aria-hidden="true" />
            {locale === "ko" ? "홈으로" : "Back to home"}
          </Link>
          <h1>{content.title}</h1>
          <p className="body-copy muted">{content.introduction}</p>
        </div>
        <SectionContent locale={locale} section={section} events={events} highlights={highlights} today={today} pagination={pagination} />
        <PageMotion pageKey={`${locale}-${section}-${pagination.page}`} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
