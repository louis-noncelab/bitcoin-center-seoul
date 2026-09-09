import { adminEventsGet, adminEventsPost } from "@/server/events/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = adminEventsGet;
export const POST = adminEventsPost;
