import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { emailDeliveryReport, releaseCapturedEmail, retryFailedEmail } from "@/server/email/status";
import { processEmailQueue } from "@/server/email/queue";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("drain") }).strict(),
  z.object({ action: z.literal("retry"), id: z.string().regex(/^[a-z0-9]{8,40}$/) }).strict(),
  z.object({ action: z.literal("release") }).strict(),
]);

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await emailDeliveryReport());
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  const action = await readBody(request, actionSchema);
  if (action.action === "drain") {
    await processEmailQueue();
    return json(await emailDeliveryReport());
  }
  if (action.action === "retry") return json(await retryFailedEmail(action.id, actor.id));
  return json(await releaseCapturedEmail(actor.id));
});
