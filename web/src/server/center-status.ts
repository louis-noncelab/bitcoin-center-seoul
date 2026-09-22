import "server-only";
import type { NextRequest } from "next/server";
import { centerStatusInputSchema, seoulDate } from "@/lib/center-status";
import { resolveCenterStatus, type OpeningException, type ScheduledEvent } from "@/server/center-schedule";
import { prisma } from "@/server/db";
import { requireAdmin, requireSameOrigin } from "@/server/events/auth";
import { dataResponse, jsonBody, route } from "@/server/events/http";

export async function getCenterStatus(now = new Date()) {
  const date = seoulDate(now), yesterday = seoulDate(new Date(Date.parse(`${date}T00:00:00+09:00`) - 1));
  const rows = await prisma.centerEvent.findMany({ where: { venueType: "center" }, select: { date: true, time: true } });
  const events = rows.filter((row) => [yesterday, date].includes(row.date.trim().replaceAll(".", "-"))) as ScheduledEvent[];
  const exceptions = await prisma.centerOpeningOverride.findMany({ where: { date: { in: [yesterday, date] } } }) as OpeningException[];
  return resolveCenterStatus(now, events, exceptions);
}

export async function publicCenterStatus() {
  return route(async () => dataResponse(await getCenterStatus()));
}

export async function updateCenterStatus(request: NextRequest) {
  return route(async () => {
    requireSameOrigin(request); await requireAdmin(request);
    const input = await jsonBody(request, centerStatusInputSchema);
    const date = seoulDate();
    if (input.override === null) await prisma.centerOpeningOverride.deleteMany({ where: { date } });
    else await prisma.centerOpeningOverride.upsert({ where: { date }, create: { date, status: input.override }, update: { status: input.override } });
    return dataResponse(await getCenterStatus());
  });
}
