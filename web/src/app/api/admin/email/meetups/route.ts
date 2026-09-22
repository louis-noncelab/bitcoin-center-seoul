import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { meetupAudiences, sendMeetupBroadcast } from "@/server/email/meetup-broadcast";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
}).strict();

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json({ meetups: await meetupAudiences() });
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  const body = await readBody(request, bodySchema);
  return json(await sendMeetupBroadcast(body, actor.id));
});
