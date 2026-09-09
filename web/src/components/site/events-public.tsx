import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import Image from "next/image";
import { Fragment } from "react";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { ContentLink } from "@/components/controls/content-link";
import type { Locale } from "@/i18n/routing";

function text(locale: Locale, korean: string, english: string) {
  return locale === "ko" ? korean : english || korean;
}

function dateLabel(value: string, locale: Locale) {
  if (!value) return "";
  const parsed = new Date(`${value.replaceAll(".", "-")}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
    dateStyle: "long",
    timeZone: "Asia/Seoul",
  }).format(parsed);
}

function externalHref(value: string) {
  if (!value) return undefined;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch (error) {
    if (error instanceof TypeError) return undefined;
    throw error;
  }
}

function galleryImages(record: EventRecord | HighlightRecord) {
  if (record.images.length > 0) return record.images;
  return record.image ? [record.image] : [];
}

function EventMeta({ event, locale }: { readonly event: EventRecord; readonly locale: Locale }) {
  const location = text(locale, event.location, event.locationEn);
  return (
    <div className="event-meta">
      {event.date && <span><CalendarDays className="icon" aria-hidden="true" />{dateLabel(event.date, locale)}</span>}
      {event.time && <span><Clock3 className="icon" aria-hidden="true" />{event.time}</span>}
      {location && <span><MapPin className="icon" aria-hidden="true" />{location}</span>}
    </div>
  );
}

function HighlightMeta({ highlight, locale }: { readonly highlight: HighlightRecord; readonly locale: Locale }) {
  const start = highlight.startDate || highlight.date;
  const end = highlight.endDate;
  const period = [dateLabel(start, locale), end && end !== start ? dateLabel(end, locale) : ""].filter(Boolean).join(" – ");
  return (
    <p className="caption muted">
      {[text(locale, highlight.category, highlight.categoryEn), period, text(locale, highlight.host, highlight.hostEn)].filter(Boolean).join(" · ")}
    </p>
  );
}

export function EventsCatalog({ events, locale, today }: { readonly events: readonly EventRecord[]; readonly locale: Locale; readonly today: string }) {
  const normalizedDate = (event: EventRecord) => event.date.replaceAll(".", "-");
  const upcoming = events
    .filter((event) => normalizedDate(event) >= today)
    .sort((left, right) => normalizedDate(left).localeCompare(normalizedDate(right)) || left.time.localeCompare(right.time) || left.id - right.id);
  const past = events
    .filter((event) => normalizedDate(event) < today)
    .sort((left, right) => normalizedDate(right).localeCompare(normalizedDate(left)) || right.time.localeCompare(left.time) || right.id - left.id);
  return (
    <div className="events-catalog" id="events">
      <EventGroup id="upcoming-events" events={upcoming} locale={locale} title={locale === "ko" ? "다가오는 행사" : "Upcoming events"} empty={locale === "ko" ? "예정된 행사가 없습니다." : "There are no upcoming events."} />
      {past.length > 0 && <EventGroup id="past-events" events={past} locale={locale} title={locale === "ko" ? "지난 행사" : "Past events"} />}
    </div>
  );
}

function EventGroup({ id, events, locale, title, empty }: { readonly id: string; readonly events: readonly EventRecord[]; readonly locale: Locale; readonly title: string; readonly empty?: string }) {
  return (
    <section className="catalog-group" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {events.length === 0 ? <p className="catalog-empty muted">{empty}</p> : (
        <div className="event-card-list">
          {events.map((event) => {
            const titleText = text(locale, event.title, event.titleEn);
            const images = galleryImages(event);
            return (
              <ContentLink key={event.id} href={`/programs/${event.slug || event.id}`} locale={locale} className="event-card">
                {images[0] && <span className="event-card-photo"><Image src={images[0]} alt="" fill sizes="(max-width: 767px) 100vw, 12rem" unoptimized /></span>}
                <span className="event-card-copy">
                  <EventMeta event={event} locale={locale} />
                  <strong>{titleText}</strong>
                  <span className="muted">{text(locale, event.description, event.descriptionEn)}</span>
                </span>
                <ArrowRight className="icon" aria-hidden="true" />
              </ContentLink>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function HighlightsCatalog({ highlights, locale, preview = false }: { readonly highlights: readonly HighlightRecord[]; readonly locale: Locale; readonly preview?: boolean }) {
  const shown = preview ? highlights.slice(0, 3) : highlights;
  const Title = preview ? "h3" : "h2";
  return (
    <div className="highlights-grid">
      {shown.map((highlight) => {
        const title = text(locale, highlight.title, highlight.titleEn);
        const images = galleryImages(highlight);
        return (
          <article className="highlight-card" key={highlight.id} data-reveal-part={preview ? "" : undefined}>
            <ContentLink href={`/journal/${highlight.slug || highlight.id}`} locale={locale} className="highlight-card-link">
              {images[0] && <span className="highlight-card-photo"><Image src={images[0]} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1119px) 50vw, 33vw" unoptimized /></span>}
              <span className="highlight-card-copy"><HighlightMeta highlight={highlight} locale={locale} /><Title>{title}</Title><span className="muted">{text(locale, highlight.description, highlight.descriptionEn)}</span><span className="catalog-read">{locale === "ko" ? "기록 보기" : "Read story"}<ArrowRight className="icon" aria-hidden="true" /></span></span>
            </ContentLink>
          </article>
        );
      })}
      {shown.length === 0 && <p className="catalog-empty muted">{locale === "ko" ? "공개된 활동 기록이 없습니다." : "No activity records have been published yet."}</p>}
    </div>
  );
}

export function EventDetail({ event, locale }: { readonly event: EventRecord; readonly locale: Locale }) {
  const title = text(locale, event.title, event.titleEn);
  const link = externalHref(event.link);
  return (
    <article className="event-detail">
      <PhotoGallery images={galleryImages(event)} title={title} locale={locale} />
      <EventMeta event={event} locale={locale} />
      <p className="event-description">{text(locale, event.description, event.descriptionEn)}</p>
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="button" data-variant="primary">{locale === "ko" ? "외부 안내 열기" : "Open event link"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
    </article>
  );
}

export function HighlightDetail({ highlight, locale }: { readonly highlight: HighlightRecord; readonly locale: Locale }) {
  const title = text(locale, highlight.title, highlight.titleEn);
  const link = externalHref(highlight.link);
  return (
    <article className="event-detail">
      <PhotoGallery images={galleryImages(highlight)} title={title} locale={locale} />
      <HighlightMeta highlight={highlight} locale={locale} />
      <p className="event-description">{text(locale, highlight.description, highlight.descriptionEn)}</p>
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="button" data-variant="secondary">{locale === "ko" ? "원문 보기" : "Read the original"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
    </article>
  );
}

function PhotoGallery({ images, title, locale }: { readonly images: readonly string[]; readonly title: string; readonly locale: Locale }) {
  if (images.length === 0) return null;
  return (
    <div className="photo-gallery">
      <div className="photo-gallery-grid">
        {images.map((image, index) => (
          <figure className="gallery-photo" key={`${image}-${index}`}>
            <Image src={image} alt={`${title} ${locale === "ko" ? "사진" : "photo"} ${index + 1}`} width={1600} height={1200} sizes="(max-width: 767px) 100vw, 760px" unoptimized />
          </figure>
        ))}
      </div>
    </div>
  );
}

export function JournalPagination({ locale, pagination: { page, totalPages } }: { readonly locale: Locale; readonly pagination: { readonly page: number; readonly totalPages: number } }) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((value) => value >= 1 && value <= totalPages).sort((left, right) => left - right);
  const href = (value: number) => value === 1 ? "/journal" : `/journal?page=${value}`;
  return (
    <nav className="journal-pagination" aria-label={locale === "ko" ? "활동 기록 페이지" : "Journal pages"}>
      {page > 1 && <ContentLink href={href(page - 1)} locale={locale} className="button" data-variant="quiet" rel="prev">{locale === "ko" ? "이전" : "Previous"}</ContentLink>}
      {pages.map((value, index) => (
        <Fragment key={value}>
          {index > 0 && value - (pages[index - 1] ?? value) > 1 && <span aria-hidden="true">…</span>}
          <ContentLink href={href(value)} locale={locale} className="button" data-variant="quiet" aria-label={locale === "ko" ? `${value}페이지` : `Page ${value}`} aria-current={value === page ? "page" : undefined}>{value}</ContentLink>
        </Fragment>
      ))}
      {page < totalPages && <ContentLink href={href(page + 1)} locale={locale} className="button" data-variant="quiet" rel="next">{locale === "ko" ? "다음" : "Next"}</ContentLink>}
    </nav>
  );
}
