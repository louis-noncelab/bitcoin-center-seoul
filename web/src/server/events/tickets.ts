import "server-only";
import { prisma } from "@/server/db";
import type { EventRecord } from "@/lib/events-contract";
import { nextTicketStock } from "./ticket-stock";

const slugFor = (eventId: number) => `meetup-${eventId}`;
const skuFor = (eventId: number) => `MEETUP-${eventId}`;

export async function syncEventTicket(event: EventRecord, previousCapacity = event.ticketCapacity): Promise<void> {
  const slug = slugFor(event.id);
  if (event.externalPayment || !event.ticketPriceKrw) {
    await prisma.product.updateMany({ where: { slug }, data: { published: false } });
    return;
  }
  const selling = !event.registrationClosed;
  const imageUrl = event.images[0] ?? event.image;
  const details = {
    titleKo: event.title, titleEn: event.titleEn, descriptionKo: event.title, descriptionEn: event.titleEn, imageUrl,
    published: selling, listed: false, priceKind: "KRW_FIXED" as const, priceAmount: BigInt(event.ticketPriceKrw),
    allowedFulfillments: ["PICKUP" as const],
  };
  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { slug }, include: { variants: { orderBy: { sku: "asc" }, take: 1 } } });
    if (!existing) {
      await tx.product.create({ data: {
        slug, ...details, memberOnly: false,
        variants: { create: { sku: skuFor(event.id), stockOnHand: event.ticketCapacity, billableWeightG: 0, active: selling } },
      } });
      return;
    }
    // Same lock order as order creation: product, then variant. Stock is read after the lock.
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${existing.id} FOR UPDATE`;
    const known = existing.variants[0];
    if (known) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${known.id} FOR UPDATE`;
    const locked = known ? await tx.productVariant.findUniqueOrThrow({ where: { id: known.id } }) : null;
    const stockOnHand = nextTicketStock(locked, previousCapacity, event.ticketCapacity);
    const seat = locked ?? await tx.productVariant.create({ data: { productId: existing.id, sku: skuFor(event.id), stockOnHand, billableWeightG: 0, active: selling } });
    await tx.product.update({ where: { id: existing.id }, data: {
      ...details,
      variants: { update: { where: { id: seat.id }, data: { stockOnHand, active: selling } } },
    } });
  });
}

export async function retireEventTicket(eventId: number): Promise<void> {
  await prisma.product.updateMany({ where: { slug: slugFor(eventId) }, data: { published: false } });
}

export async function meetupPaymentHrefs(eventIds: readonly number[]): Promise<Readonly<Record<number, string>>> {
  if (!eventIds.length) return {};
  try {
    const products = await prisma.product.findMany({
      where: { slug: { in: eventIds.map(slugFor) }, published: true, listed: false },
      include: { variants: { where: { active: true }, take: 1 } },
    });
    return Object.fromEntries(products.flatMap((product) => {
      const eventId = Number(product.slug.slice("meetup-".length));
      const variant = product.variants[0];
      return variant && eventIds.includes(eventId) ? [[eventId, `/checkout?variant=${variant.id}&quantity=1&kind=meetup`] as const] : [];
    }));
  } catch {
    // Event pages keep rendering when the shop database is not configured.
    return {};
  }
}
