import { adminEventDelete, adminEventGet, adminEventPatch, adminEventPut } from "@/server/events/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const DELETE = adminEventDelete;
export const GET = adminEventGet;
export const PUT = adminEventPut;
export const PATCH = adminEventPatch;
