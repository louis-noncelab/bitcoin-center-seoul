import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import type { EventRecord } from "@/lib/events-contract";
import { eventBookingHref, isSaturdayBlockUrl } from "@/lib/event-booking";
import "@/styles/event-booking.css";

type Props = {
  readonly event: Pick<EventRecord, "link" | "date" | "title" | "titleEn" | "registrationClosed">;
  readonly locale: Locale;
  readonly today: string;
  readonly className?: string;
};

export function EventBookingLink({ event, locale, today, className = "" }: Props) {
  if (event.registrationClosed) return <span className={`button event-booking-link event-registration-closed ${className}`.trim()} aria-disabled="true">{locale === "ko" ? "참여 마감" : "Registration closed"}</span>;
  const href = eventBookingHref(event.link, event.date, today, event.registrationClosed);
  if (!href) return null;
  const ko = locale === "ko";
  const title = ko ? event.title : event.titleEn || event.title;
  const provider = isSaturdayBlockUrl(href) ? (ko ? "샛비" : "SatB") : (ko ? "외부 사이트" : "External site");
  return (
    <a className={`button event-booking-link ${className}`.trim()} href={href} target="_blank" rel="noopener noreferrer">
      <span><span className="sr-only">{title} </span>{ko ? "참여하기" : "Join event"}</span>
      <span className="event-booking-provider">{provider}<ArrowUpRight className="icon" aria-hidden="true" /></span>
      <span className="sr-only">{ko ? " (새 창)" : " (new window)"}</span>
    </a>
  );
}
