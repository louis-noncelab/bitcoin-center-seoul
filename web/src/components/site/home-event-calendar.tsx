"use client";

import { ArrowRight, CalendarDays, List, Clock3, MapPin } from "lucide-react";
import { useId, useState } from "react";
import { ContentLink } from "@/components/controls/content-link";
import { EventBookingLink } from "@/components/site/event-booking-link";
import { Calendar } from "@/components/ui/calendar";
import type { Locale } from "@/i18n/routing";
import type { HomeEvent } from "@/lib/home-events";
import "@/styles/home-event-calendar.css";

type Props = {
  readonly events: readonly HomeEvent[];
  readonly locale: Locale;
  readonly today: string;
};

export function HomeEventCalendar({ events, locale, today }: Props) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7));
  const titleId = useId();
  const resultsId = useId();
  const currentMonth = today.slice(0, 7);
  const dateCounts = new Map<string, number>();
  for (const event of events)
    dateCounts.set(event.date, (dateCounts.get(event.date) ?? 0) + 1);
  const dates = [...dateCounts].map(([date, count]) => ({ date, count }));
  const selectedEvents = events
    .filter((event) =>
      view === "list"
        ? event.date.startsWith(visibleMonth)
        : event.date === selectedDate,
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const selectedLabel =
    view === "list"
      ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
          year: "numeric",
          month: "long",
          timeZone: "UTC",
        }).format(new Date(`${visibleMonth}-01T00:00:00Z`))
      : new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
          month: "long",
          day: "numeric",
          weekday: "long",
          timeZone: "UTC",
        }).format(new Date(`${selectedDate}T00:00:00Z`));
  const countLabel =
    locale === "ko"
      ? `행사 ${selectedEvents.length}개`
      : `${selectedEvents.length} ${selectedEvents.length === 1 ? "event" : "events"}`;

  function selectMonth(month: string) {
    setVisibleMonth(month);
    const firstEventDate = dates
      .map(({ date }) => date)
      .filter((date) => date.startsWith(month))
      .sort()[0];
    setSelectedDate(
      month === currentMonth ? today : (firstEventDate ?? `${month}-01`),
    );
  }

  return (
    <section
      className="home-event-calendar section-frame"
      id="home-calendar"
      aria-labelledby={titleId}
    >
      <div className="home-calendar-heading">
        <h2 className="home-section-title" id={titleId}>
          {locale === "ko" ? "행사 일정" : "What's on"}
        </h2>
        <div
          className="home-calendar-switch"
          role="group"
          aria-label={locale === "ko" ? "일정 보기 방식" : "Schedule view"}
        >
          <button
            type="button"
            aria-label={locale === "ko" ? "달력 보기" : "Calendar view"}
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={locale === "ko" ? "목록 보기" : "List view"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="home-calendar-layout" data-view={view}>
        <div className="home-calendar-month">
          <Calendar
            locale={locale}
            today={today}
            selected={selectedDate}
            onSelect={setSelectedDate}
            markedDates={dates}
            allowUnmarkedDates
            onMonthChange={selectMonth}
          />
          <p className="home-calendar-legend muted">
            <span aria-hidden="true" />
            {locale === "ko" ? "행사가 있는 날" : "An event is scheduled"}
          </p>
        </div>
        <div className="home-calendar-results-column">
          <div
            className="home-calendar-results"
            role="region"
            aria-labelledby={resultsId}
          >
            <div
              className="home-calendar-date-heading"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 id={resultsId}>
                <time dateTime={view === "list" ? visibleMonth : selectedDate}>
                  {selectedLabel}
                </time>
              </h3>
              <span className="muted">{countLabel}</span>
            </div>
            {selectedEvents.length > 0 ? (
              <ul className="home-calendar-event-list">
                {selectedEvents.map((event) => {
                  const title =
                    locale === "en" && event.titleEn
                      ? event.titleEn
                      : event.title;
                  const location =
                    locale === "en" && event.locationEn
                      ? event.locationEn
                      : event.location;
                  return (
                    <li key={event.id}>
                      <ContentLink
                        className="home-calendar-event"
                        href={`/programs/${event.slug || event.id}`}
                        locale={locale}
                      >
                        <span className="home-calendar-event-copy">
                          <span className="home-calendar-event-time">
                            <Clock3 className="icon" aria-hidden="true" />
                            {view === "list" && (
                              <time dateTime={event.date}>
                                {event.date.slice(5).replace("-", ".")}
                              </time>
                            )}
                            {event.time}
                          </span>
                          <strong>{title}</strong>
                          {location && (
                            <span className="home-calendar-event-location muted">
                              <MapPin className="icon" aria-hidden="true" />
                              {location}
                            </span>
                          )}
                        </span>
                        <ArrowRight
                          className="icon home-calendar-event-arrow"
                          aria-hidden="true"
                        />
                      </ContentLink>
                      <EventBookingLink
                        event={event}
                        locale={locale}
                        today={today}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="home-calendar-empty muted">
                {view === "list"
                  ? locale === "ko"
                    ? "이번 달은 등록된 행사가 없어요."
                    : "No events are scheduled for this month."
                  : locale === "ko"
                    ? "이날은 등록된 행사가 없어요."
                    : "No events are scheduled for this date."}
              </p>
            )}
          </div>
          <ContentLink
            href="/programs#events"
            locale={locale}
            className="section-link home-calendar-all"
          >
            {locale === "ko" ? "전체 일정 보기" : "View all events"}
            <ArrowRight className="icon" aria-hidden="true" />
          </ContentLink>
        </div>
      </div>
    </section>
  );
}
