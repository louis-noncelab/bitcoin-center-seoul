import { isCalendarDate } from "@/lib/events-contract";

function bookingUrl(link: string): URL | undefined {
  try {
    const url = new URL(link.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function eventBookingHref(link: string, date: string, today: string): string | undefined {
  if (!isCalendarDate(date) || !isCalendarDate(today)) return undefined;
  if (date.trim().replaceAll(".", "-") < today.trim().replaceAll(".", "-")) return undefined;
  return bookingUrl(link) ? link.trim() : undefined;
}

export function isSaturdayBlockUrl(link: string): boolean {
  const hostname = bookingUrl(link)?.hostname;
  return hostname === "saturdayblock.com" || hostname === "www.saturdayblock.com";
}
