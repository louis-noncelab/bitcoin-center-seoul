import { adminHighlightsGet, adminHighlightsPost } from "@/server/events/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = adminHighlightsGet;
export const POST = adminHighlightsPost;
