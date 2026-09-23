import "server-only";
import { z } from "zod";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { releaseCouponUsage } from "@/server/commerce/coupons";
import { enqueue } from "@/server/email";
import { scheduleEmailDelivery } from "@/server/email/queue";
import { openString } from "@/server/privacy";
import { HttpError } from "@/server/http";
import { lockPayment } from "@/server/payments/state";
import { assertLnurlUnpaidResolution } from "@/server/payments/unpaid-resolution";
import { orderIncludes, orderView, type OrderDetails } from "./projection";
import { quoteSnapshot } from "./quote";

export const manualPaymentSchema = z.object({
  paymentId: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  expectedPaymentUpdatedAt: z.iso.datetime({ offset: true }),
  decision: z.enum(["PAID", "CANCELLED"]),
  reason: z.string().trim().min(1).max(2000),
  unpaidEvidence: z.object({
    providerReference: z.string().trim().min(1).max(500),
    pendingHtlcsCleared: z.literal(true),
  }).strict().optional(),
}).strict();
type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

async function restoreCouponUsage(tx: Tx, order: OrderDetails) {
  if (await tx.couponUsage.findUnique({ where: { orderId: order.id } })) return;
  const quote = await tx.quote.findUniqueOrThrow({ where: { id: order.quoteId } });
  const original = quoteSnapshot.parse(quote.snapshot).coupon;
  if (!original) return;
  await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${original.id} FOR UPDATE`;
  const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: original.id } });
  const count = await tx.couponUsage.count({ where: { couponId: coupon.id } });
  const mine = order.accountId ? await tx.couponUsage.count({ where: { couponId: coupon.id, accountId: order.accountId } }) : 0;
  if ((coupon.usageLimit !== null && count >= coupon.usageLimit) || (order.accountId && mine >= coupon.perUserLimit)) {
    throw new HttpError(409, "COUPON_CAPACITY", "쿠폰 사용 한도가 다른 주문에 배정되었습니다. 한도를 확인해 주세요.");
  }
  await tx.couponUsage.create({ data: { orderId: order.id, couponId: coupon.id, accountId: order.accountId, discountSats: BigInt(original.discountSats) } });
}

async function updateInventory(tx: Tx, order: OrderDetails, paid: boolean) {
  const retained = order.holdExpiresAt !== null;
  if (!retained && !paid) return;
  for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
    await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
    if (retained && variant.reservedStock < item.quantity) {
      throw new HttpError(409, "INVENTORY_CONFLICT", "예약 재고가 주문 수량과 맞지 않습니다. 재고를 확인해 주세요.");
    }
    if (paid && (variant.stockOnHand < variant.reservedStock || (!retained && variant.stockOnHand - variant.reservedStock < item.quantity))) {
      throw new HttpError(409, "OUT_OF_STOCK", "다른 주문의 예약분을 제외한 재고가 부족합니다.");
    }
    await tx.productVariant.update({ where: { id: item.variantId }, data: {
      ...(retained ? { reservedStock: { decrement: item.quantity } } : {}),
      ...(paid ? { stockOnHand: { decrement: item.quantity } } : {}),
    } });
  }
}

export async function resolveManualPayment(orderId: string, input: ManualPaymentInput, actorId: string) {
  let deliver = false;
  const view = await prisma.$transaction(async (tx) => {
    const payment = await lockPayment(tx, input.paymentId);
    if (payment.orderId !== orderId) throw new HttpError(404, "NOT_FOUND", "주문의 결제를 찾을 수 없습니다.");
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderIncludes });
    if (order.privacyRedactedAt) throw new HttpError(409, "ORDER_REDACTED", "개인정보가 파기된 주문은 변경할 수 없습니다.");
    if (order.payments.length !== 1) throw new HttpError(409, "PAYMENT_CONFLICT", "여러 결제가 연결된 주문은 수동 처리할 수 없습니다.");
    if (order.refundStatus !== "NONE") throw new HttpError(409, "REFUND_IN_PROGRESS", "환불 처리 중이거나 완료된 주문의 입금 상태를 변경할 수 없습니다.");
    const paid = input.decision === "PAID";
    const achieved = order.status === input.decision && payment.status === (paid ? "PAID" : "FAILED");
    if (payment.updatedAt.getTime() !== new Date(input.expectedPaymentUpdatedAt).getTime()) {
      const retry = achieved && await tx.auditLog.findFirst({ where: {
        actorId, action: "order.payment.manual", targetType: "Order", targetId: order.id,
        AND: [
          { summary: { path: ["paymentId"], equals: payment.id } },
          { summary: { path: ["expectedPaymentUpdatedAt"], equals: input.expectedPaymentUpdatedAt } },
          { summary: { path: ["decision"], equals: input.decision } },
          { summary: { path: ["reason"], equals: input.reason } },
        ],
      } });
      if (retry) return orderView(order);
      throw new HttpError(409, "PAYMENT_STALE", "결제 상태가 변경되었습니다. 새로고침 후 다시 확인해 주세요.");
    }
    if (achieved) return orderView(order);
    if (payment.status === "CREATING" || payment.creationUnknown) throw new HttpError(409, "PAYMENT_IN_FLIGHT", "결제 생성 결과가 확인되지 않았습니다. 제공자 확인을 먼저 완료해 주세요.");
    if (order.fulfillmentStatus !== "UNFULFILLED") throw new HttpError(409, "FULFILLMENT_STARTED", "이미 수령 또는 배송 처리된 주문입니다.");
    if (order.status === "PAID" || payment.status === "PAID" || (!paid && (payment.paidAt !== null || payment.status === "PROCESSING"))) {
      throw new HttpError(409, "PAYMENT_RECEIVED", "입금 완료 또는 처리 중인 결제를 미입금 취소할 수 없습니다.");
    }
    if (!paid) assertLnurlUnpaidResolution(payment, Boolean(input.unpaidEvidence));
    await updateInventory(tx, order, paid);
    if (paid) await restoreCouponUsage(tx, order);
    else await releaseCouponUsage(tx, order.id);
    const toPaymentStatus = paid ? "PAID" : "FAILED";
    await tx.payment.update({ where: { id: payment.id }, data: {
      status: toPaymentStatus, reviewReason: paid ? "MANUAL_PAID" : "MANUAL_CANCELLED_UNPAID",
      ...(paid ? { paidAt: payment.paidAt ?? new Date() } : {}),
      updatedAt: new Date(Math.max(Date.now(), payment.updatedAt.getTime() + 1)),
    } });
    await tx.order.update({ where: { id: order.id }, data: { status: input.decision, holdExpiresAt: null } });
    await tx.auditLog.create({ data: {
      actorId, action: "order.payment.manual", targetType: "Order", targetId: order.id,
      summary: { decision: input.decision, reason: input.reason, ...(input.unpaidEvidence ? { unpaidEvidence: input.unpaidEvidence } : {}), paymentId: payment.id, expectedPaymentUpdatedAt: input.expectedPaymentUpdatedAt,
        fromOrderStatus: order.status, fromPaymentStatus: payment.status, toOrderStatus: input.decision, toPaymentStatus },
    } });
    await enqueue(tx, `order:${order.id}:${input.decision}`, openString(order.customerEmail), order.locale === "en" ? "en" : "ko", `order.${input.decision.toLowerCase()}`, { id: order.id, status: input.decision });
    deliver = true;
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderIncludes }));
  });
  if (deliver) scheduleEmailDelivery();
  return view;
}
