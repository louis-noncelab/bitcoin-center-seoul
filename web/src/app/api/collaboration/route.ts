import { randomUUID } from "node:crypto";
import { boundedRequestRateLimit } from "@/server/auth/rate-limit";
import { centerContent } from "@/content/center";
import { prisma } from "@/server/db";
import { enqueue } from "@/server/email";
import { scheduleEmailDelivery } from "@/server/email/queue";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { collaborationSchema } from "@/server/collaboration/validation";

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  await boundedRequestRateLimit(request, "collaboration", 3, 60, 3600);
  const input = await readBody(request, collaborationSchema, 16_384);
  const recipient = centerContent.ko.visit.contact.email.label;
  const created = await prisma.$transaction((tx) => enqueue(tx, `collaboration:${randomUUID()}`, recipient, input.locale, "COLLABORATION", {
    type: input.type,
    name: input.name,
    email: input.email,
    ...(input.organization ? { company: input.organization } : {}),
    message: input.message,
  }));
  if (created !== 1) throw new HttpError(503, "SUBMISSION_UNAVAILABLE", "제안을 접수하지 못했습니다. 다시 시도해 주세요. / We could not receive your proposal. Please try again.");
  scheduleEmailDelivery();
  return json({ received: true }, 201);
});
