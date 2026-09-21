import type { EventRecord } from "@/lib/events-contract";

// Only the fields needed by the interactive home schedule cross the client boundary.
export type HomeEvent = Pick<EventRecord, "registrationClosed" | "id" | "slug" | "title" | "titleEn" | "date" | "time" | "venueType" | "location" | "locationEn" | "image" | "link">;

export function homeEvents(records: readonly EventRecord[]): HomeEvent[] {
  return records.map(({ registrationClosed, id, slug, title, titleEn, date, time, venueType, location, locationEn, image, images, link }) => ({
    registrationClosed, id, slug, title, titleEn, date: date.trim().replaceAll(".", "-"), time, venueType, location, locationEn, link,
    image: images[0] || image,
  })).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time, undefined, { numeric: true }) || a.id - b.id);
}

export function upcomingHomeEvents(events: readonly HomeEvent[], today: string): HomeEvent[] {
  return events.filter(event => event.date >= today).slice(0, 5);
}
