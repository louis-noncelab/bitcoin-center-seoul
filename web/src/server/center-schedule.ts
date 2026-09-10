import "server-only";
import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { centerHours } from "@/content/center";
import { seoulDate, type CenterStatus, type CenterStatusSnapshot, type OpeningOverride } from "@/lib/center-status";
import { isCalendarDate } from "@/lib/events-contract";

const dayMs = 86_400_000;
export type ScheduledEvent = { readonly date: string; readonly time: string };
export type OpeningException = { readonly date: string; readonly status: OpeningOverride };

export function eventWindow(event: ScheduledEvent): { start: number; end: number } | null {
  const date = event.date.trim().replaceAll(".", "-");
  if (!isCalendarDate(date)) return null;
  const match = /^(\d{1,2}):?(\d{2})\s*[-~–—〜～]\s*(\d{1,2}):?(\d{2})$/.exec(event.time.trim());
  if (!match) return null;
  const [, sh, sm, eh, em] = match.map(Number);
  if (sh === undefined || sm === undefined || eh === undefined || em === undefined || sh > 23 || sm > 59 || eh > 24 || em > 59 || (eh === 24 && em !== 0)) return null;
  const startMinutes = sh * 60 + sm, endMinutes = eh * 60 + em;
  if (startMinutes === endMinutes) return null;
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  return { start: midnight + startMinutes * 60_000, end: midnight + endMinutes * 60_000 + (endMinutes < startMinutes ? dayMs : 0) };
}

export async function resolveCenterStatus(now: Date, events: readonly ScheduledEvent[], exceptions: readonly OpeningException[]): Promise<CenterStatusSnapshot> {
  const timestamp = now.getTime(), date = seoulDate(now);
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  const yesterday = seoulDate(new Date(midnight - 1));
  const days = await Promise.all([yesterday, date].map(async (day) => {
    const override = exceptions.find((item) => item.date === day)?.status ?? null;
    let holidays: readonly string[] | null = null, known = true;
    try { holidays = await getHolidayNames(day); }
    catch (error) { if (!(error instanceof RangeError)) throw error; known = false; }
    return { date: day, override, holiday: holidays?.join(" · ") ?? null, allowed: override ? override === "open" : known ? !holidays : null };
  }));
  const today = days[1]!;
  const windows = events.flatMap((event) => {
    const window = eventWindow(event);
    return window && days.find((day) => day.date === seoulDate(new Date(window.start)))?.allowed ? [window] : [];
  });
  const opens = Date.parse(`${date}T${centerHours.opens}:00+09:00`), closes = Date.parse(`${date}T${centerHours.closes}:00+09:00`);
  let status: CenterStatus | null;
  if (today.override === "closed") status = "closed";
  else if (windows.some(({ start, end }) => timestamp >= start && timestamp < end)) status = "event";
  else if (today.allowed === null) status = null;
  else status = today.allowed && timestamp >= opens && timestamp < closes ? "open" : "closed";
  const boundaries = [midnight + dayMs, opens, closes, ...windows.flatMap(({ start, end }) => [start, end])];
  return {
    status, override: today.override, date, holiday: today.holiday, checkedAt: now.toISOString(),
    nextChangeAt: new Date(Math.min(...boundaries.filter((time) => time > timestamp))).toISOString(),
  };
}
