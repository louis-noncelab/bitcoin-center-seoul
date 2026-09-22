import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { listMeetupCheckins, setMeetupCheckin } from "@/server/orders/checkin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().trim().max(500).optional(),
  orderId: z.string().trim().min(1).max(40).optional(),
  undo: z.boolean().optional(),
}).strict();

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await listMeetupCheckins());
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  const body = await readBody(request, bodySchema);
  if (!body.code && !body.orderId) throw new HttpError(400, "INVALID_INPUT", "확인 코드 또는 주문 번호가 필요합니다.");
  return json(await setMeetupCheckin(body, actor.id));
});
