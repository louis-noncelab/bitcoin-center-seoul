"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { SlideRegion } from "./slide-region";
import { FormControl } from "./primitives";

type Props = {
  readonly locale: Locale;
  readonly today: string;
  readonly selected?: string;
  readonly onSelect: (date: string) => void;
  readonly markedDates?: readonly { readonly date: string; readonly count: number }[];
  readonly minMonth?: string;
  readonly maxMonth?: string;
  readonly initialMonth?: string;
  readonly allowUnmarkedDates?: boolean;
  readonly onMonthChange?: (month: string) => void;
};

export function Calendar({ locale, today, selected, onSelect, markedDates, minMonth = "0100-01", maxMonth = "9999-12", initialMonth, allowUnmarkedDates = false, onMonthChange }: Props) {
  const currentMonth = today.slice(0, 7);
  const initial = initialMonth || selected?.slice(0, 7) || currentMonth;
  const [month, setMonth] = useState(initial < minMonth ? minMonth : initial > maxMonth ? maxMonth : initial);
  const [pickerYear, setPickerYear] = useState(month.slice(0, 4));
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthToggle = useRef<HTMLButtonElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const validYear = /^\d{4}$/.test(pickerYear) && pickerYear >= minMonth.slice(0, 4) && pickerYear <= maxMonth.slice(0, 4);
  const language = locale === "ko" ? "ko-KR" : "en-GB";
  const start = new Date(`${month}-01T00:00:00Z`);
  const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const weekdayOffset = start.getUTCDay();
  const countByDate = new Map(markedDates?.map(({ date, count }) => [date, count]));
  const monthCount = markedDates?.filter(({ date }) => date.startsWith(month)).reduce((total, { count }) => total + count, 0);
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: "full", timeZone: "UTC" });
  const monthFormat = new Intl.DateTimeFormat(language, { year: "numeric", month: "long", timeZone: "UTC" });
  const monthLabel = monthFormat.format(start);
  const pickerLabel = locale === "ko" ? "연도와 월 선택" : "Choose year and month";
  const weekdays = Array.from({ length: 7 }, (_, day) => new Date(Date.UTC(2023, 0, day + 1)));

  useEffect(() => {
    if (pickerOpen) {
      yearInput.current?.focus({ preventScroll: true });
      yearInput.current?.select();
    }
  }, [pickerOpen]);

  function closePicker() {
    setPickerOpen(false);
    monthToggle.current?.focus({ preventScroll: true });
  }

  function changeMonth(next: string) {
    if (next < minMonth || next > maxMonth) return;
    setMonth(next);
    if (next !== month) onMonthChange?.(next);
    if (pickerOpen) closePicker();
  }

  function moveMonth(offset: -1 | 1) {
    const next = new Date(start);
    next.setUTCMonth(next.getUTCMonth() + offset);
    changeMonth(next.toISOString().slice(0, 7));
  }

  return (
    <div className="calendar" onKeyDown={(event) => {
      if (event.key === "Escape" && pickerOpen && !event.nativeEvent.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        closePicker();
      }
    }}>
      <div className="calendar-navigation">
        <button type="button" onClick={() => moveMonth(-1)} disabled={month <= minMonth} aria-label={locale === "ko" ? "이전 달" : "Previous month"}><ChevronLeft className="icon" aria-hidden="true" /></button>
        <h3 className="calendar-month" id={titleId} aria-live="polite" aria-atomic="true"><button ref={monthToggle} type="button" className="calendar-month-toggle" aria-label={`${monthLabel}, ${pickerLabel}`} aria-expanded={pickerOpen} aria-controls={`${titleId}-picker`} onClick={() => pickerOpen ? closePicker() : (setPickerYear(month.slice(0, 4)), setPickerOpen(true))}>{monthLabel}</button></h3>
        <button type="button" onClick={() => moveMonth(1)} disabled={month >= maxMonth} aria-label={locale === "ko" ? "다음 달" : "Next month"}><ChevronRight className="icon" aria-hidden="true" /></button>
      </div>
      <SlideRegion open={pickerOpen} id={`${titleId}-picker`}><div className="calendar-month-picker" role="group" aria-label={pickerLabel}>
        <label className="calendar-year" htmlFor={`${titleId}-year`}>{locale === "ko" ? "연도" : "Year"}
          <FormControl><input ref={yearInput} id={`${titleId}-year`} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={pickerYear} aria-invalid={!validYear || undefined} aria-describedby={`${titleId}-year-hint`}
            onChange={(event) => { event.stopPropagation(); setPickerYear(event.currentTarget.value); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.closest(".calendar-month-picker")?.querySelector<HTMLButtonElement>("button:enabled")?.focus();
              }
            }} /></FormControl>
        </label>
        <p id={`${titleId}-year-hint`} className="calendar-year-hint muted">{locale === "ko" ? `${minMonth.slice(0, 4)}–${maxMonth.slice(0, 4)} 범위의 네 자리 연도` : `Four-digit year, ${minMonth.slice(0, 4)}–${maxMonth.slice(0, 4)}`}</p>
        <div className="calendar-month-options">{Array.from({ length: 12 }, (_, index) => {
          const next = `${pickerYear}-${String(index + 1).padStart(2, "0")}`;
          const label = new Intl.DateTimeFormat(language, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2000, index, 1)));
          return <button key={index} type="button" data-calendar-month={validYear ? next : undefined} aria-label={validYear ? monthFormat.format(new Date(`${next}-01T00:00:00Z`)) : label} aria-pressed={next === month} disabled={!validYear || next < minMonth || next > maxMonth} onClick={() => changeMonth(next)}>{label}</button>;
        })}</div>
      </div></SlideRegion>
      <SlideRegion open={!pickerOpen}>
      <table aria-labelledby={titleId}>
        <thead><tr>{weekdays.map((day) => <th key={day.getUTCDay()} scope="col" aria-label={new Intl.DateTimeFormat(language, { weekday: "long", timeZone: "UTC" }).format(day)}>{new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" }).format(day)}</th>)}</tr></thead>
        <tbody key={month}>{Array.from({ length: Math.ceil((weekdayOffset + daysInMonth) / 7) }, (_, week) => (
          <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
            const day = week * 7 + weekday - weekdayOffset + 1;
            if (day < 1 || day > daysInMonth) return <td key={weekday} />;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const count = countByDate.get(date) ?? 0;
            const fullDate = dateFormat.format(new Date(`${date}T00:00:00Z`));
            const label = markedDates ? `${fullDate}, ${locale === "ko" ? `행사 ${count}개` : `${count} ${count === 1 ? "event" : "events"}`}` : fullDate;
            return <td key={weekday}>{allowUnmarkedDates || !markedDates || count > 0 ? (
              <button type="button" className="calendar-day" data-calendar-date={date} data-event-date={count > 0 ? date : undefined} aria-current={date === today ? "date" : undefined} aria-pressed={date === selected} aria-label={label} onClick={() => onSelect(date)}>{day}</button>
            ) : <span className="calendar-day" aria-current={date === today ? "date" : undefined}>{day}</span>}</td>;
          })}</tr>
        ))}</tbody>
      </table>
      <div className="calendar-footer">
        {monthCount !== undefined && <p className="calendar-count muted" aria-live="polite">{locale === "ko" ? `행사 ${monthCount}개` : `${monthCount} ${monthCount === 1 ? "event" : "events"}`}</p>}
        <button type="button" className="calendar-current" onClick={() => changeMonth(currentMonth)} disabled={month === currentMonth || currentMonth < minMonth || currentMonth > maxMonth}>{locale === "ko" ? "이번 달" : "This month"}</button>
      </div>
      </SlideRegion>
    </div>
  );
}
