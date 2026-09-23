import "server-only";
import type { CenterEvent } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { eventAcceptsTickets } from "./ticket-eligibility";
import { prisma } from "@/server/db";
import type { EventRecord } from "@/lib/events-contract";
import { nextTicketStock } from "./ticket-stock";

const slugFor = (eventId: number) => `meetup-${eventId}`;
const skuFor = (eventId: number) => `MEETUP-${eventId}`;

// Caller holds the event row lock; checkout uses the same event → product → variant order.
export async function syncEventTicketInTransaction(tx: Tx, event: CenterEvent, previousCapacity = event.ticketCapacity): Promise<void> {
  const slug = slugFor(event.id);
  const existing = await tx.product.findUnique({ where: { slug }, include: { variants: { orderBy: { sku: "asc" } } } });
  const selling = eventAcceptsTickets(event);
  const details = {
    titleKo: event.title, titleEn: event.titleEn, descriptionKo: event.title, descriptionEn: event.titleEn, imageUrl: event.image,
    published: selling, listed: false, priceKind: "KRW_FIXED" as const, priceAmount: BigInt(event.ticketPriceKrw || "0"),
    allowedFulfillments: ["PICKUP" as const],
  };
  if (!existing) {
    if (event.externalPayment || !event.ticketPriceKrw) return;
    await tx.product.create({ data: {
      slug, ...details, memberOnly: false,
      variants: { create: { sku: skuFor(event.id), stockOnHand: event.ticketCapacity, billableWeightG: 0, active: selling } },
    } });
    return;
  }
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${existing.id} FOR UPDATE`;
  const known = existing.variants.find((variant) => variant.sku === skuFor(event.id));
  if (known) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${known.id} FOR UPDATE`;
  const locked = known ? await tx.productVariant.findUniqueOrThrow({ where: { id: known.id } }) : null;
  const stockOnHand = nextTicketStock(locked, previousCapacity, event.ticketCapacity);
  const seat = locked ?? await tx.productVariant.create({ data: { productId: existing.id, sku: skuFor(event.id), stockOnHand, billableWeightG: 0, active: selling } });
  await tx.product.update({ where: { id: existing.id }, data: {
    ...details,
    variants: { update: { where: { id: seat.id }, data: { stockOnHand, active: selling } } },
  } });
}

// Compatibility/reconciliation entry: snapshots and old capacities must never overwrite newer edits.
export async function syncEventTicket(event: Pick<EventRecord, "id">, _previousCapacity?: number): Promise<void> {
  void _previousCapacity;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM center_events WHERE id = ${event.id} FOR UPDATE`;
    const current = await tx.centerEvent.findUnique({ where: { id: event.id } });
    if (current) await syncEventTicketInTransaction(tx, current);
    else await retireEventTicketInTransaction(tx, event.id);
  });
}

export async function retireEventTicketInTransaction(tx: Tx, eventId: number): Promise<void> {
  await tx.product.updateMany({ where: { slug: slugFor(eventId) }, data: { published: false } });
}

export async function meetupPaymentHrefs(eventIds: readonly number[]): Promise<Readonly<Record<number, string>>> {
  if (!eventIds.length) return {};
  try {
    const events = await prisma.centerEvent.findMany({ where: { id: { in: [...eventIds] } } });
    const eligibleIds = events.filter((event) => eventAcceptsTickets(event)).map((event) => event.id);
    const products = await prisma.product.findMany({
      where: { slug: { in: eligibleIds.map(slugFor) }, published: true, listed: false },
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
