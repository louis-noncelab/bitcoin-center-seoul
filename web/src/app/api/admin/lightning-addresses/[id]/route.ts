import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json } from "@/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    assertSameOrigin(request);
    const actor = await requireAccount(request);
    const { id } = await context.params;
    await prisma.lightningAddress.delete({ where: { id } });
    await prisma.auditLog.create({ data: { actorId: actor.id, action: "lightning-address.deleted", targetType: "LightningAddress", targetId: id, summary: {} } });
    return json({ deleted: true });
  });
}
