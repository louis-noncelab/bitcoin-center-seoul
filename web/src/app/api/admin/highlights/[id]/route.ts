import { adminHighlightDelete, adminHighlightGet, adminHighlightPut } from "@/server/events/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const DELETE = adminHighlightDelete;
export const GET = adminHighlightGet;
export const PUT = adminHighlightPut;
