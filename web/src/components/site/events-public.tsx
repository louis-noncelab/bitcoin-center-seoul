import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import Image from "next/image";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { markdownExcerpt } from "@/lib/markdown";
import { ContentLink } from "@/components/controls/content-link";
import { MarkdownContent } from "@/components/site/markdown-content";
import { ContentTags } from "@/components/site/content-tags";
import { EventsCalendar } from "@/components/site/events-calendar";
import type { Locale } from "@/i18n/routing";

function text(locale: Locale, korean: string, english: string) {
  return locale === "ko" ? korean : english || korean;
}

function dateLabel(value: string, locale: Locale, full = false) {
  if (!value) return "";
  const parsed = new Date(`${value.replaceAll(".", "-")}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
    dateStyle: full ? "full" : "long",
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
  const byDate = new Map<string, EventRecord[]>();
  for (const event of events) {
    const date = event.date.trim().replaceAll(".", "-");
    const group = byDate.get(date);
    if (group) group.push(event);
    else byDate.set(date, [event]);
  }
  const days = [...byDate].sort(([left], [right]) => left.localeCompare(right)).map(([date, records]) => ({
    date, events: records.sort((left, right) => left.time.localeCompare(right.time) || left.id - right.id),
  }));
  const upcoming = days.filter(({ date }) => date >= today);
  const past = days.filter(({ date }) => date < today).reverse();
  return (
    <div className="events-catalog" id="events">
      <EventsCalendar dates={days.map(({ date, events }) => ({ date, count: events.length }))} locale={locale} today={today} />
      <div className="events-timeline">
        <EventGroup id="upcoming-events" days={upcoming} locale={locale} title={locale === "ko" ? "다가오는 행사" : "Upcoming events"} empty={locale === "ko" ? "예정된 행사가 없습니다." : "There are no upcoming events."} />
        {past.length > 0 && <EventGroup id="past-events" days={past} locale={locale} title={locale === "ko" ? "지난 행사" : "Past events"} />}
      </div>
    </div>
  );
}

function EventGroup({ id, days, locale, title, empty }: { readonly id: string; readonly days: readonly { readonly date: string; readonly events: readonly EventRecord[] }[]; readonly locale: Locale; readonly title: string; readonly empty?: string }) {
  return (
    <section className="catalog-group" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {days.length === 0 && <p className="catalog-empty muted">{empty}</p>}
      {days.map(({ date, events }) => (
        <section className="event-date-group" key={date} aria-labelledby={`events-on-${date}`}>
          <h3 id={`events-on-${date}`} tabIndex={-1}><time dateTime={date}>{dateLabel(date, locale, true)}</time></h3>
          <ul className="event-card-list">
            {events.map((event) => {
              const titleText = text(locale, event.title, event.titleEn);
              const location = text(locale, event.location, event.locationEn);
              const images = galleryImages(event);
              return (
                <li key={event.id}>
                  <ContentLink href={`/programs/${event.slug || event.id}`} locale={locale} className="event-card">
                    <span className="event-card-time">{event.time}</span>
                    <span className="event-card-copy">
                      <strong>{titleText}</strong>
                      {location && <span className="event-card-location muted"><MapPin className="icon" aria-hidden="true" />{location}</span>}
                    </span>
                    {images[0] && <span className="event-card-photo"><Image src={images[0]} alt="" fill sizes="(max-width: 767px) 64px, 96px" unoptimized /></span>}
                  </ContentLink>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
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
              <span className="highlight-card-copy"><HighlightMeta highlight={highlight} locale={locale} /><Title>{title}</Title><span className="muted">{markdownExcerpt(text(locale, highlight.description, highlight.descriptionEn))}</span><span className="catalog-read">{locale === "ko" ? "자세히 보기" : "View details"}<ArrowRight className="icon" aria-hidden="true" /></span></span>
            </ContentLink>
          </article>
        );
      })}
      {shown.length === 0 && <p className="catalog-empty muted">{locale === "ko" ? "공개된 현장 스케치가 없습니다." : "No highlights have been published yet."}</p>}
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
      <ContentTags tags={event.tags} locale={locale} />
      <MarkdownContent lang={locale === "en" && !event.descriptionEn ? "ko" : locale}>{text(locale, event.description, event.descriptionEn)}</MarkdownContent>
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="button" data-variant="primary">{locale === "ko" ? "참여하기" : "Join"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
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
      <ContentTags tags={highlight.tags} locale={locale} />
      <MarkdownContent lang={locale === "en" && !highlight.descriptionEn ? "ko" : locale}>{text(locale, highlight.description, highlight.descriptionEn)}</MarkdownContent>
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="button" data-variant="secondary">{locale === "ko" ? "원문 보기" : "Read the original"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
    </article>
  );
}

export function PhotoGallery({ images, title, locale }: { readonly images: readonly string[]; readonly title: string; readonly locale: Locale }) {
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
