import type { EventRecord } from "@/lib/events-contract";

// Only the fields needed by the interactive home schedule cross the client boundary.
export type HomeEvent = Pick<EventRecord, "id" | "slug" | "title" | "titleEn" | "date" | "time" | "location" | "locationEn" | "image" | "link">;

export function homeEvents(records: readonly EventRecord[]): HomeEvent[] {
  return records.map(({ id, slug, title, titleEn, date, time, location, locationEn, image, images, link }) => ({
    id, slug, title, titleEn, date: date.trim().replaceAll(".", "-"), time, location, locationEn, link,
    image: images[0] || image,
  })).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time, undefined, { numeric: true }) || a.id - b.id);
}

export function upcomingHomeEvents(events: readonly HomeEvent[], today: string): HomeEvent[] {
  return events.filter(event => event.date >= today).slice(0, 5);
}
