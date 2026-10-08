import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, HttpError, json } from "@/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    assertSameOrigin(request);
    const actor = await requireAccount(request);
    const { id } = await context.params;
    await prisma.$transaction(async (tx) => {
      const settings = await tx.$queryRaw<Array<{ lightningAddressId: string | null }>>`SELECT "lightningAddressId" FROM "SiteSetting" WHERE id = 'site' FOR UPDATE`;
      if (settings[0]?.lightningAddressId === id) {
        throw new HttpError(409, "LIGHTNING_ADDRESS_IN_USE", "현재 결제금을 받는 주소입니다. 다른 주소를 선택하고 설정을 저장한 뒤 삭제해 주세요.");
      }
      const deleted = await tx.lightningAddress.deleteMany({ where: { id } });
      if (!deleted.count) throw new HttpError(404, "LIGHTNING_ADDRESS_NOT_FOUND", "라이트닝 주소를 찾을 수 없습니다.");
      await tx.auditLog.create({ data: { actorId: actor.id, action: "lightning-address.deleted", targetType: "LightningAddress", targetId: id, summary: {} } });
    });
    return json({ deleted: true });
  });
}
