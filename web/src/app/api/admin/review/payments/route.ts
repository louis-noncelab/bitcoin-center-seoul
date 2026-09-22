import { requireAccount } from "@/server/auth";
import { getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import { handleApi, json } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAccount(request);
    const enabled = ["review", "test"].includes(getServerConfig().appMode);
    const payments = enabled ? await prisma.payment.findMany({ where: { mode: "REVIEW" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, provider: true, mode: true, status: true, amountSats: true, expiresAt: true, orderId: true, bookingId: true, creationUnknown: true, reviewReason: true } }) : [];
    return json({ enabled, payments });
  });
}
