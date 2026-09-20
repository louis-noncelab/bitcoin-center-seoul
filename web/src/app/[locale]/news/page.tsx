import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { NewsList, NewsMedia, NewsNavigation, newsCopy } from "@/components/site/news-content";
import { pageMetadata } from "@/content/site";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buildNewsFeed } from "@/lib/news";
import { listHighlights } from "@/server/events";
import { listNotices } from "@/server/notices";
import "@/styles/site.css";
import "@/styles/site-sections.css";

type Props = { readonly params: Promise<{ locale: string }>; readonly searchParams: Promise<{ view?: string | string[] }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const base = pageMetadata(locale), t = newsCopy[locale];
  return { ...base, title: `${t.title} | Bitcoin Center Seoul`, description: t.intro,
    alternates: { canonical: `/${locale}/news`, languages: { ko: "/ko/news", en: "/en/news", "x-default": "/ko/news" } },
    openGraph: { ...base.openGraph, title: t.title, description: t.intro, url: `/${locale}/news` },
    twitter: { ...base.twitter, title: t.title, description: t.intro },
  };
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { view } = await searchParams;
  if (view !== undefined && view !== "media") redirect(`/${locale}/news`);
  await connection();
  const highlights = listHighlights(), items = buildNewsFeed(listNotices(), highlights), t = newsCopy[locale];
  const media = view === "media";
  return <>
    <SiteHeader locale={locale} section="news" />
    <main id="main" className="container news-page" tabIndex={-1}>
      <header className="news-heading"><p className="news-eyebrow">NEWS & STORIES</p><h1>{t.title}</h1><p className="body-copy muted">{t.intro}</p></header>
      <NewsNavigation locale={locale} current={media ? "media" : "all"} />
      <section className="news-page-section" aria-labelledby="news-content-title">
        <div className="news-section-heading"><h2 id="news-content-title">{media ? t.media : t.recent}</h2>{media && <span className="news-eyebrow">MEDIA WALL</span>}</div>
        {media ? <NewsMedia highlights={highlights} locale={locale} /> : <NewsList items={items.slice(0, 12)} locale={locale} />}
        <div className="news-archive-links"><p className="muted">{t.archive}</p><Link href="/notices" locale={locale} className="section-link">{t.notices}<ArrowRight className="icon" aria-hidden="true" /></Link><Link href="/journal" locale={locale} prefetch={false} className="section-link">{t.journal}<ArrowRight className="icon" aria-hidden="true" /></Link></div>
      </section>
    </main>
    <SiteFooter locale={locale} />
  </>;
}
