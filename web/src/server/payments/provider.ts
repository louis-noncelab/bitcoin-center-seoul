import "server-only";
import { getServerConfig } from "@/server/config";
import type { Payment } from "@/generated/prisma/client";
import { createLnurlInvoice, readLnurlInvoice } from "./lnurl";
import { createZapriteInvoice, readZapriteInvoice, recoverZapriteInvoice } from "./zaprite";
import { reviewReceiver, reviewTransport } from "./review-transport";
import { liveTransport } from "./transport";
import { metadataSchema, PaymentError, type Receiver, type ProviderContext } from "./types";

function zapriteReceiver(): Receiver {
  const config = getServerConfig();
  if (!config.zaprite) throw new PaymentError("ZAPRITE_NOT_CONFIGURED");
  return { provider: "ZAPRITE", url: config.zaprite.url, accountId: config.zaprite.checkoutId ?? "default" };
}

export function receiverFor(payment: Payment): Receiver {
  const config = getServerConfig();
  if (payment.mode === "REVIEW") {
    if (!["review", "test"].includes(config.appMode)) throw new PaymentError("REVIEW_DISABLED");
    return reviewReceiver[payment.provider];
  }
  if (payment.mode === "SANDBOX") {
    // A sandbox organization is the only provider environment that is safe off production.
    if (config.paymentMode !== "sandbox") throw new PaymentError("SANDBOX_DISABLED");
    if (payment.provider !== "ZAPRITE") throw new PaymentError("SANDBOX_PROVIDER_UNSUPPORTED");
    return zapriteReceiver();
  }
  if (config.appMode !== "production" || config.paymentMode !== "live") throw new PaymentError("LIVE_DISABLED");
  switch (payment.provider) {
    case "LNURL": {
      if (!config.lnurl) throw new PaymentError("LNURL_NOT_CONFIGURED");
      return { provider: "LNURL", ...config.lnurl };
    }
    case "ZAPRITE":
      return zapriteReceiver();
  }
}

export function providerContext(payment: Payment): ProviderContext {
  const receiver = metadataSchema.parse(payment.metadata).receiverSnapshot;
  const current = receiverFor(payment);
  if (!receiver || JSON.stringify(receiver) !== JSON.stringify(current)) throw new PaymentError("RECEIVER_CONFIGURATION_CHANGED");
  if (payment.mode === "REVIEW") return { payment, receiver, transport: reviewTransport(payment) };
  const config = getServerConfig();
  if (receiver.provider === "ZAPRITE") {
    const apiKey = config.zaprite?.apiKey;
    if (!apiKey) throw new PaymentError("ZAPRITE_NOT_CONFIGURED");
    const transport = liveTransport([new URL(receiver.url).origin]);
    return { payment, receiver, transport: (input) => transport({ ...input, headers: { ...input.headers, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }) };
  }
  return { payment, receiver, transport: liveTransport(receiver.allowedOrigins) };
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
