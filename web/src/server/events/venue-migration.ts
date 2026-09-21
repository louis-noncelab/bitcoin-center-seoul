import "server-only";
import type Database from "better-sqlite3";
import { centerEventLocation } from "@/lib/event-location";

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
const legacyCenterLocations = new Set([
  "비트코인 센터 서울", "Bitcoin Center Seoul", ...Object.values(centerEventLocation),
].map(normalize));

// Only legacy import/migration infers the venue; normal reads and writes use the saved choice.
export function legacyVenueType(location: string, locationEn: string): "center" | "external" {
  const locations = [location, locationEn].map(normalize).filter(Boolean);
  return locations.length > 0 && locations.every((value) => legacyCenterLocations.has(value)) ? "center" : "external";
}

export function migrateEventVenues(db: Database.Database): void {
  const columns = db.prepare<[], { readonly name: string }>("PRAGMA table_info(events)").all();
  if (columns.some(({ name }) => name === "venueType")) return;
  db.exec("ALTER TABLE events ADD COLUMN venueType TEXT NOT NULL DEFAULT 'external' CHECK (venueType IN ('center', 'external'))");
  const rows = db.prepare<[], { readonly id: number; readonly location: string; readonly locationEn: string }>("SELECT id, location, locationEn FROM events").all();
  const update = db.prepare<[string, number]>("UPDATE events SET venueType = ? WHERE id = ?");
  for (const row of rows) update.run(legacyVenueType(row.location, row.locationEn), row.id);
}
