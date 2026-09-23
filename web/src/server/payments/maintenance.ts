import "server-only";
import { prisma } from "@/server/db";
import { paymentModeOf } from "@/server/config";
import { reconcilePayment } from "./index";

type MaintenancePass = {
  readonly afterId: string | null;
  readonly limit?: number;
  readonly signal?: AbortSignal;
};

export async function runPaymentMaintenancePass({ afterId, limit = 100, signal }: MaintenancePass) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("Maintenance batch size must be between 1 and 100.");
  if (signal?.aborted) return { nextCursor: afterId, checked: 0, unavailable: 0, requiresReconciliation: 0 };
  const payments = await prisma.payment.findMany({
    where: { mode: paymentModeOf(), OR: [
      { status: { in: ["NEW", "CREATING", "PENDING", "PROCESSING", "REVIEW", "EXPIRED"] } },
      { status: "FAILED", externalId: { not: null } },
    ], ...(afterId ? { id: { gt: afterId } } : {}) },
    orderBy: { id: "asc" }, take: limit, select: { id: true },
  });
  let checked = 0; let unavailable = 0; let requiresReconciliation = 0; let nextCursor = afterId;
  for (const payment of payments) {
    if (signal?.aborted) break;
    try {
      const observed = await reconcilePayment(payment.id);
      checked += 1;
      if (observed.status === "REVIEW") requiresReconciliation += 1;
    }
    catch (error) { if (!(error instanceof Error)) throw error; unavailable += 1; }
    nextCursor = payment.id;
  }
  // Advance by immutable ID even after provider errors; old REVIEW rows cannot starve newer holds.
  if (!signal?.aborted && payments.length < limit) nextCursor = null;
  return { nextCursor, checked, unavailable, requiresReconciliation };
}
