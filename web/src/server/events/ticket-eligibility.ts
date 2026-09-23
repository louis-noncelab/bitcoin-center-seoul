import { seoulDate } from "@/lib/center-status";
import { isCalendarDate } from "@/lib/events-contract";

export function ticketEventId(sku: string): number | null {
  const match = /^MEETUP-([1-9]\d*)$/.exec(sku);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

// Times are free-form display text. Registration ends at Seoul midnight after the event date.
export function eventAcceptsTickets(event: {
  readonly date: string; readonly registrationClosed: boolean; readonly externalPayment: boolean; readonly ticketPriceKrw: string;
}, now = new Date()): boolean {
  return !event.registrationClosed && !event.externalPayment && /^[1-9]\d*$/.test(event.ticketPriceKrw)
    && isCalendarDate(event.date) && event.date.trim().replaceAll(".", "-") >= seoulDate(now);
}
