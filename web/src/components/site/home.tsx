import { ArrowRight, CalendarDays, LibraryBig, MapPin } from "lucide-react";
import { centerContent } from "@/content/center";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { HighlightRecord } from "@/lib/events-contract";
import type { HomeEvent } from "@/lib/home-events";
import type { NewsItem } from "@/lib/news";
import type { CollectionRecord } from "@/lib/collection-contract";
import { UpcomingEvents } from "./upcoming-events";
import { HomeEventCalendar } from "./home-event-calendar";
import { CenterPhoto } from "./center-photo";
import { HomeDiscovery } from "./home-discovery";
import { HomeNews } from "./news-content";
import { PageMotion } from "./page-motion";
import { ReviewsPreview } from "./reviews-preview";
import "@/styles/home-space.css";

export function Home({
  locale,
  highlights,
  news,
  events,
  upcoming,
  today,
  collection,
}: {
  readonly locale: Locale;
  readonly highlights: readonly HighlightRecord[];
  readonly news: readonly NewsItem[];
  readonly events: readonly HomeEvent[];
  readonly upcoming: readonly HomeEvent[];
  readonly today: string;
  readonly collection: readonly CollectionRecord[];
}) {
  const content = centerContent[locale];
  return (
    <main id="main" tabIndex={-1} className="site-main">
      <h1 className="sr-only">{content.hero.title}</h1>
      <UpcomingEvents events={upcoming} locale={locale} today={today} />
      <div className="container">
        <nav
          className="home-quick"
          aria-label={locale === "ko" ? "빠른 메뉴" : "Quick links"}
        >
          <a href="#home-calendar">
            <CalendarDays aria-hidden="true" />
            {locale === "ko" ? "전체 일정" : "All events"}
          </a>
          <Link href="/collection" locale={locale}>
            <LibraryBig aria-hidden="true" />
            {locale === "ko" ? "컬렉션" : "Collection"}
          </Link>
          <Link href="/visit" locale={locale}>
            <MapPin aria-hidden="true" />
            {locale === "ko" ? "방문 안내" : "Visit"}
          </Link>
        </nav>
        <HomeEventCalendar events={events} locale={locale} today={today} />
        <HomeNews items={news} highlights={highlights} locale={locale} />
        <ReviewsPreview locale={locale} />
        <HomeDiscovery collection={collection} locale={locale} />
      </div>
      <section
        className="home-space container"
        aria-labelledby="home-space-title"
        id="home"
      >
        <div className="home-space-heading" id="about">
          <h2 id="home-space-title" className="home-section-title">
            {locale === "ko" ? "공간 둘러보기" : "Inside the center"}
          </h2>
        </div>
        <div className="home-space-layout">
          <figure className="home-space-figure">
            <div className="home-space-collage">
              <CenterPhoto
                name="exhibition"
                locale={locale}
                sizes="(max-width: 767px) 120vw, 90vw"
              />
              <CenterPhoto
                name="lounge"
                locale={locale}
                sizes="(max-width: 767px) 100vw, 60vw"
              />
            </div>
            <figcaption className="sr-only">
              {locale === "ko"
                ? "비트코인 센터 서울의 공간과 강의"
                : "Spaces and classes at Bitcoin Center Seoul"}
            </figcaption>
          </figure>
          <div className="home-space-copy">
            <p className="body-copy muted">{content.hero.introduction}</p>
            <div className="home-space-visit-note muted">
              <span>{content.visit.address.note}</span>
              <span>
                {locale === "ko" ? "운영시간" : "Regular hours"}{" "}
                {content.visit.hours.lines[0]}
              </span>
            </div>
            <div className="home-space-actions">
              <Link
                href="/visit"
                locale={locale}
                className="section-link home-space-visit-action"
              >
                {locale === "ko" ? "방문 안내" : "Visit"}
              </Link>
              <Link
                href="/about#space-tour"
                locale={locale}
                className="section-link"
              >
                {locale === "ko" ? "공간 상세 보기" : "Explore the space"}
                <ArrowRight className="icon" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <PageMotion pageKey={`${locale}-home`} />
    </main>
  );
}
