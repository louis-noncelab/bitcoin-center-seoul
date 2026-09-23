import type { Locale } from "@/i18n/routing";
import type { EventRecord } from "@/lib/events-contract";

export const centerEventLocation = {
  location: "비트코인 센터 서울 (서울 마포구 신촌로2안길 30, 2층)",
  locationEn: "Bitcoin Center Seoul (2F, 30 Sinchon-ro 2an-gil, Mapo-gu, Seoul)",
} as const;

export function eventListLocation(event: Pick<EventRecord, "venueType" | "location" | "locationEn" | "isOnline">, locale: Locale): string {
  if (event.isOnline) return locale === "en" ? "Online" : "온라인";
  if (event.venueType === "center") return "";
  return locale === "en" && event.locationEn ? event.locationEn : event.location;
}

export function eventTimeZoneLabel(locale: Locale): string {
  return locale === "ko" ? "한국 시간 (KST, UTC+9)" : "Korea Standard Time (KST, UTC+9)";
}
