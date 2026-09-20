import Image from "next/image";
import { ArrowRight, ArrowUpRight, Images, Play } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import { centerVideos } from "@/content/center-videos";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { HighlightRecord } from "@/lib/events-contract";
import { markdownExcerpt } from "@/lib/markdown";
import { mediaHighlights, type NewsItem } from "@/lib/news";
import "@/styles/news.css";

export const newsCopy = {
  ko: {
    title: "비센서 소식", intro: "센터의 공지와 현장 이야기, 사진과 영상을 한곳에서 만나보세요.",
    all: "전체 소식", notices: "공지사항", journal: "현장 스케치", media: "사진과 영상", reviews: "방문 후기",
    recent: "최근 소식", more: "전체 보기", mediaMore: "사진과 영상 더 보기", empty: "아직 공개된 소식이 없습니다.",
    photo: "사진", video: "영상", window: "새 창", archive: "이전 소식도 찾아보세요", nav: "소식 분류",
  },
  en: {
    title: "BCS news", intro: "Updates, stories, photos and videos from Bitcoin Center Seoul.",
    all: "All news", notices: "Notices", journal: "Highlights", media: "Photos & videos", reviews: "Visitor stories",
    recent: "Latest updates", more: "View all", mediaMore: "More photos & videos", empty: "No news has been published yet.",
    photo: "Photo", video: "Video", window: "new window", archive: "Explore earlier stories", nav: "News categories",
  },
} as const;

type NewsView = "all" | "media" | "notices" | "journal" | "reviews";

export function NewsNavigation({ locale, current }: { readonly locale: Locale; readonly current: NewsView }) {
  const t = newsCopy[locale];
  const links = [
    { key: "all", href: "/news" }, { key: "notices", href: "/notices" },
    { key: "journal", href: "/journal" }, { key: "media", href: "/news?view=media" },
    { key: "reviews", href: "/reviews" },
  ] as const;
  return <nav className="news-navigation" aria-label={t.nav}>
    {links.map(({ key, href }) => <Link key={key} href={href} locale={locale} prefetch={false} aria-current={current === key ? "page" : undefined}>{t[key]}</Link>)}
  </nav>;
}

export function NewsList({ items, locale, compact = false }: { readonly items: readonly NewsItem[]; readonly locale: Locale; readonly compact?: boolean }) {
  const t = newsCopy[locale];
  if (!items.length) return <p className="news-empty muted">{t.empty}</p>;
  return <ul className={`news-list${compact ? " news-list-compact" : ""}`}>
    {items.map((item) => {
      const title = locale === "en" ? item.titleEn || item.title : item.title;
      const description = locale === "en" ? item.descriptionEn || item.description : item.description;
      return <li key={item.key}>
        <ContentLink href={item.href} locale={locale} className="news-story-link">
          <span className="news-story-copy">
            <span className="news-story-meta"><span>{item.kind === "notice" ? t.notices : t.journal}</span>{item.date && <time dateTime={item.date}>{item.date.replaceAll("-", ".")}</time>}</span>
            <span className="news-story-title" lang={locale === "en" && !item.titleEn ? "ko" : locale}>{title}</span>
            {!compact && <span className="news-story-summary muted" lang={locale === "en" && !item.descriptionEn ? "ko" : locale}>{markdownExcerpt(description)}</span>}
          </span>
          <ArrowUpRight className="icon" aria-hidden="true" />
        </ContentLink>
      </li>;
    })}
  </ul>;
}

export function NewsMedia({ highlights, locale, preview = false }: { readonly highlights: readonly HighlightRecord[]; readonly locale: Locale; readonly preview?: boolean }) {
  const t = newsCopy[locale];
  const photos = mediaHighlights(highlights, preview ? 3 : 12);
  const videos = preview ? centerVideos.slice(0, Math.max(1, 4 - photos.length)) : centerVideos;
  return <div className={`news-media-grid${preview ? " news-media-preview" : ""}`}>
    {photos.map((record) => {
      const title = locale === "en" ? record.titleEn || record.title : record.title;
      return <article className="news-media-item" key={`photo-${record.id}`}>
        <ContentLink href={`/journal/${record.slug || record.id}`} locale={locale} className="news-media-link">
          <span className="news-media-image"><Image src={record.images[0] || record.image} alt="" fill unoptimized sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 320px" /><span className="news-media-symbol"><Images aria-hidden="true" /></span></span>
          <span className="news-media-title" lang={locale === "en" && !record.titleEn ? "ko" : locale}>{title}</span>
          <span className="news-media-kind muted">{t.photo}</span>
        </ContentLink>
      </article>;
    })}
    {videos.map((video) => <article className="news-media-item" key={`video-${video.id}`}>
      <a className="news-media-link" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
        <span className="news-media-image"><Image src={video.thumbnail} alt="" fill sizes={preview ? "(max-width: 767px) 90vw, 70vw" : "(max-width: 767px) 90vw, (max-width: 1199px) 45vw, 480px"} /><span className="news-media-symbol"><Play aria-hidden="true" /></span></span>
        <span className="news-media-title">{video.title[locale]}</span>
        <span className="news-media-kind muted">{t.video} / YouTube<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only"> ({t.window})</span></span>
      </a>
    </article>)}
  </div>;
}

export function HomeNews({ items, highlights, locale }: { readonly items: readonly NewsItem[]; readonly highlights: readonly HighlightRecord[]; readonly locale: Locale }) {
  const t = newsCopy[locale];
  return <section id="home-news" className="home-news section-frame" aria-labelledby="home-news-title">
    <div className="news-section-heading"><div><p className="news-eyebrow">NEWS & STORIES</p><h2 id="home-news-title">{t.title}</h2></div><Link href="/news" locale={locale} prefetch={false} className="section-link">{t.more}<ArrowUpRight className="icon" aria-hidden="true" /></Link></div>
    {items.length > 0 && <NewsList items={items.slice(0, 2)} locale={locale} compact />}
    <div className="news-media-heading"><h3>{t.media}</h3><span className="news-eyebrow">MEDIA WALL</span></div>
    <NewsMedia highlights={highlights} locale={locale} preview />
    <Link href="/news?view=media" locale={locale} prefetch={false} className="section-link news-media-more">{t.mediaMore}<ArrowRight className="icon" aria-hidden="true" /></Link>
  </section>;
}
