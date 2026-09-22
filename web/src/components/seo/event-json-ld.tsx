import { centerContent } from "@/content/center";
import { defaultShareImage, shareCardPath } from "@/content/share";
import { siteOrigin } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import type { EventRecord } from "@/lib/events-contract";
import { markdownExcerpt } from "@/lib/markdown";

function absolute(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${siteOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
}

function eventStart(date: string, time: string): string {
  const day = date.trim().replaceAll(".", "-");
  const clock = /^(\d{2}):(\d{2})/.exec(time.trim());
  return clock ? `${day}T${clock[1]}:${clock[2]}:00+09:00` : day;
}

export function eventStructuredData(event: EventRecord, locale: Locale) {
  const title = locale === "ko" ? event.title : event.titleEn || event.title;
  const description = markdownExcerpt(locale === "ko" ? event.description : event.descriptionEn || event.description);
  const url = `${siteOrigin}/${locale}/programs/${event.slug || event.id}`;
  const card = absolute((event.images[0] || event.image) ? shareCardPath("programs", event.slug || event.id) : defaultShareImage);
  const photos = (event.images.length > 0 ? event.images : event.image ? [event.image] : []).map(absolute);
  const placeName = event.venueType === "center"
    ? centerContent[locale].hero.title
    : (locale === "en" && event.locationEn ? event.locationEn : event.location) || centerContent[locale].hero.title;
  const address = event.venueType === "center"
    ? centerContent[locale].visit.address.value
    : (locale === "en" && event.locationEn ? event.locationEn : event.location);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: title,
        description,
        url,
        image: [card, ...photos.filter((photo) => photo !== card)],
        startDate: eventStart(event.date, event.time),
        eventAttendanceMode: event.isOnline ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        inLanguage: locale,
        location: event.isOnline
          ? { "@type": "VirtualLocation", name: locale === "ko" ? "온라인" : "Online" }
          : { "@type": "Place", name: placeName, address },
        organizer: { "@type": "Organization", name: centerContent[locale].hero.title, url: siteOrigin },
        ...(event.ticketPriceKrw && !event.externalPayment ? {
          offers: {
            "@type": "Offer",
            price: event.ticketPriceKrw,
            priceCurrency: "KRW",
            availability: `https://schema.org/${event.registrationClosed ? "SoldOut" : "InStock"}`,
            url,
          },
        } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "ko" ? "홈" : "Home", item: `${siteOrigin}/${locale}` },
          { "@type": "ListItem", position: 2, name: centerContent[locale].programs.title, item: `${siteOrigin}/${locale}/programs` },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
  return data;
}

export function EventJsonLd({ locale, event }: { readonly locale: Locale; readonly event: EventRecord }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData(event, locale)).replace(/</g, "\\u003c") }} />;
}
