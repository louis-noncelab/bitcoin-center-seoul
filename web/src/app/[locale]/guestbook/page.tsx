import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import { GuestbookEntry } from "@/components/site/guestbook";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { NewsNavigation } from "@/components/site/news-content";
import { guestbookCopy } from "@/content/guestbook";
import { pageMetadata } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { guestbookHref, guestbookPageNumber } from "@/lib/guestbook-contract";
import { publicIndexingEnabled } from "@/lib/public-indexing";
import { guestbookPage } from "@/server/guestbook";
import "@/styles/site.css";

type Props = { readonly params: Promise<{ locale: string }>; readonly searchParams: Promise<{ page?: string | string[] }> };

async function content({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = guestbookPageNumber((await searchParams).page);
  if (page === null) notFound();
  await connection();
  const data = await guestbookPage(page);
  if (page > data.totalPages) notFound();
  return { locale, page, ...data };
}

export async function generateMetadata(props: Props) {
  const { locale, page, total } = await content(props);
  const t = guestbookCopy[locale];
  const base = pageMetadata(locale);
  const title = `${t.title}${page > 1 ? ` (${page})` : ""} | Bitcoin Center Seoul`;
  const path = guestbookHref(page);
  return { ...base, title, description: t.description,
    robots: { index: total > 0 && publicIndexingEnabled(), follow: publicIndexingEnabled() },
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, title, description: t.description, url: `/${locale}${path}` },
    twitter: { ...base.twitter, title, description: t.description },
  };
}

export default async function GuestbookPage(props: Props) {
  const { locale, page, records, totalPages } = await content(props);
  const t = guestbookCopy[locale];
  return <><SiteHeader locale={locale} section="news" /><main id="main" tabIndex={-1} className="container detail-page guestbook-page">
    <div className="detail-heading"><h1>{t.title}</h1><p className="body-copy muted">{t.intro}</p></div>
    <NewsNavigation locale={locale} current="guestbook" />
    <div className="guestbook-list">{records.map((entry) => <GuestbookEntry key={entry.id} entry={entry} locale={locale} />)}{!records.length && <p className="guestbook-empty muted">{t.empty}</p>}</div>
    {totalPages > 1 && <nav className="guestbook-pagination" aria-label={t.pagination}>
      {page > 1 && <Link href={guestbookHref(page - 1)} locale={locale} rel="prev" className="button" data-variant="secondary">{t.previous}</Link>}
      <span aria-current="page">{page} / {totalPages}</span>
      {page < totalPages && <Link href={guestbookHref(page + 1)} locale={locale} rel="next" className="button" data-variant="secondary">{t.next}</Link>}
    </nav>}
    <aside className="guestbook-visit"><div><h2>{t.visitTitle}</h2><p className="muted">{t.visitCopy}</p></div><Link href="/visit" locale={locale} className="button" data-variant="secondary">{t.visitLink}<ArrowRight className="icon" aria-hidden="true" /></Link></aside>
  </main><SiteFooter locale={locale} /></>;
}
