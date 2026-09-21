import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Metadata } from "next";
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
import "@/styles/home-expanded.css";

export type CollectionSection = "library" | "boardgame" | "goods";

export const collectionCopy = {
  ko: {
    title: "컬렉션",
    introduction: "센터에서 만나는 책과 보드게임, 매거진과 작품.",
    all: "전체",
    book: "도서",
    goods: "굿즈",
    artwork: "작품",
    boardgame: "보드게임",
    magazine: "매거진",
    empty: "아직 공개된 자료가 없습니다.",
    view: "자세히 보기",
    back: "컬렉션으로",
  },
  en: {
    title: "Collection",
    introduction:
      "Books, board games, magazines and artworks at Bitcoin Center Seoul.",
    all: "All",
    book: "Books",
    goods: "Goods",
    artwork: "Art",
    boardgame: "Board games",
    magazine: "Magazines",
    empty: "No items have been published yet.",
    view: "View details",
    back: "Back to collection",
  },
} as const;

export const boardGameCopy = {
  ko: {
    title: "보드게임",
    introduction: "센터에 비치된 보드게임입니다. 방문해서 즐길 수 있습니다.",
    empty: "아직 등록된 보드게임이 없습니다.",
    view: collectionCopy.ko.view,
    back: "보드게임으로",
  },
  en: {
    title: "Board games",
    introduction: "Board games kept at the center.",
    empty: "No board games have been added yet.",
    view: collectionCopy.en.view,
    back: "Back to board games",
  },
} as const;

export const goodsCopy = {
  ko: { title: "비센서 굿즈", introduction: "비트코인을 일상 가까이. 센터 굿즈와 구매 안내.", back: "굿즈로" },
  en: { title: "Center goods", introduction: "Keep Bitcoin close in everyday life. Center goods and purchasing information.", back: "Back to goods" },
} as const;

export function PurchaseLink({ record, locale }: { readonly record: CollectionRecord; readonly locale: Locale }) {
  if (record.soldOut) return <button type="button" className="button collection-sold-out" disabled aria-disabled="true">{locale === "ko" ? "품절" : "Sold out"}</button>;
  if (!record.purchaseUrl) return null;
  return <a className="button" data-variant="primary" href={record.purchaseUrl} target="_blank" rel="noopener noreferrer">
    {locale === "ko" ? "구매하기" : "Buy"}<ArrowUpRight className="icon" aria-hidden="true" />
    <span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span>
  </a>;
}

const sectionCopy = (locale: Locale, section: CollectionSection) =>
  section === "boardgame" ? boardGameCopy[locale] : section === "goods" ? goodsCopy[locale] : collectionCopy[locale];
const sectionPath = (section: CollectionSection) =>
  section === "boardgame" ? "/experience/board-game" : section === "goods" ? "/goods" : "/collection";
const recordSection = (record: CollectionRecord): CollectionSection =>
  record.kind === "boardgame" ? "boardgame" : record.kind === "goods" ? "goods" : "library";
export const collectionHref = (record: CollectionRecord) =>
  `${sectionPath(recordSection(record))}/${record.slug || record.id}`;

export function collectionText(locale: Locale, record: CollectionRecord) {
  return {
    title: locale === "en" ? record.titleEn || record.title : record.title,
    creator:
      locale === "en" ? record.creatorEn || record.creator : record.creator,
    description:
      locale === "en"
        ? record.descriptionEn || record.description
        : record.description,
  };
}

export function collectionMetadata(
  locale: Locale,
  section: CollectionSection,
  record?: CollectionRecord,
): Metadata {
  const copy = sectionCopy(locale, record ? recordSection(record) : section);
  const content = record ? collectionText(locale, record) : copy;
  const title = content.title;
  const description = record
    ? markdownExcerpt(collectionText(locale, record).description) ||
      `${title} | ${copy.title}`
    : copy.introduction;
  const path = `${sectionPath(record ? recordSection(record) : section)}${record ? `/${record.slug || record.id}` : ""}`;
  const base = pageMetadata(locale, "experience");
  const images = record?.images[0]
    ? [{ url: record.images[0], alt: title }]
    : undefined;
  return {
    ...base,
    title: `${title} | Bitcoin Center Seoul`,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ko: `/ko${path}`,
        en: `/en${path}`,
        "x-default": `/ko${path}`,
      },
    },
    openGraph: {
      ...base.openGraph,
      title,
      description,
      url: `/${locale}${path}`,
      ...(images ? { images } : {}),
    },
    twitter: {
      ...base.twitter,
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export function CollectionFrame({
  locale,
  section,
  title,
  detail = false,
  children,
}: {
  readonly locale: Locale;
  readonly section: CollectionSection;
  readonly title: string;
  readonly detail?: boolean;
  readonly children: ReactNode;
}) {
  const copy = sectionCopy(locale, section);
  return (
    <>
      <SiteHeader locale={locale} section={section === "goods" ? "goods" : "collection"} />
      <main
        id="main"
        tabIndex={-1}
        className={`container detail-page ${detail ? "event-page" : "detail-journal"}`}
      >
        <ContentLink
          href={detail ? sectionPath(section) : "/experience"}
          locale={locale}
          className="button event-back"
          data-variant="secondary"
        >
          <ArrowLeft className="icon" aria-hidden="true" />
          {detail
            ? copy.back
            : locale === "ko"
              ? "전시·체험으로"
              : "Back to exhibitions"}
        </ContentLink>
        <div className="detail-heading">
          <h1>{title}</h1>
          {!detail && <p className="body-copy muted">{copy.introduction}</p>}
        </div>
        {detail ? children : <div className="journal-results">{children}</div>}
        <PageMotion pageKey={`${locale}-collection-${title}`} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

export function CollectionGrid({
  records,
  locale,
  empty,
}: {
  readonly records: readonly CollectionRecord[];
  readonly locale: Locale;
  readonly empty?: string;
}) {
  const copy = collectionCopy[locale];
  if (!records.length)
    return <p className="catalog-empty muted">{empty ?? copy.empty}</p>;
  return (
    <div className="review-grid highlights-grid">
      {records.map((record) => {
        const content = collectionText(locale, record);
        const excerpt = markdownExcerpt(content.description);
        const meta =
          record.kind === "boardgame"
            ? ""
            : [copy[record.kind], content.creator].filter(Boolean).join(" · ");
        return (
          <article className="review-card highlight-card collection-card" key={record.id}>
            <ContentLink
              href={collectionHref(record)}
              locale={locale}
              className="review-card-link highlight-card-link"
            >
              {record.images[0] && (
                <span className="review-card-image highlight-card-photo collection-card-photo">
                  <Image
                    src={record.images[0]}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    unoptimized
                  />
                </span>
              )}
              <div className="review-card-content highlight-card-copy">
                <h2 lang={locale === "en" && !record.titleEn ? "ko" : locale}>
                  {content.title}
                </h2>
                {excerpt && (
                  <p className="review-card-summary highlight-card-summary">
                    {excerpt}
                  </p>
                )}
                <div className="review-card-end">
                  {meta ? <p>{meta}</p> : <span />}
                  <span className="review-read">
                    {copy.view}
                    <ArrowRight className="icon" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </ContentLink>
            {(record.purchaseUrl || record.soldOut) && <div className="collection-purchase"><PurchaseLink record={record} locale={locale} /></div>}
          </article>
        );
      })}
    </div>
  );
}

export function CollectionGallery({
  records,
  locale,
  kind = "all",
}: {
  readonly records: readonly CollectionRecord[];
  readonly locale: Locale;
  readonly kind?: string;
}) {
  const copy = collectionCopy[locale];
  const filters = ["all", "boardgame", "book", "magazine", "artwork"] as const;
  const selected = filters.some((value) => value === kind) ? kind : "all";
  return (
    <div className="collection-browser">
      <nav
        className="collection-filters"
        aria-label={locale === "ko" ? "컬렉션 종류" : "Collection type"}
      >
        {filters.map((value) => (
          <ContentLink
            key={value}
            href={value === "all" ? "/collection" : `/collection?kind=${value}`}
            locale={locale}
            className="button"
            data-variant="quiet"
            aria-current={selected === value ? "page" : undefined}
          >
            {copy[value]}
          </ContentLink>
        ))}
      </nav>
      {selected === "magazine" ? (
        <p className="catalog-empty muted">
          {locale === "ko"
            ? "매거진 목록 준비 중"
            : "Magazine list coming soon"}
        </p>
      ) : (
        <CollectionGrid
          records={
            selected === "all"
              ? records
              : records.filter((record) => record.kind === selected)
          }
          locale={locale}
        />
      )}
    </div>
  );
}
