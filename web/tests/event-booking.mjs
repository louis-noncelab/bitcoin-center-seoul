import assert from "node:assert/strict";
import { test } from "node:test";
import { eventBookingHref, isSaturdayBlockUrl } from "../src/lib/event-booking.ts";

const today = "2026-09-20";
const bookingUrl = "https://saturdayblock.com/events/meetup?ticket=early&source=center#reserve";

test("booking keeps the event-specific URL for today and future Seoul dates", () => {
  for (const date of [today, "2026-09-21", "2027-01-01", "2026.09.20", " 2026.09.21 "]) {
    assert.equal(eventBookingHref(bookingUrl, date, today), bookingUrl, date);
  }
  assert.equal(eventBookingHref(`  ${bookingUrl}  `, today, today), bookingUrl);
  const httpUrl = "http://tickets.example.test/event/123?slot=2&code=abc#checkout";
  assert.equal(eventBookingHref(httpUrl, today, today), httpUrl);
});

test("booking hides empty, relative, malformed and unsafe destinations", () => {
  for (const link of ["", "   ", "/events/meetup", "//saturdayblock.com/events/meetup", "not a URL", "https://", "https://[invalid", "javascript:alert(1)", "data:text/html,fixture", "mailto:booking@example.test", "ftp://example.test/event"]) {
    assert.equal(eventBookingHref(link, today, today), undefined, link);
  }
});

test("booking ends on the supplied Seoul date boundary", () => {
  assert.equal(eventBookingHref(bookingUrl, "2026-09-19", today), undefined);
  assert.equal(eventBookingHref(bookingUrl, "2026.09.19", today), undefined);
  assert.equal(eventBookingHref(bookingUrl, "2026-09-20", "2026-09-21"), undefined);
  assert.equal(eventBookingHref(bookingUrl, "2026-09-20", "2026-09-19"), bookingUrl);
});

test("booking requires real calendar dates", () => {
  for (const date of ["", "invalid", "2026-9-20", "2026-13-01", "2026-09-31", "2027-02-29", "2026-00-20", "2026-09-00", "2026-09-20T00:00:00Z"]) {
    assert.equal(eventBookingHref(bookingUrl, date, today), undefined, date);
  }
  assert.equal(eventBookingHref(bookingUrl, "2028-02-29", today), bookingUrl);
});

test("SatB branding uses only the exact provider hostname", () => {
  for (const link of [bookingUrl, "https://www.saturdayblock.com/events/a", "https://SATURDAYBLOCK.COM/events/a", "http://saturdayblock.com/events/a", " https://www.saturdayblock.com/events/a "]) {
    assert.equal(isSaturdayBlockUrl(link), true, link);
  }
  for (const link of ["", "invalid", "javascript:alert(1)", "https://saturdayblock.com.attacker.test/events/a", "https://fake-saturdayblock.com/events/a", "https://tickets.saturdayblock.com/events/a", "https://saturdayblock.com@attacker.test/events/a", "https://attacker.test/saturdayblock.com", "https://attacker.test/?next=https://saturdayblock.com"]) {
    assert.equal(isSaturdayBlockUrl(link), false, link);
  }
});

test("manual closure suppresses participation while preserving the configured URL for reopening", () => {
  assert.equal(eventBookingHref(bookingUrl, today, today, true), undefined);
  assert.equal(eventBookingHref(bookingUrl, today, today, false), bookingUrl);
});
