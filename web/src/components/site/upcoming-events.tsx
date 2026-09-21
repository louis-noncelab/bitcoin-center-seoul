"use client";

import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ContentLink } from "@/components/controls/content-link";
import { EventBookingLink } from "@/components/site/event-booking-link";
import { CenterPhoto } from "@/components/site/center-photo";
import type { Locale } from "@/i18n/routing";
import type { HomeEvent } from "@/lib/home-events";
import { eventListLocation } from "@/lib/event-location";
import { eventBookingHref } from "@/lib/event-booking";
import "@/styles/home-upcoming.css";

type Props = {
  readonly events: readonly HomeEvent[];
  readonly locale: Locale;
  readonly today: string;
};

export function UpcomingEvents({ events, locale, today }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const ko = locale === "ko";
  const multiple = events.length > 1;
  const hasToday = events.some((event) => event.date === today);
  const dateFormat = new Intl.DateTimeFormat(ko ? "ko-KR" : "en-GB", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  });

  function syncPosition() {
    const element = track.current;
    if (!element) return;
    const lastPosition = element.scrollWidth - element.clientWidth;
    setAtEnd(element.scrollLeft >= lastPosition - 2);
    if (lastPosition <= 1) {
      setActive(0);
      return;
    }
    const start =
      element.getBoundingClientRect().left +
      parseFloat(getComputedStyle(element).paddingLeft);
    const distances = Array.from(element.children, (child) =>
      Math.abs(child.getBoundingClientRect().left - start),
    );
    setActive(distances.indexOf(Math.min(...distances)));
  }

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      element.dispatchEvent(new Event("scroll")),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function show(index: number, focus = false, preferBooking = false) {
    const element = track.current;
    const item = element?.children.item(index) as HTMLLIElement | null;
    if (!element || !item) return;
    const left =
      item.getBoundingClientRect().left -
      element.getBoundingClientRect().left +
      element.scrollLeft -
      parseFloat(getComputedStyle(element).paddingLeft);
    element.scrollTo({
      left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    if (focus) {
      const target = preferBooking
        ? item.querySelector<HTMLAnchorElement>(".event-booking-link")
        : null;
      (
        target ?? item.querySelector<HTMLAnchorElement>(".upcoming-card")
      )?.focus({ preventScroll: true });
    }
  }

  if (events.length === 0) return null;

  return (
    <section
      className="home-upcoming container"
      aria-labelledby="home-upcoming-title"
      aria-roledescription={multiple ? (ko ? "캐러셀" : "carousel") : undefined}
    >
      <span className="upcoming-curve" aria-hidden="true" />
      <div className="upcoming-heading">
        <h2 id="home-upcoming-title">{ko ? "다가오는 행사" : "Coming up"}</h2>
        <a
          href="#home-calendar"
          className="section-link upcoming-calendar-link"
        >
          {ko ? "전체 일정" : "All events"}
          <ArrowUpRight className="icon" aria-hidden="true" />
        </a>
      </div>
      <ul
        ref={track}
        id="upcoming-events-track"
        className="upcoming-track"
        data-single={!multiple}
        onScroll={syncPosition}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
          const focused = Array.from(event.currentTarget.children).findIndex(
            (child) => child.contains(event.target as Node),
          );
          const current = focused < 0 ? active : focused;
          const index =
            event.key === "ArrowRight"
              ? Math.min(current + 1, events.length - 1)
              : event.key === "ArrowLeft"
                ? Math.max(current - 1, 0)
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? events.length - 1
                    : null;
          if (index !== null) {
            event.preventDefault();
            show(
              index,
              true,
              event.target instanceof Element &&
                Boolean(event.target.closest(".event-booking-link")),
            );
          }
        }}
      >
        {events.map((event, index) => {
          const title = ko ? event.title : event.titleEn || event.title;
          const location = eventListLocation(event, locale);
          const booking = eventBookingHref(event.link, event.date, today, event.registrationClosed);
          return (
            <li
              className="upcoming-slide"
              key={event.id}
              data-bookable={Boolean(booking) || event.registrationClosed}
            >
              <ContentLink
                className="upcoming-card"
                href={`/programs/${event.slug || event.id}`}
                locale={locale}
              >
                <div className="upcoming-image">
                  {event.image ? (
                    <Image
                      src={event.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 767px) 90vw, (max-width: 1199px) 48vw, (max-width: 1799px) 34vw, 560px"
                      loading={index === 0 ? "eager" : "lazy"}
                      onLoad={(loaded) => {
                        const image = loaded.currentTarget;
                        image.style.objectFit =
                          image.naturalWidth / image.naturalHeight > 1.3
                            ? "cover"
                            : "contain";
                      }}
                    />
                  ) : (
                    <>
                      <CenterPhoto
                        name="lounge"
                        locale={locale}
                        sizes="(max-width: 767px) 90vw, (max-width: 1199px) 48vw, (max-width: 1799px) 34vw, 560px"
                      />
                      <span className="upcoming-photo-caption">
                        {ko ? "센터 공간 사진" : "Center space"}
                      </span>
                    </>
                  )}
                </div>
                <div className="upcoming-copy">
                  {hasToday && (
                    <div className="upcoming-status">
                      {event.date === today && (
                        <span className="upcoming-today">
                          {ko ? "오늘 만나요" : "Today"}
                        </span>
                      )}
                    </div>
                  )}
                  <h3>{title}</h3>
                  <div className="upcoming-date">
                    <time dateTime={event.date}>
                      {dateFormat.format(new Date(`${event.date}T00:00:00Z`))}
                    </time>
                    {event.time && <span>{event.time}</span>}
                  </div>
                  {location && <div className="upcoming-meta"><span>{location}</span></div>}
                  <span className="upcoming-details">
                    {ko ? "자세히 보기" : "View details"}
                    <ArrowUpRight className="icon" aria-hidden="true" />
                  </span>
                </div>
              </ContentLink>
              <EventBookingLink
                event={event}
                locale={locale}
                today={today}
                className="upcoming-booking"
              />
            </li>
          );
        })}
      </ul>
      {multiple && (
        <div className="upcoming-controls">
          <span className="upcoming-count" aria-hidden="true">
            <strong>{String(active + 1).padStart(2, "0")}</strong>
            <span className="upcoming-count-line" />
            {String(events.length).padStart(2, "0")}
          </span>
          <div className="upcoming-arrows">
            <button
              type="button"
              className="upcoming-arrow"
              aria-label={ko ? "이전 행사" : "Previous event"}
              aria-controls="upcoming-events-track"
              disabled={active === 0}
              onClick={() => show(active - 1)}
            >
              <ChevronLeft className="icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="upcoming-arrow"
              aria-label={ko ? "다음 행사" : "Next event"}
              aria-controls="upcoming-events-track"
              disabled={atEnd}
              onClick={() => show(active + 1)}
            >
              <ChevronRight className="icon" aria-hidden="true" />
            </button>
          </div>
          <p className="sr-only" role="status">
            {ko
              ? `${events.length}개 중 ${active + 1}번째 행사`
              : `Event ${active + 1} of ${events.length}`}
          </p>
        </div>
      )}
    </section>
  );
}
