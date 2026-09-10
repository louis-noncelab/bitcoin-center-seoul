"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import type { Locale } from "@/i18n/routing";

type Props = {
  readonly dates: readonly { readonly date: string; readonly count: number }[];
  readonly locale: Locale;
  readonly today: string;
};

export function EventsCalendar({ dates, locale, today }: Props) {
  const currentMonth = today.slice(0, 7);
  const [selectedDate, setSelectedDate] = useState("");
  const months = [currentMonth, ...dates.map(({ date }) => date.slice(0, 7))].sort();

  function selectDate(date: string) {
    const heading = document.getElementById(`events-on-${date}`);
    if (!heading) return;
    setSelectedDate(date);
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <aside className="events-calendar" aria-label={locale === "ko" ? "행사 달력" : "Event calendar"}>
      <h2>{locale === "ko" ? "날짜로 찾아보기" : "Browse by date"}</h2>
      <Calendar locale={locale} today={today} selected={selectedDate} onSelect={selectDate} markedDates={dates} minMonth={months[0] ?? currentMonth} maxMonth={months.at(-1) ?? currentMonth} />
      <p className="events-calendar-note muted">{locale === "ko" ? "행사가 있는 날짜를 누르면 목록으로 이동합니다." : "Select a marked date to view its events."}</p>
    </aside>
  );
}
