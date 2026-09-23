import "server-only";
import { getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import type { Payment } from "@/generated/prisma/client";
import { createLnurlInvoice, readLnurlInvoice } from "./lnurl";
import { createZapriteInvoice, readZapriteInvoice, recoverZapriteInvoice } from "./zaprite";
import { reviewReceiver, reviewTransport } from "./review-transport";
import { lightningAddressOrigin, liveTransport } from "./transport";
import { metadataSchema, PaymentError, type Receiver, type ProviderContext } from "./types";

function zapriteReceiver(): Receiver {
  const config = getServerConfig();
  if (!config.zaprite) throw new PaymentError("ZAPRITE_NOT_CONFIGURED");
  return { provider: "ZAPRITE", url: config.zaprite.url, accountId: config.zaprite.checkoutId ?? "default" };
}

async function selectedLnurl() {
  const row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { lightningAddress: { select: { address: true, allowedOrigins: true } } } });
  if (!row?.lightningAddress) return null;
  const derived = lightningAddressOrigin(row.lightningAddress.address);
  const allowedOrigins = [...new Set([...(derived ? [derived] : []), ...row.lightningAddress.allowedOrigins.split(",").map((item) => item.trim()).filter(Boolean)])];
  return { lightningAddress: row.lightningAddress.address, allowedOrigins };
}

function assertPaymentMode(payment: Payment) {
  const config = getServerConfig();
  if (payment.mode === "REVIEW") {
    if (!["review", "test"].includes(config.appMode)) throw new PaymentError("REVIEW_DISABLED");
    return;
  }
  if (payment.mode === "SANDBOX") {
    // A sandbox organization is the only provider environment that is safe off production.
    if (config.paymentMode !== "sandbox") throw new PaymentError("SANDBOX_DISABLED");
    if (payment.provider !== "ZAPRITE") throw new PaymentError("SANDBOX_PROVIDER_UNSUPPORTED");
    return;
  }
  if (config.appMode !== "production" || config.paymentMode !== "live") throw new PaymentError("LIVE_DISABLED");
}

export async function receiverFor(payment: Payment): Promise<Receiver> {
  assertPaymentMode(payment);
  if (payment.mode === "REVIEW") return reviewReceiver[payment.provider];
  const config = getServerConfig();
  switch (payment.provider) {
    case "LNURL": {
      const selected = await selectedLnurl();
      const lnurl = selected ?? config.lnurl;
      if (!lnurl) throw new PaymentError("LNURL_NOT_CONFIGURED");
      return { provider: "LNURL", lightningAddress: lnurl.lightningAddress, allowedOrigins: lnurl.allowedOrigins };
    }
    case "ZAPRITE":
      return zapriteReceiver();
  }
}

export async function providerContext(payment: Payment): Promise<ProviderContext> {
  const receiver = metadataSchema.parse(payment.metadata).receiverSnapshot;
  assertPaymentMode(payment);
  if (!receiver || receiver.provider !== payment.provider) throw new PaymentError("RECEIVER_CONFIGURATION_CHANGED");
  // LNURL verification needs no active-account credential: the server-saved invoice, hash and
  // receiver survive selection changes. Zaprite credentials remain bound to the current account.
  if (receiver.provider === "ZAPRITE" && JSON.stringify(receiver) !== JSON.stringify(await receiverFor(payment))) throw new PaymentError("RECEIVER_CONFIGURATION_CHANGED");
  if (payment.mode === "REVIEW") return { payment, receiver, transport: reviewTransport(payment) };
  const config = getServerConfig();
  if (receiver.provider === "ZAPRITE") {
    const apiKey = config.zaprite?.apiKey;
    if (!apiKey) throw new PaymentError("ZAPRITE_NOT_CONFIGURED");
    const transport = liveTransport([new URL(receiver.url).origin]);
    return { payment, receiver, transport: (input) => transport({ ...input, headers: { ...input.headers, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }) };
  }
  return { payment, receiver, transport: liveTransport(null) };
}

export async function createInvoice(context: ProviderContext) {
  switch (context.payment.provider) {
    case "LNURL": return createLnurlInvoice(context);
    case "ZAPRITE": return createZapriteInvoice(context);
  }
}

export async function observeInvoice(context: ProviderContext) {
  switch (context.payment.provider) {
    case "LNURL": return readLnurlInvoice(context);
    case "ZAPRITE": return readZapriteInvoice(context);
  }
}

export async function recoverInvoice(context: ProviderContext) {
  switch (context.payment.provider) {
    // LUD-06 has no standard for finding an invoice whose callback response was lost.
    case "LNURL": return null;
    case "ZAPRITE": return recoverZapriteInvoice(context);
  }
}
