import "server-only";
import type { NextRequest } from "next/server";
import { centerStatusInputSchema, seoulDate, type CenterStatus } from "@/lib/center-status";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { getDatabase } from "@/server/events/db";
import { dataResponse, jsonBody, route } from "@/server/events/http";

export async function publicCenterStatus() {
  return route(() => {
    const row = getDatabase().prepare<[string], { status: CenterStatus | null }>(
      "SELECT status FROM center_status WHERE id = 1 AND selected_on = ?",
    ).get(seoulDate());
    return dataResponse({ status: row?.status ?? null });
  });
}

export async function updateCenterStatus(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); requireAdmin(request);
    const input = await jsonBody(request, centerStatusInputSchema);
    getDatabase().prepare("INSERT INTO center_status (id, status, selected_on) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, selected_on = excluded.selected_on").run(input.status, seoulDate());
    return dataResponse(input);
  });
}
