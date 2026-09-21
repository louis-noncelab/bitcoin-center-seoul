import "server-only";
import { z } from "zod";
import type { BtcPriceSource, PaymentProvider, ProductDisplayUnit } from "@/generated/prisma/client";
import { getServerConfig, type ServerConfig } from "@/server/config";
import { prisma, type Tx } from "@/server/db";
import { HttpError } from "@/server/http";

export type CommerceSettings = {
  readonly paymentProvider: PaymentProvider;
  readonly btcPriceSource: BtcPriceSource;
  readonly fixedKrwPerBtc: string | null;
  readonly productDisplayUnit: ProductDisplayUnit;
};

export function envPaymentProvider(config: ServerConfig = getServerConfig()): PaymentProvider {
  switch (config.paymentProvider) {
    case "lnurl": return "LNURL";
    case "zaprite": return "ZAPRITE";
  }
}

export function configuredPaymentProviders(config: ServerConfig = getServerConfig()): Readonly<Record<PaymentProvider, boolean>> {
  if (config.paymentMode === "review") return { LNURL: true, ZAPRITE: true };
  // A lightning address has no test network, so the sandbox exposes Zaprite only.
  if (config.paymentMode === "sandbox") return { LNURL: false, ZAPRITE: Boolean(config.zaprite) };
  return {
    LNURL: Boolean(config.lnurl),
    ZAPRITE: Boolean(config.zaprite),
  };
}

export function assertProviderConfigured(provider: PaymentProvider, config: ServerConfig = getServerConfig()) {
  if (config.paymentMode === "review") return;
  const ready = configuredPaymentProviders(config)[provider];
  if (!ready) throw new HttpError(503, `${provider}_NOT_CONFIGURED`, "선택한 결제 제공자가 설정되어 있지 않습니다. / The selected payment provider is not configured.");
}

function rowSettings(row: {
  readonly paymentProvider: PaymentProvider | null;
  readonly btcPriceSource: BtcPriceSource;
  readonly fixedKrwPerBtc: { toString(): string } | null;
  readonly productDisplayUnit: ProductDisplayUnit;
} | null): CommerceSettings {
  return {
    paymentProvider: row?.paymentProvider ?? envPaymentProvider(),
    btcPriceSource: row?.btcPriceSource ?? "UPBIT",
    fixedKrwPerBtc: row?.fixedKrwPerBtc ? row.fixedKrwPerBtc.toString() : null,
    productDisplayUnit: row?.productDisplayUnit ?? "SATS",
  };
}

export async function getCommerceSettings(tx?: Tx): Promise<CommerceSettings> {
  const db = tx ?? prisma;
  return rowSettings(await db.siteSetting.findUnique({
    where: { id: "site" },
    select: { paymentProvider: true, btcPriceSource: true, fixedKrwPerBtc: true, productDisplayUnit: true },
  }));
}

export async function activePaymentProvider(tx?: Tx): Promise<PaymentProvider> {
  const settings = await getCommerceSettings(tx);
  assertProviderConfigured(settings.paymentProvider);
  return settings.paymentProvider;
}

export const commerceSettingsSchema = z.object({
  paymentProvider: z.enum(["LNURL", "ZAPRITE"]),
  btcPriceSource: z.enum(["UPBIT", "BITHUMB", "FIXED"]),
  // Only meaningful with FIXED; stored as a decimal string so BigInt maths stays exact.
  fixedKrwPerBtc: z.union([z.literal(""), z.string().regex(/^[1-9]\d{0,14}(\.\d{1,10})?$/)]),
  productDisplayUnit: z.enum(["SATS", "BTC"]),
  guestPurchaseAllowed: z.boolean(),
  maintenanceMode: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.btcPriceSource === "FIXED" && !value.fixedKrwPerBtc) {
    ctx.addIssue({ code: "custom", message: "고정 환율을 입력해 주세요. / Enter a fixed rate.", path: ["fixedKrwPerBtc"] });
  }
});
export type CommerceSettingsInput = z.infer<typeof commerceSettingsSchema>;

export async function adminSettings() {
  const row = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  return {
    paymentProvider: row?.paymentProvider ?? envPaymentProvider(),
    btcPriceSource: row?.btcPriceSource ?? "UPBIT",
    fixedKrwPerBtc: row?.fixedKrwPerBtc?.toString() ?? "",
    productDisplayUnit: row?.productDisplayUnit ?? "SATS",
    guestPurchaseAllowed: row?.guestPurchaseAllowed ?? true,
    maintenanceMode: row?.maintenanceMode ?? false,
    configured: configuredPaymentProviders(),
  };
}

export async function updateCommerceSettings(input: CommerceSettingsInput, actorId: string) {
  // Refuse to select a provider the running configuration cannot actually reach.
  assertProviderConfigured(input.paymentProvider);
  const data = {
    paymentProvider: input.paymentProvider,
    btcPriceSource: input.btcPriceSource,
    fixedKrwPerBtc: input.fixedKrwPerBtc === "" ? null : input.fixedKrwPerBtc,
    productDisplayUnit: input.productDisplayUnit,
    guestPurchaseAllowed: input.guestPurchaseAllowed,
    maintenanceMode: input.maintenanceMode,
  };
  await prisma.$transaction(async (tx) => {
    await tx.siteSetting.upsert({ where: { id: "site" }, update: data, create: { id: "site", ...data } });
    await tx.auditLog.create({ data: {
      actorId, action: "settings.updated", targetType: "SiteSetting", targetId: "site",
      summary: { paymentProvider: data.paymentProvider, btcPriceSource: data.btcPriceSource },
    } });
  });
  return adminSettings();
}
