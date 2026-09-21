import "server-only";
import type { NextRequest } from "next/server";
import { centerStatusInputSchema, seoulDate } from "@/lib/center-status";
import { resolveCenterStatus, type OpeningException, type ScheduledEvent } from "@/server/center-schedule";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { getDatabase } from "@/server/events/db";
import { dataResponse, jsonBody, route } from "@/server/events/http";

export async function getCenterStatus(now = new Date()) {
  const date = seoulDate(now), yesterday = seoulDate(new Date(Date.parse(`${date}T00:00:00+09:00`) - 1));
  const db = getDatabase();
  const events = db.prepare<[string, string], ScheduledEvent>("SELECT date, time FROM events WHERE venueType = 'center' AND REPLACE(TRIM(date), '.', '-') IN (?, ?)").all(yesterday, date);
  const exceptions = db.prepare<[string, string], OpeningException>("SELECT date, status FROM center_opening_overrides WHERE date IN (?, ?)").all(yesterday, date);
  return resolveCenterStatus(now, events, exceptions);
}

export async function publicCenterStatus() {
  return route(async () => dataResponse(await getCenterStatus()));
}

export async function updateCenterStatus(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    const input = await jsonBody(request, centerStatusInputSchema);
    const db = getDatabase(), date = seoulDate();
    if (input.override === null) db.prepare("DELETE FROM center_opening_overrides WHERE date = ?").run(date);
    else db.prepare("INSERT INTO center_opening_overrides (date, status) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET status = excluded.status").run(date, input.override);
    return dataResponse(await getCenterStatus());
  });
}
