import "server-only";
import { z } from "zod";
import type { BtcPriceSource, PaymentProvider, ProductDisplayUnit } from "@/generated/prisma/client";
import { getServerConfig, type ServerConfig } from "@/server/config";
import { prisma, type Tx } from "@/server/db";
import { encryptWebhookUrl } from "@/server/commerce/notifications";
import { HttpError } from "@/server/http";

export type CommerceSettings = {
  readonly paymentProvider: PaymentProvider;
  readonly btcPriceSource: BtcPriceSource;
  readonly fixedKrwPerBtc: string | null;
  readonly productDisplayUnit: ProductDisplayUnit;
  readonly notificationEmail: string;
};

export function configuredPaymentProviders(config: ServerConfig = getServerConfig()): Readonly<Record<PaymentProvider, boolean>> {
  if (config.paymentMode === "review") return { LNURL: true, ZAPRITE: true };
  // A lightning address has no test network, so the sandbox exposes Zaprite only.
  if (config.paymentMode === "sandbox") return { LNURL: false, ZAPRITE: Boolean(config.zaprite) };
  return {
    LNURL: Boolean(config.lnurl),
    ZAPRITE: Boolean(config.zaprite),
  };
}

export async function assertProviderConfigured(provider: PaymentProvider, config: ServerConfig = getServerConfig()) {
  if (config.paymentMode === "review") return;
  if (provider === "LNURL" && config.paymentMode === "live" && !config.lnurl) {
    if (await prisma.lightningAddress.count()) return;
  }
  const ready = configuredPaymentProviders(config)[provider];
  if (!ready) throw new HttpError(503, `${provider}_NOT_CONFIGURED`, "선택한 결제 제공자가 설정되어 있지 않습니다. / The selected payment provider is not configured.");
}

function rowSettings(row: {
  readonly paymentProvider: PaymentProvider | null;
  readonly btcPriceSource: BtcPriceSource;
  readonly fixedKrwPerBtc: { toString(): string } | null;
  readonly productDisplayUnit: ProductDisplayUnit;
  readonly notificationEmail?: string | null;
} | null): CommerceSettings {
  return {
    paymentProvider: row?.paymentProvider ?? "ZAPRITE",
    btcPriceSource: row?.btcPriceSource ?? "UPBIT",
    fixedKrwPerBtc: row?.fixedKrwPerBtc ? row.fixedKrwPerBtc.toString() : null,
    productDisplayUnit: row?.productDisplayUnit ?? "SATS",
    notificationEmail: row?.notificationEmail?.trim() || "hello@noncelab.com",
  };
}

export async function getCommerceSettings(tx?: Tx): Promise<CommerceSettings> {
  const db = tx ?? prisma;
  return rowSettings(await db.siteSetting.findUnique({
    where: { id: "site" },
    select: { paymentProvider: true, btcPriceSource: true, fixedKrwPerBtc: true, productDisplayUnit: true, notificationEmail: true },
  }));
}

export async function activePaymentProvider(tx?: Tx): Promise<PaymentProvider> {
  const settings = await getCommerceSettings(tx);
  await assertProviderConfigured(settings.paymentProvider);
  return settings.paymentProvider;
}

export const commerceSettingsSchema = z.object({
  paymentProvider: z.enum(["LNURL", "ZAPRITE"]),
  btcPriceSource: z.enum(["UPBIT", "BITHUMB", "FIXED"]),
  // Only meaningful with FIXED; stored as a decimal string so BigInt maths stays exact.
  fixedKrwPerBtc: z.union([z.literal(""), z.string().regex(/^[1-9]\d{0,14}(\.\d{1,10})?$/)]),
  productDisplayUnit: z.enum(["KRW", "SATS", "BTC"]),
  guestPurchaseAllowed: z.boolean(),
  maintenanceMode: z.boolean(),
  lightningAddressId: z.string().min(1).nullable().optional(),
  notificationChannel: z.enum(["DISCORD", "MATTERMOST", "GENERIC"]).optional(),
  notificationWebhook: z.union([z.literal(""), z.string().url().startsWith("https://")]).optional(),
  clearNotificationWebhook: z.boolean().optional(),
  notificationEmail: z.string().trim().email().max(200),
}).strict().superRefine((value, ctx) => {
  if (value.btcPriceSource === "FIXED" && !value.fixedKrwPerBtc) {
    ctx.addIssue({ code: "custom", message: "고정 환율을 입력해 주세요. / Enter a fixed rate.", path: ["fixedKrwPerBtc"] });
  }
});
export type CommerceSettingsInput = z.infer<typeof commerceSettingsSchema>;

export async function adminSettings() {
  const [row, lightningAddresses] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "site" }, include: { lightningAddress: true } }),
    prisma.lightningAddress.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, label: true, address: true, allowedOrigins: true } }),
  ]);
  const configured = { ...configuredPaymentProviders() };
  if (getServerConfig().paymentMode === "live" && lightningAddresses.length > 0) configured.LNURL = true;
  return {
    paymentProvider: row?.paymentProvider ?? "ZAPRITE",
    btcPriceSource: row?.btcPriceSource ?? "UPBIT",
    fixedKrwPerBtc: row?.fixedKrwPerBtc?.toString() ?? "",
    productDisplayUnit: row?.productDisplayUnit ?? "SATS",
    guestPurchaseAllowed: row?.guestPurchaseAllowed ?? true,
    maintenanceMode: row?.maintenanceMode ?? false,
    lightningAddressId: row?.lightningAddressId ?? null,
    lightningAddresses,
    notificationChannel: row?.notificationChannel ?? "GENERIC",
    notificationWebhookRegistered: Boolean(row?.notificationWebhook),
    notificationEmail: row?.notificationEmail ?? "hello@noncelab.com",
    configured,
  };
}

export async function updateCommerceSettings(input: CommerceSettingsInput, actorId: string) {
  // Refuse to select a provider the running configuration cannot actually reach.
  await assertProviderConfigured(input.paymentProvider);
  if (input.lightningAddressId) {
    const found = await prisma.lightningAddress.findUnique({ where: { id: input.lightningAddressId }, select: { id: true } });
    if (!found) throw new HttpError(400, "LIGHTNING_ADDRESS_NOT_FOUND", "선택한 라이트닝 주소를 찾을 수 없습니다.");
  }
  const data = {
    paymentProvider: input.paymentProvider,
    btcPriceSource: input.btcPriceSource,
    fixedKrwPerBtc: input.fixedKrwPerBtc === "" ? null : input.fixedKrwPerBtc,
    productDisplayUnit: input.productDisplayUnit,
    notificationEmail: input.notificationEmail,
    guestPurchaseAllowed: input.guestPurchaseAllowed,
    maintenanceMode: input.maintenanceMode,
    ...(input.lightningAddressId !== undefined ? { lightningAddressId: input.lightningAddressId } : {}),
    ...(input.notificationChannel ? { notificationChannel: input.notificationChannel } : {}),
    ...(input.clearNotificationWebhook ? { notificationWebhook: null } : {}),
    ...(input.notificationWebhook ? { notificationWebhook: encryptWebhookUrl(input.notificationWebhook) } : {}),
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
