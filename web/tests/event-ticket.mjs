import assert from "node:assert/strict";
import test from "node:test";
import { eventInputSchema } from "../src/lib/events-contract.ts";
import { nextTicketStock } from "../src/server/events/ticket-stock.ts";

const event = {
  venueType: "center", slug: "", tags: [], title: "밋업", titleEn: "Meetup", date: "2026-10-01", time: "19:00",
  location: "", locationEn: "", description: "센터에서 만나는 밋업입니다.", descriptionEn: "A meetup at the center.",
  image: "", link: "", images: [],
};

test("center payment is chosen with the external-link toggle off", () => {
  assert.equal(eventInputSchema.safeParse(event).success, true);
  assert.equal(eventInputSchema.parse(event).externalPayment, true);
  assert.equal(eventInputSchema.safeParse({ ...event, externalPayment: false }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...event, externalPayment: false, ticketPriceKrw: "5000", ticketCapacity: 10 }).success, true);
  assert.equal(eventInputSchema.safeParse({ ...event, externalPayment: true, link: "https://pay.example.com/meetup" }).success, true);
});

test("ticket stock follows capacity changes without releasing a held seat", () => {
  assert.equal(nextTicketStock(null, 0, 20), 20);
  assert.equal(nextTicketStock({ stockOnHand: 18, reservedStock: 2 }, 20, 25), 23);
  assert.throws(() => nextTicketStock({ stockOnHand: 18, reservedStock: 2 }, 20, 1), { code: "CAPACITY_BELOW_COMMITMENTS" });
});

test("rejected capacity reduction preserves the next capacity calculation", () => {
  // Given: eight sold and two remaining.
  const stock = { stockOnHand: 2, reservedStock: 0 };
  // When / Then: an impossible reduction fails; preserving capacity still leaves two seats.
  assert.throws(() => nextTicketStock(stock, 10, 1), { code: "CAPACITY_BELOW_COMMITMENTS" });
  assert.equal(nextTicketStock(stock, 10, 10), 2);
});
