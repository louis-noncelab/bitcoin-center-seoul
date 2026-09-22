import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { lightningAddressOrigin } from "@/server/payments/transport";

const inputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().regex(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
}).strict();

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApi(async () => {
    assertSameOrigin(request);
    const actor = await requireAccount(request);
    const input = await readBody(request, inputSchema);
    const origin = lightningAddressOrigin(input.address);
    if (!origin) throw new HttpError(400, "INVALID_RECEIVER", "라이트닝 주소 형식을 확인해 주세요.");
    const created = await prisma.lightningAddress.create({ data: { label: input.label, address: input.address, allowedOrigins: origin } });
    await prisma.auditLog.create({ data: { actorId: actor.id, action: "lightning-address.created", targetType: "LightningAddress", targetId: created.id, summary: { address: created.address } } });
    return json({ id: created.id }, 201);
  });
}
