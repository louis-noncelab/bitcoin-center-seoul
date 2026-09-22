import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { countrySchema, rateSchema, zoneSchema } from "./validation";

type ShippingMutation =
  | { readonly action: "zone.create"; readonly data: z.output<typeof zoneSchema> }
  | { readonly action: "zone.update"; readonly id: string; readonly data: z.output<typeof zoneSchema> }
  | { readonly action: "zone.delete"; readonly id: string }
  | { readonly action: "country.create"; readonly data: z.output<typeof countrySchema> }
  | { readonly action: "country.update"; readonly data: z.output<typeof countrySchema> }
  | { readonly action: "country.delete"; readonly id: string }
  | { readonly action: "rate.create"; readonly data: z.output<typeof rateSchema> }
  | { readonly action: "rate.update"; readonly id: string; readonly data: z.output<typeof rateSchema> }
  | { readonly action: "rate.delete"; readonly id: string };

export async function mutateShipping(actorId: string, mutation: ShippingMutation) {
  try {
    return await prisma.$transaction(async (tx) => {
      // ponytail: global shipping-config lock; use per-zone locks if configuration writes contend.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('shipping-config', 0))`;
      let result: { id: string } | { code: string };
      switch (mutation.action) {
        case "zone.create":
          result = await tx.shippingZone.create({ data: mutation.data });
          break;
        case "zone.update":
          result = await tx.shippingZone.update({ where: { id: mutation.id }, data: mutation.data });
          break;
        case "zone.delete":
          result = await tx.shippingZone.delete({ where: { id: mutation.id } });
          break;
        case "country.create":
          result = await tx.shippingCountry.create({ data: mutation.data });
          break;
        case "country.update":
          result = await tx.shippingCountry.update({ where: { code: mutation.data.code }, data: mutation.data });
          break;
        case "country.delete":
          result = await tx.shippingCountry.delete({ where: { code: mutation.id } });
          break;
        case "rate.create":
          result = await tx.shippingRate.create({ data: mutation.data });
          break;
        case "rate.update":
          result = await tx.shippingRate.update({ where: { id: mutation.id }, data: mutation.data });
          break;
        case "rate.delete":
          result = await tx.shippingRate.delete({ where: { id: mutation.id } });
          break;
        default: {
          const exhaustive: never = mutation;
          throw new HttpError(400, "INVALID_SHIPPING_ACTION", `Invalid shipping action: ${exhaustive}`);
        }
      }
      await tx.auditLog.create({ data: {
        actorId, action: `shipping.${mutation.action}`, targetType: "Shipping", targetId: "id" in result ? result.id : result.code,
        summary: { action: mutation.action },
      } });
      return result;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new HttpError(409, "SHIPPING_DUPLICATE", "이미 등록된 국가 또는 무게 구간입니다.");
      if (error.code === "P2003") throw new HttpError(409, "SHIPPING_REFERENCE", "배송 지역을 확인하거나 연결된 국가와 요금을 먼저 삭제해 주세요.");
      if (error.code === "P2025") throw new HttpError(404, "SHIPPING_NOT_FOUND", "배송 설정을 찾을 수 없습니다.");
    }
    throw error;
  }
}
