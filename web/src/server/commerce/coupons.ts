import "server-only";
import type { Coupon } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { krwToSats } from "@/server/money";
import { z } from "zod";

export const couponInputSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  nameKo: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  discountKind: z.enum(["PERCENT", "KRW", "SATS"]),
  discountValue: z.string().regex(/^[1-9]\d{0,14}$/),
  minPurchaseAmount: z.string().regex(/^\d{1,15}$/).default("0"),
  maxDiscountAmount: z.string().regex(/^[1-9]\d{0,14}$/).nullable().optional(),
  usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  perUserLimit: z.number().int().min(1).max(100).default(1),
  validFrom: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  validUntil: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  active: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.validUntil <= value.validFrom) ctx.addIssue({ code: "custom", path: ["validUntil"], message: "Expiry must be after the start." });
  if (value.discountKind === "PERCENT" && BigInt(value.discountValue) > 100n) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percent must be 1–100." });
});
export type CouponInput = z.infer<typeof couponInputSchema>;

export function publicCoupon(row: Coupon & { _count?: { usages: number } }) {
  return {
    id: row.id,
    code: row.code,
    nameKo: row.nameKo,
    nameEn: row.nameEn,
    discountKind: row.discountKind,
    discountValue: row.discountValue.toString(),
    minPurchaseAmount: row.minPurchaseAmount.toString(),
    maxDiscountAmount: row.maxDiscountAmount?.toString() ?? null,
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    active: row.active,
    usageCount: row._count?.usages ?? 0,
  };
}

export async function listAdminCoupons() {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { usages: true } } } });
  return rows.map(publicCoupon);
}

export async function saveCoupon(input: CouponInput, actorId: string, id?: string) {
  return prisma.$transaction(async (tx) => {
    if (id) {
      const current = await tx.coupon.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "NOT_FOUND", "Coupon not found.");
    }
    const clash = await tx.coupon.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) throw new HttpError(409, "SLUG_EXISTS", "That coupon code is already in use.");
    const data = {
      code: input.code,
      nameKo: input.nameKo,
      nameEn: input.nameEn,
      discountKind: input.discountKind,
      discountValue: BigInt(input.discountValue),
      minPurchaseAmount: BigInt(input.minPurchaseAmount),
      maxDiscountAmount: input.maxDiscountAmount ? BigInt(input.maxDiscountAmount) : null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      active: input.active,
    };
    const row = id ? await tx.coupon.update({ where: { id }, data }) : await tx.coupon.create({ data });
    await tx.auditLog.create({
      data: { actorId, action: id ? "coupon.updated" : "coupon.created", targetType: "Coupon", targetId: row.id, summary: { code: row.code, active: row.active } },
    });
    return publicCoupon(row);
  });
}

export async function deactivateCoupon(id: string, actorId: string) {
  const row = await prisma.coupon.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, "NOT_FOUND", "Coupon not found.");
  await prisma.coupon.update({ where: { id }, data: { active: false } });
  await prisma.auditLog.create({ data: { actorId, action: "coupon.deactivated", targetType: "Coupon", targetId: id, summary: { code: row.code } } });
  return { id, active: false as const };
}

export async function releaseCouponUsage(tx: Tx, orderId: string): Promise<void> {
  const usage = await tx.couponUsage.findUnique({ where: { orderId } });
  if (!usage) return;
  await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${usage.couponId} FOR UPDATE`;
  await tx.couponUsage.deleteMany({ where: { orderId } });
}

export async function quoteCouponDiscount(tx: Tx, input: {
  readonly code: string;
  readonly goodsSats: bigint;
  readonly accountId: string | null;
  readonly rateKrwPerBtc: string | null;
}) {
  const code = input.code.trim().toUpperCase();
  if (!code) return null;
  await tx.$queryRaw`SELECT id FROM "Coupon" WHERE code = ${code} FOR UPDATE`;
  const coupon = await tx.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!coupon || !coupon.active || coupon.validFrom > now || coupon.validUntil <= now) {
    throw new HttpError(409, "COUPON_INVALID", "This coupon cannot be used right now.");
  }
  if (input.goodsSats < coupon.minPurchaseAmount) throw new HttpError(409, "COUPON_INVALID", "This coupon cannot be used right now.");
  const used = await tx.couponUsage.count({ where: { couponId: coupon.id } });
  if (coupon.usageLimit !== null && used >= coupon.usageLimit) throw new HttpError(409, "COUPON_INVALID", "This coupon cannot be used right now.");
  if (input.accountId) {
    const mine = await tx.couponUsage.count({ where: { couponId: coupon.id, accountId: input.accountId } });
    if (mine >= coupon.perUserLimit) throw new HttpError(409, "COUPON_INVALID", "This coupon cannot be used right now.");
  }
  let discount = 0n;
  if (coupon.discountKind === "PERCENT") discount = input.goodsSats * coupon.discountValue / 100n;
  else if (coupon.discountKind === "SATS") discount = coupon.discountValue;
  else {
    if (!input.rateKrwPerBtc) throw new HttpError(409, "COUPON_INVALID", "This coupon cannot be used right now.");
    discount = krwToSats(coupon.discountValue, input.rateKrwPerBtc);
  }
  if (coupon.maxDiscountAmount !== null && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
  if (discount <= 0n || discount >= input.goodsSats) throw new HttpError(409, "COUPON_AMOUNT", "This coupon would reduce the total to zero.");
  return { id: coupon.id, code: coupon.code, nameKo: coupon.nameKo, nameEn: coupon.nameEn, discountSats: discount.toString() };
}
