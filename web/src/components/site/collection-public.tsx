import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SelectionTabs } from "@/components/controls/selection-tabs";
import { ContentLink } from "@/components/controls/content-link";
import { pageMetadata } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import type { CollectionRecord } from "@/lib/collection-contract";
import { markdownExcerpt } from "@/lib/markdown";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PageMotion } from "./page-motion";
import "@/styles/site.css";
import "@/styles/events-public.css";
import "@/styles/collection.css";

export const collectionCopy = {
  ko: { title: "도서·작품", introduction: "센터의 도서와 작품을 둘러보세요.", all: "전체", book: "도서", artwork: "작품", empty: "아직 등록된 도서·작품이 없습니다.", view: "자세히 보기" },
  en: { title: "Books & art", introduction: "Explore the books and artworks in the library and exhibitions at Bitcoin Center Seoul.", all: "All", book: "Books", artwork: "Art", empty: "No books or artworks have been added yet.", view: "View details" },
} as const;

export function collectionText(locale: Locale, record: CollectionRecord) {
  return { title: locale === "en" ? record.titleEn || record.title : record.title, creator: locale === "en" ? record.creatorEn || record.creator : record.creator, description: locale === "en" ? record.descriptionEn || record.description : record.description };
}

export function collectionMetadata(locale: Locale, record?: CollectionRecord): Metadata {
  const copy = collectionCopy[locale];
  const content = record ? collectionText(locale, record) : copy;
  const title = content.title;
  const description = record ? markdownExcerpt(collectionText(locale, record).description) || `${title} | ${copy.title}` : copy.introduction;
  const path = `/collection${record ? `/${record.id}` : ""}`;
  const base = pageMetadata(locale, "experience");
  const images = record?.images[0] ? [{ url: record.images[0], alt: title }] : undefined;
  return { ...base, title: `${title} | Bitcoin Center Seoul`, description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, title, description, url: `/${locale}${path}`, ...(images ? { images } : {}) },
    twitter: { ...base.twitter, title, description, ...(images ? { images } : {}) },
  };
}

export function CollectionFrame({ locale, title, detail = false, children }: { readonly locale: Locale; readonly title: string; readonly detail?: boolean; readonly children: ReactNode }) {
  return <><SiteHeader locale={locale} section="experience" /><main id="main" tabIndex={-1} className={`container detail-page ${detail ? "event-page" : "collection-page"}`}>
    <ContentLink href={detail ? "/collection" : "/experience"} locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{detail ? locale === "ko" ? "도서·작품으로" : "Back to books & art" : locale === "ko" ? "전시·체험으로" : "Back to exhibitions"}</ContentLink>
    <div className="detail-heading"><h1>{title}</h1>{!detail && <p className="body-copy muted">{collectionCopy[locale].introduction}</p>}</div>
    {children}<PageMotion pageKey={`${locale}-collection-${title}`} />
  </main><SiteFooter locale={locale} /></>;
}

function CollectionGrid({ records, locale }: { readonly records: readonly CollectionRecord[]; readonly locale: Locale }) {
  const copy = collectionCopy[locale];
  if (!records.length) return <p className="catalog-empty muted">{copy.empty}</p>;
  return <div className="collection-grid">{records.map((record) => {
    const content = collectionText(locale, record);
    return <article key={record.id} className="collection-card">
      <ContentLink href={`/collection/${record.id}`} locale={locale} className="highlight-card-link">
        <span className="collection-image">{record.images[0] && <Image src={record.images[0]} alt={content.title} width={600} height={800} unoptimized />}</span>
        <span className="highlight-card-copy">
          <span className="caption muted">{copy[record.kind]}</span>
          <h2 lang={locale === "en" && !record.titleEn ? "ko" : locale}>{content.title}</h2>
          {content.creator && <span className="collection-creator muted" lang={locale === "en" && !record.creatorEn ? "ko" : locale}>{content.creator}</span>}
          <span className="catalog-read">{copy.view}<ArrowRight className="icon" aria-hidden="true" /></span>
        </span>
      </ContentLink>
    </article>;
  })}</div>;
}

export function CollectionGallery({ records, locale }: { readonly records: readonly CollectionRecord[]; readonly locale: Locale }) {
  const copy = collectionCopy[locale];
  return <div className="collection-browser"><SelectionTabs label={copy.title} orientation="horizontal" keyboardHint={locale === "ko" ? "좌우 방향키로 전체, 도서, 작품을 선택하세요." : "Use the arrow keys to select all, books or art."} items={[
    { id: "all", label: copy.all, content: <CollectionGrid records={records} locale={locale} /> },
    { id: "book", label: copy.book, content: <CollectionGrid records={records.filter((record) => record.kind === "book")} locale={locale} /> },
    { id: "artwork", label: copy.artwork, content: <CollectionGrid records={records.filter((record) => record.kind === "artwork")} locale={locale} /> },
  ]} /></div>;
}
