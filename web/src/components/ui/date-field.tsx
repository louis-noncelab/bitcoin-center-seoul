"use client";

import { CalendarDays } from "lucide-react";
import { useId, useRef, useState } from "react";
import { isCalendarDate } from "@/lib/events-contract";
import { Calendar } from "./calendar";
import { Dialog } from "./confirmation-dialog";
import { Button, FormControl } from "./primitives";
import "@/styles/slide-region.css";

export function DateField({ name, label, defaultValue = "", required = false, onDirty }: {
  readonly name: string; readonly label: string; readonly defaultValue?: string;
  readonly required?: boolean; readonly onDirty: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");
  const [today, setToday] = useState("");
  const [calendarSession, setCalendarSession] = useState(0);
  const [open, setOpen] = useState(false);
  const message = "날짜를 연도-월-일 형식으로 입력해 주세요. 예: 2026-09-10";

  function validate(next: string, show: boolean) {
    const invalid = next !== "" && !isCalendarDate(next);
    input.current?.setCustomValidity(invalid ? message : "");
    if (show) setError(invalid ? message : "");
  }

  function choose(next: string) {
    setValue(next);
    validate(next, true);
    onDirty();
    setOpen(false);
  }

  return <div className="date-field">
    <label htmlFor={id}>{label}</label>
    <div className="date-field-control">
      <FormControl><input ref={input} id={id} name={name} type="text" inputMode="numeric" value={value} required={required} maxLength={10} pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" placeholder="YYYY-MM-DD" autoComplete="off" aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined}
        onChange={(event) => { setValue(event.currentTarget.value); validate(event.currentTarget.value, Boolean(error)); }}
        onBlur={() => validate(value, true)}
        onInvalid={(event) => { event.preventDefault(); setError(value ? message : "날짜를 입력해 주세요."); input.current?.focus(); }} /></FormControl>
      <Button variant="quiet" className="date-field-trigger" aria-label={`${label} 달력 열기`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setToday(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())); setCalendarSession(session => session + 1); setOpen(true); }}><CalendarDays className="icon" aria-hidden="true" /></Button>
    </div>
    {error && <p id={`${id}-error`} className="date-field-error" role="alert">{error}</p>}
    <Dialog open={open} onClose={() => setOpen(false)} title={`${label} 선택`} className="date-field-dialog">
      {today && <Calendar key={calendarSession} locale="ko" today={today} {...(isCalendarDate(value) ? { selected: value } : {})} minMonth="0100-01" maxMonth="9999-12" onSelect={choose} />}
      <div className="button-row"><Button variant="secondary" onClick={() => choose("")}>지우기</Button><Button variant="quiet" onClick={() => setOpen(false)}>닫기</Button></div>
    </Dialog>
  </div>;
}
