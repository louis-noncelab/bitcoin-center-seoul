import "server-only";
import { ticketEventId } from "@/server/events/ticket-eligibility";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { activePaymentProvider } from "@/server/commerce/settings";
import { getServerConfig, paymentModeOf } from "@/server/config";
import { enqueueOperatorLetter, enqueuePaymentLetter } from "@/server/email/payment-letter";
import { scheduleEmailDelivery } from "@/server/email/queue";
import { customerEmailHash, sealString } from "@/server/privacy";
import { HttpError } from "@/server/http";
import { quoteShipping } from "@/server/shipping";
import { cartSchema, type CreateOrder } from "./validation";
import { hashToken, matchesToken, readAccessToken, requestIdentity, resourceToken, type CustomerAccount } from "./access";
import { quoteCouponDiscount } from "@/server/commerce/coupons";
import { cartProducts, quoteSnapshot } from "./quote";
import { orderIncludes, orderView } from "./projection";

export async function createOrder(request: Request, input: CreateOrder, account: CustomerAccount) {
  const identity = requestIdentity(request, account);
  const requestHash = hashToken(JSON.stringify(input));
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`order:${identity.scope}:${identity.key}`}, 0))`;
    const existing = await tx.order.findUnique({ where: { idempotencyScope_idempotencyKey: { idempotencyScope: identity.scope, idempotencyKey: identity.key } }, include: orderIncludes });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for different data.");
      if (identity.secret && existing.accessTokenExpiresAt <= new Date()) throw new HttpError(404, "NOT_FOUND", "The access link has expired.");
      const token = identity.secret ? resourceToken(identity, "order", existing.id) : null;
      if (account?.id !== existing.accountId && !matchesToken(token, existing.accessTokenHash)) throw new HttpError(404, "NOT_FOUND", "Order not found.");
      return { order: orderView(existing), token, created: false };
    }
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${input.quoteId} FOR UPDATE`;
    const quote = await tx.quote.findUnique({ where: { id: input.quoteId }, include: { order: { select: { id: true } } } });
    if (!quote || (account?.id !== quote.accountId && !matchesToken(readAccessToken(request, "quote", input.quoteId), quote.ownerHash))) throw new HttpError(404, "NOT_FOUND", "Quote not found.");
    if (quote.expiresAt <= new Date() || quote.order) throw new HttpError(409, "QUOTE_EXPIRED", "Request a fresh quote before continuing.");
    const cart = cartSchema.parse(quote.input);
    const snapshot = quoteSnapshot.parse(quote.snapshot);
    const eventIds = snapshot.items.flatMap((item) => {
      const id = ticketEventId(item.sku);
      return id === null ? [] : [id];
    });
    for (const id of [...new Set(eventIds)].sort((a, b) => a - b)) await tx.$queryRaw`SELECT id FROM center_events WHERE id = ${id} FOR UPDATE`;
    for (const id of [...new Set(snapshot.items.map((item) => item.productId))].sort()) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    for (const item of [...snapshot.items].sort((a, b) => a.sku.localeCompare(b.sku))) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
    const variants = await cartProducts(tx, cart, account);
    for (const item of snapshot.items) {
      const variant = variants.find((value) => value.id === item.variantId);
      if (!variant || variant.product.updatedAt.toISOString() !== item.productVersion || variant.product.priceAmount.toString() !== item.unitPriceAmount || variant.sku !== item.sku || variant.optionLabelKo !== item.optionLabelKo || variant.optionLabelEn !== item.optionLabelEn || variant.billableWeightG !== item.billableWeightG) throw new HttpError(409, "QUOTE_STALE", "Product details changed. Please review a new quote.");
      if (variant.stockOnHand - variant.reservedStock < item.quantity) throw new HttpError(409, "OUT_OF_STOCK", "The selected quantity is no longer available.");
    }
    const shipping = await quoteShipping(tx, { fulfillment: cart.fulfillment, ...(cart.countryCode ? { countryCode: cart.countryCode } : {}), weightG: snapshot.shipping.weightG });
    if (JSON.stringify(shipping) !== JSON.stringify(snapshot.shipping)) throw new HttpError(409, "QUOTE_STALE", "Shipping rates changed. Please review a new quote.");
    if (snapshot.coupon) {
      const goodsSats = snapshot.items.reduce((sum, item) => sum + BigInt(item.amountSats), 0n);
      const live = await quoteCouponDiscount(tx, {
        code: snapshot.coupon.code,
        goodsSats,
        accountId: account?.id ?? null,
        rateKrwPerBtc: quote.rateKrwPerBtc?.toString() ?? null,
      });
      if (!live || live.id !== snapshot.coupon.id || live.discountSats !== snapshot.coupon.discountSats) {
        throw new HttpError(409, "QUOTE_STALE", "Coupon details changed. Please review a new quote.");
      }
    }
    if (cart.fulfillment === "PICKUP") {
      if (input.address) throw new HttpError(400, "ADDRESS_NOT_REQUIRED", "Pickup orders must not include a shipping address.");
    } else {
      if (!input.address || input.address.countryCode !== shipping.countryCode || !input.customer.phone) throw new HttpError(400, "ADDRESS_REQUIRED", "Complete the shipping address and contact phone.");
      if ((shipping.requiresPostalCode || cart.fulfillment === "DOMESTIC") && !input.address.postalCode) throw new HttpError(400, "POSTAL_CODE_REQUIRED", "Postal code is required for this country.");
      if (cart.fulfillment === "DOMESTIC" && !/^\d{5}$/.test(input.address.postalCode)) throw new HttpError(400, "INVALID_POSTAL_CODE", "Enter a five-digit Korean postal code.");
    }
    const id = randomUUID();
    const token = resourceToken(identity, "order", id);
    const config = getServerConfig();
    const holdExpiresAt = new Date(Date.now() + config.paymentPendingTtlMinutes * 60000);
    for (const item of snapshot.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { reservedStock: { increment: item.quantity } } });
    const order = await tx.order.create({ data: {
      id, accountId: account?.id ?? null, quoteId: quote.id,
      customerName: sealString(input.customer.name), customerEmail: sealString(input.customer.email), customerEmailHash: customerEmailHash(input.customer.email), customerPhone: sealString(input.customer.phone), locale: input.locale,
      customerNotes: sealString(input.notes ?? ""),
      amountSats: quote.amountSats, amountKrw: quote.amountKrw, fulfillment: snapshot.fulfillment, ...(input.address ? { address: sealString(JSON.stringify(input.address)) } : {}),
      shippingSnapshot: snapshot.shipping, shippingAmountKrw: BigInt(snapshot.shipping.amountKrw), shippingAmountSats: BigInt(snapshot.shippingAmountSats), billableWeightG: snapshot.shipping.weightG,
      holdExpiresAt, idempotencyScope: identity.scope, idempotencyKey: identity.key, requestHash, confirmationCode: randomBytes(12).toString("hex"), accessTokenHash: hashToken(token),
      items: { create: snapshot.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity, sku: item.sku, titleKo: item.titleKo, titleEn: item.titleEn, optionLabelKo: item.optionLabelKo, optionLabelEn: item.optionLabelEn, priceKind: item.priceKind, unitPriceAmount: BigInt(item.unitPriceAmount), amountSats: BigInt(item.amountSats), snapshot: item })) },
      payments: { create: { provider: await activePaymentProvider(tx), mode: paymentModeOf(config), creationKey: randomUUID(), amountSats: quote.amountSats, metadata: { orderId: id }, expiresAt: holdExpiresAt } },
    }, include: orderIncludes });
    if (snapshot.coupon) {
      await tx.couponUsage.create({
        data: {
          couponId: snapshot.coupon.id,
          orderId: order.id,
          accountId: account?.id ?? null,
          discountSats: BigInt(snapshot.coupon.discountSats),
        },
      });
    }
    await enqueuePaymentLetter(tx, {
      eventKey: `order:${id}:created`,
      to: input.customer.email,
      locale: input.locale,
      kind: "order.created",
      order,
      url: `${config.appOrigin}/${input.locale}/orders/confirm/${order.confirmationCode}`,
    });
    const address = input.address;
    await enqueueOperatorLetter(tx, {
      eventKey: `operator:${id}:created`,
      kind: "operator.created",
      order,
      contact: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        address: address ? [address.postalCode, address.region, address.city, address.line1, address.line2].filter(Boolean).join(" ") : "",
      },
    });
    return { order: orderView(order), token: account ? null : token, created: true };
  });
  if (result.created) scheduleEmailDelivery();
  return result;
}
