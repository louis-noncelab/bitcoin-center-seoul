import "server-only";
import type { Fulfillment } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/server/db";
import { HttpError } from "@/server/http";
import { countryCodeSchema, weightSchema } from "./validation";

export type ShippingSnapshot = {
  readonly fulfillment: Fulfillment;
  readonly countryCode: string | null;
  readonly requiresPostalCode: boolean;
  readonly weightG: number;
  readonly zoneId: string | null;
  readonly zoneNameKo: string | null;
  readonly zoneNameEn: string | null;
  readonly rateId: string | null;
  readonly maxWeightG: number | null;
  readonly amountKrw: string;
};

export async function quoteShipping(tx: Tx, input: {
  readonly fulfillment: Fulfillment;
  readonly countryCode?: string | undefined;
  readonly weightG: number;
}): Promise<ShippingSnapshot> {
  switch (input.fulfillment) {
    case "PICKUP":
      return { fulfillment: "PICKUP", countryCode: null, requiresPostalCode: false, weightG: 0,
        zoneId: null, zoneNameKo: null, zoneNameEn: null, rateId: null, maxWeightG: null, amountKrw: "0" };
    case "DOMESTIC":
    case "INTERNATIONAL":
      break;
    default: {
      const exhaustive: never = input.fulfillment;
      throw new HttpError(422, "INVALID_FULFILLMENT", `Invalid fulfillment: ${exhaustive}`);
    }
  }
  const countryCode = countryCodeSchema.parse(input.countryCode);
  const weightG = weightSchema.parse(input.weightG);
  if ((input.fulfillment === "DOMESTIC") !== (countryCode === "KR")) {
    throw new HttpError(422, "SHIPPING_COUNTRY_MISMATCH", "선택한 수령 방법과 국가가 일치하지 않습니다.");
  }
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended('shipping-config', 0))`;
  const country = await tx.shippingCountry.findUnique({
    where: { code: countryCode },
    include: { zone: { include: { rates: { where: { maxWeightG: { gte: weightG } }, orderBy: { maxWeightG: "asc" }, take: 1 } } } },
  });
  const rate = country?.zone.rates[0];
  if (!country?.zone.active || !rate || rate.amountKrw < 0n) {
    throw new HttpError(422, "SHIPPING_UNAVAILABLE", "이 국가 또는 무게에 등록된 배송 요금이 없습니다.");
  }
  return { fulfillment: input.fulfillment, countryCode, requiresPostalCode: country.requiresPostalCode,
    weightG, zoneId: country.zone.id, zoneNameKo: country.zone.nameKo, zoneNameEn: country.zone.nameEn,
    rateId: rate.id, maxWeightG: rate.maxWeightG, amountKrw: rate.amountKrw.toString() };
}

export async function shippingCountries() {
  return prisma.shippingCountry.findMany({
    where: { zone: { active: true, rates: { some: {} } } },
    orderBy: { code: "asc" },
    select: { code: true, requiresPostalCode: true, zone: { select: { nameKo: true, nameEn: true } } },
  });
}
