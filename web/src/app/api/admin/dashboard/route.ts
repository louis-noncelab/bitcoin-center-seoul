import { requireAccount } from "@/server/auth";
import { getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import { getDatabase } from "@/server/events/db";
import { listEvents } from "@/server/events";
import { handleApi, json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  const [products, listedProducts, categories, pending, paid, review, outboxRows, audits] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { published: true, listed: true } }),
    prisma.productCategory.count({ where: { active: true } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "REVIEW" } }),
    prisma.emailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, targetType: true, createdAt: true },
    }),
  ]);
  const now = Date.now();
  const sessions = Number(getDatabase().prepare<[number], { n: number }>("SELECT COUNT(*) AS n FROM admin_sessions WHERE expires_at > ?").get(now)?.n ?? 0);
  const outbox = Object.fromEntries(outboxRows.map((row) => [row.status, row._count._all]));
  return json({
    products, listedProducts, categories,
    orders: { pending, paid, review },
    events: listEvents().length,
    sessions,
    outbox,
    emailMode: getServerConfig().emailMode,
    audits: audits.map((row) => ({ id: row.id, action: row.action, targetType: row.targetType, createdAt: row.createdAt.toISOString() })),
  });
});
