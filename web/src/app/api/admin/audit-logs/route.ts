import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { handleApi, json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, actorId: true, action: true, targetType: true, targetId: true, createdAt: true },
  });
  return json({
    logs: rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});
