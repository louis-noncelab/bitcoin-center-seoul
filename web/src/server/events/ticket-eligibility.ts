import { seoulDate } from "@/lib/center-status";
import { isCalendarDate } from "@/lib/events-contract";

export function ticketEventId(sku: string): number | null {
  const match = /^MEETUP-([1-9]\d*)$/.exec(sku);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

// Times are free-form display text. Registration ends at Seoul midnight after the event date.
export function eventAcceptsTickets(event: {
  readonly date: string; readonly registrationClosed: boolean; readonly externalPayment: boolean; readonly ticketPriceKrw: string; readonly ticketPriceSats: string;
}, now = new Date()): boolean {
  const amount = event.ticketPriceSats || event.ticketPriceKrw;
  return !event.registrationClosed && !event.externalPayment && !(event.ticketPriceKrw && event.ticketPriceSats) && /^(?:0|[1-9]\d*)$/.test(amount)
    && isCalendarDate(event.date) && event.date.trim().replaceAll(".", "-") >= seoulDate(now);
}
