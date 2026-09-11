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
import "@/styles/reviews.css";
import "@/styles/collection.css";

export type CollectionSection = "library" | "boardgame";

export const collectionCopy = {
  ko: { title: "도서·작품", introduction: "센터의 도서와 작품을 둘러보세요.", all: "전체", book: "도서", artwork: "작품", boardgame: "보드게임", empty: "아직 등록된 도서·작품이 없습니다.", view: "자세히 보기", back: "도서·작품으로" },
  en: { title: "Books & art", introduction: "Explore the books and artworks in the library and exhibitions at Bitcoin Center Seoul.", all: "All", book: "Books", artwork: "Art", boardgame: "Board games", empty: "No books or artworks have been added yet.", view: "View details", back: "Back to books & art" },
} as const;

export const boardGameCopy = {
  ko: { title: "보드게임", introduction: "센터에 비치된 보드게임입니다. 방문해서 즐길 수 있습니다.", empty: "아직 등록된 보드게임이 없습니다.", view: collectionCopy.ko.view, back: "보드게임으로" },
  en: { title: "Board games", introduction: "Board games kept at the center.", empty: "No board games have been added yet.", view: collectionCopy.en.view, back: "Back to board games" },
} as const;

const sectionCopy = (locale: Locale, section: CollectionSection) => (section === "boardgame" ? boardGameCopy[locale] : collectionCopy[locale]);
const sectionPath = (section: CollectionSection) => (section === "boardgame" ? "/experience/board-game" : "/collection");
const recordSection = (record: CollectionRecord): CollectionSection => (record.kind === "boardgame" ? "boardgame" : "library");

export function collectionText(locale: Locale, record: CollectionRecord) {
  return { title: locale === "en" ? record.titleEn || record.title : record.title, creator: locale === "en" ? record.creatorEn || record.creator : record.creator, description: locale === "en" ? record.descriptionEn || record.description : record.description };
}

export function collectionMetadata(locale: Locale, section: CollectionSection, record?: CollectionRecord): Metadata {
  const copy = sectionCopy(locale, record ? recordSection(record) : section);
  const content = record ? collectionText(locale, record) : copy;
  const title = content.title;
  const description = record ? markdownExcerpt(collectionText(locale, record).description) || `${title} | ${copy.title}` : copy.introduction;
  const path = `${sectionPath(record ? recordSection(record) : section)}${record ? `/${record.id}` : ""}`;
  const base = pageMetadata(locale, "experience");
  const images = record?.images[0] ? [{ url: record.images[0], alt: title }] : undefined;
  return { ...base, title: `${title} | Bitcoin Center Seoul`, description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, title, description, url: `/${locale}${path}`, ...(images ? { images } : {}) },
    twitter: { ...base.twitter, title, description, ...(images ? { images } : {}) },
  };
}

export function CollectionFrame({ locale, section, title, detail = false, children }: { readonly locale: Locale; readonly section: CollectionSection; readonly title: string; readonly detail?: boolean; readonly children: ReactNode }) {
  const copy = sectionCopy(locale, section);
  return <><SiteHeader locale={locale} section="experience" /><main id="main" tabIndex={-1} className={`container detail-page ${detail ? "event-page" : "detail-journal"}`}>
    <ContentLink href={detail ? sectionPath(section) : "/experience"} locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{detail ? copy.back : locale === "ko" ? "전시·체험으로" : "Back to exhibitions"}</ContentLink>
    <div className="detail-heading"><h1>{title}</h1>{!detail && <p className="body-copy muted">{copy.introduction}</p>}</div>
    {detail ? children : <div className="journal-results">{children}</div>}
    <PageMotion pageKey={`${locale}-collection-${title}`} />
  </main><SiteFooter locale={locale} /></>;
}

export function CollectionGrid({ records, locale, empty }: { readonly records: readonly CollectionRecord[]; readonly locale: Locale; readonly empty?: string }) {
  const copy = collectionCopy[locale];
  if (!records.length) return <p className="catalog-empty muted">{empty ?? copy.empty}</p>;
  return <div className="review-grid highlights-grid">{records.map((record) => {
    const content = collectionText(locale, record);
    const excerpt = markdownExcerpt(content.description);
    const meta = record.kind === "boardgame" ? "" : [copy[record.kind], content.creator].filter(Boolean).join(" · ");
    return <article className="review-card highlight-card" key={record.id}>
      <ContentLink href={`${sectionPath(recordSection(record))}/${record.id}`} locale={locale} className="review-card-link highlight-card-link">
        {record.images[0] && <span className="review-card-image highlight-card-photo collection-card-photo"><Image src={record.images[0]} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" unoptimized /></span>}
        <div className="review-card-content highlight-card-copy">
          <h2 lang={locale === "en" && !record.titleEn ? "ko" : locale}>{content.title}</h2>
          {excerpt && <p className="review-card-summary highlight-card-summary">{excerpt}</p>}
          <div className="review-card-end">{meta ? <p>{meta}</p> : <span />}<span className="review-read">{copy.view}<ArrowRight className="icon" aria-hidden="true" /></span></div>
        </div>
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
