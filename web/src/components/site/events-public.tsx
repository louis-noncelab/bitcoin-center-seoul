import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { OriginalPhoto } from "./original-photo";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { markdownExcerpt } from "@/lib/markdown";
import { ContentLink } from "@/components/controls/content-link";
import { MarkdownContent } from "@/components/site/markdown-content";
import { ContentTags } from "@/components/site/content-tags";
import { EventsCalendar } from "@/components/site/events-calendar";
import { EventBookingLink } from "@/components/site/event-booking-link";
import { eventBookingHref } from "@/lib/event-booking";
import { eventListLocation, eventTimeZoneLabel } from "@/lib/event-location";
import { seoulDate } from "@/lib/center-status";
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
  const location = event.isOnline ? (locale === "en" ? "Online" : "온라인") : text(locale, event.location, event.locationEn);
  return (
    <div className="event-meta">
      {event.date && <span><CalendarDays className="icon" aria-hidden="true" />{dateLabel(event.date, locale)}</span>}
      {event.time && <span><Clock3 className="icon" aria-hidden="true" /><span>{event.time} <span className="muted">{eventTimeZoneLabel(locale)}</span></span></span>}
      {location && <span><MapPin className="icon" aria-hidden="true" />{location}</span>}
      {event.isOnline && <span className="muted">{locale === "en" ? "The join link arrives after payment, on the confirmation page and in the email." : "참여 링크는 결제 후 확인 페이지와 메일로 보내 드립니다."}</span>}
    </div>
  );
}

function HighlightMeta({ highlight, locale, compact = false }: { readonly highlight: HighlightRecord; readonly locale: Locale; readonly compact?: boolean }) {
  const start = highlight.startDate || highlight.date;
  const end = highlight.endDate;
  const normalizedStart = start.replaceAll(".", "-");
  const normalizedEnd = end?.replaceAll(".", "-") ?? "";
  const compactDate = (value: string) => value.replaceAll("-", ".");
  const period = compact
    ? [compactDate(normalizedStart), normalizedEnd && normalizedEnd !== normalizedStart ? compactDate(normalizedEnd).replace(`${normalizedStart.slice(0, 4)}.`, "") : ""].filter(Boolean).join("–")
    : [dateLabel(start, locale), normalizedEnd && normalizedEnd !== normalizedStart ? dateLabel(end, locale) : ""].filter(Boolean).join(" – ");
  return (
    <p className="caption muted">
      {[text(locale, highlight.category, highlight.categoryEn), period, compact ? "" : text(locale, highlight.host, highlight.hostEn)].filter(Boolean).join(" · ")}
    </p>
  );
}

export function EventsCatalog({ events, locale, today, paymentHrefs = {} }: { readonly events: readonly EventRecord[]; readonly locale: Locale; readonly today: string; readonly paymentHrefs?: Readonly<Record<number, string | undefined>> }) {
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
        <p className="caption muted">{locale === "ko" ? `행사 일정은 ${eventTimeZoneLabel(locale)} 기준입니다.` : `Event times are shown in ${eventTimeZoneLabel(locale)}.`}</p>
        <EventGroup id="upcoming-events" days={upcoming} locale={locale} today={today} paymentHrefs={paymentHrefs} title={locale === "ko" ? "다가오는 행사" : "Upcoming events"} empty={locale === "ko" ? "예정된 행사가 없습니다." : "There are no upcoming events."} />
        {past.length > 0 && <EventGroup id="past-events" days={past} locale={locale} today={today} paymentHrefs={paymentHrefs} title={locale === "ko" ? "지난 행사" : "Past events"} />}
      </div>
    </div>
  );
}

function EventGroup({ id, days, locale, today, title, empty, paymentHrefs }: { readonly id: string; readonly days: readonly { readonly date: string; readonly events: readonly EventRecord[] }[]; readonly locale: Locale; readonly today: string; readonly title: string; readonly empty?: string; readonly paymentHrefs: Readonly<Record<number, string | undefined>> }) {
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
              const location = eventListLocation(event, locale);
              const images = galleryImages(event);
              return (
                <li key={event.id}>
                  <ContentLink href={`/programs/${event.slug || event.id}`} locale={locale} className="event-card">
                    <span className="event-card-time">{event.time}</span>
                    <span className="event-card-copy">
                      <strong>{titleText}</strong>
                      {location && <span className="event-card-location muted"><MapPin className="icon" aria-hidden="true" />{location}</span>}
                    </span>
                    {images[0] && <span className="event-card-photo"><OriginalPhoto src={images[0]} alt="" crop /></span>}
                  </ContentLink>
                  <EventBookingLink event={event} locale={locale} today={today} paymentHref={paymentHrefs[event.id]} />
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
    <div className="review-grid highlights-grid">
      {shown.map((highlight) => {
        const title = text(locale, highlight.title, highlight.titleEn);
        const images = galleryImages(highlight);
        return (
          <article className={`review-card highlight-card${preview ? " review-card-compact" : ""}`} key={highlight.id} data-reveal-part={preview ? "" : undefined}>
            <ContentLink href={`/journal/${highlight.slug || highlight.id}`} locale={locale} className="review-card-link highlight-card-link">
              {images[0] && <span className="review-card-image highlight-card-photo"><OriginalPhoto src={images[0]} alt="" crop /></span>}
              <div className="review-card-content highlight-card-copy">
                <Title>{title}</Title>
                <p className="review-card-summary highlight-card-summary">{markdownExcerpt(text(locale, highlight.description, highlight.descriptionEn))}</p>
                <div className="review-card-end"><HighlightMeta highlight={highlight} locale={locale} compact /><span className="review-read">{locale === "ko" ? "자세히 보기" : "View details"}<ArrowRight className="icon" aria-hidden="true" /></span></div>
              </div>
            </ContentLink>
          </article>
        );
      })}
      {shown.length === 0 && <p className="catalog-empty muted">{locale === "ko" ? "공개된 현장 스케치가 없습니다." : "No highlights have been published yet."}</p>}
    </div>
  );
}

export function EventDetail({ event, locale, today = seoulDate(), paymentHref }: { readonly event: EventRecord; readonly locale: Locale; readonly today?: string; readonly paymentHref?: string | undefined }) {
  const title = text(locale, event.title, event.titleEn);
  const link = externalHref(event.link);
  return (
    <article className="event-detail">
      <EventMeta event={event} locale={locale} />
      <EventBookingLink event={event} locale={locale} today={today} paymentHref={paymentHref} />
      <PhotoGallery images={galleryImages(event)} title={title} locale={locale} />
      <ContentTags tags={event.tags} locale={locale} />
      <MarkdownContent lang={locale === "en" && !event.descriptionEn ? "ko" : locale}>{text(locale, event.description, event.descriptionEn)}</MarkdownContent>
      {link && !event.registrationClosed && !eventBookingHref(link, event.date, today) && <a href={link} target="_blank" rel="noopener noreferrer" className="source-link">{locale === "ko" ? "행사 링크 보기" : "View event link"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
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
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="source-link">{locale === "ko" ? "원문 보기" : "Read the original"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a>}
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
            <OriginalPhoto src={image} alt={`${title} ${locale === "ko" ? "사진" : "photo"} ${index + 1}`} />
          </figure>
        ))}
      </div>
    </div>
  );
}
