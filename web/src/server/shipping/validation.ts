import { z } from "zod";

// Registered ISO 3166-1 alpha-2 codes; reserved/exceptional codes are not shipping destinations.
const countries = new Set((
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ " +
  "TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" "));

export const countryCodeSchema = z.string().trim().toUpperCase().refine((code) => countries.has(code), "등록된 ISO 국가 코드가 필요합니다.");
export const idSchema = z.string().trim().min(1).max(100);
export const weightSchema = z.number().int().min(1).max(1_000_000);
export const zoneSchema = z.strictObject({
  nameKo: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  active: z.boolean().default(true),
});
export const countrySchema = z.strictObject({
  code: countryCodeSchema,
  zoneId: idSchema,
  requiresPostalCode: z.boolean().default(true),
});
export const rateSchema = z.strictObject({
  zoneId: idSchema,
  maxWeightG: weightSchema,
  amountKrw: z.string().regex(/^(0|[1-9]\d{0,18})$/).transform(BigInt)
    .refine((amount) => amount <= 9_223_372_036_854_775_807n),
});
export const shippingInputSchema = z.strictObject({
  fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]),
  countryCode: countryCodeSchema.optional(),
  weightG: z.number().int().min(0).max(1_000_000),
});
