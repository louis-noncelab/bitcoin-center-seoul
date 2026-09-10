import assert from "node:assert/strict";
import test from "node:test";
import { eventWindow, resolveCenterStatus } from "../src/server/center-schedule.ts";
import { seoulDate } from "../src/lib/center-status.ts";

const at = (date, time) => new Date(`${date}T${time}+09:00`);
const event = (date, time) => ({ date, time });
const exception = (date, status) => ({ date, status });

test("daily Seoul hours, public holidays, exceptions and meetup boundaries", async () => {
  const cases = [
    ["2026-09-13", "11:59:59", [], [], "closed"], // Sunday is a normal operating day.
    ["2026-09-13", "12:00:00", [], [], "open"],
    ["2026-09-13", "19:59:59", [], [], "open"],
    ["2026-09-13", "20:00:00", [], [], "closed"],
    ["2026-09-12", "14:00:00", [], [], "open"],
    ["2026-09-25", "14:00:00", [], [], "closed"],
    ["2026-10-05", "14:00:00", [], [], "closed"], // Substitute holiday.
    ["2026-05-01", "14:00:00", [], [], "closed"],
    ["2026-07-17", "14:00:00", [], [], "closed"],
    ["2026-06-03", "14:00:00", [], [], "closed"], // Election day.
    ["2025-01-27", "14:00:00", [], [], "closed"], // Declared temporary public holiday.
    ["2027-02-09", "14:00:00", [], [], "closed"],
    ["2027-07-19", "14:00:00", [], [], "closed"],
    ["2026-09-25", "14:00:00", [], [exception("2026-09-25", "open")], "open"],
    ["2026-09-25", "03:00:00", [], [exception("2026-09-25", "open")], "closed"],
    ["2026-09-25", "21:00:00", [], [exception("2026-09-25", "open")], "closed"],
    ["2026-09-10", "14:00:00", [], [exception("2026-09-10", "closed")], "closed"],
    ["2026-09-10", "14:00:00", [], [exception("2026-09-09", "closed")], "open"],
    ["2026-09-10", "20:30:00", [event("2026-09-10", "19:00 ~ 21:00")], [], "event"],
    ["2026-09-10", "21:00:00", [event("2026-09-10", "19:00 ~ 21:00")], [], "closed"],
    ["2026-09-10", "11:00:00", [event("2026-09-10", "11:00 ~ 13:00")], [], "event"],
    ["2026-09-10", "13:00:00", [event("2026-09-10", "11:00 ~ 13:00")], [], "open"],
    ["2026-09-11", "00:30:00", [event("2026-09-10", "23:00 ~ 02:00")], [], "event"],
    ["2026-09-11", "02:00:00", [event("2026-09-10", "23:00 ~ 02:00")], [], "closed"],
    ["2026-09-11", "00:30:00", [event("2026-09-10", "23:00 ~ 02:00")], [exception("2026-09-10", "closed")], "closed"],
    ["2026-09-11", "00:30:00", [event("2026-09-10", "23:00 ~ 02:00")], [exception("2026-09-11", "closed")], "closed"],
    ["2026-09-25", "20:30:00", [event("2026-09-25", "19:00 ~ 21:00")], [], "closed"],
    ["2026-09-25", "20:30:00", [event("2026-09-25", "19:00 ~ 21:00")], [exception("2026-09-25", "open")], "event"],
    ["2026-09-26", "00:30:00", [event("2026-09-25", "23:00 ~ 02:00")], [exception("2026-09-25", "open")], "event"],
    ["2027-01-01", "00:30:00", [event("2026.12.31", "23:00 - 0200")], [], "event"],
    ["2027-01-01", "02:00:00", [event("2026.12.31", "23:00 - 0200")], [], "closed"],
    ["2026-09-10", "20:30:00", [event("2026-09-10", "19:00 ~ 20:00"), event("2026-09-10", "19:30 ~ 21:00")], [], "event"],
    ["2099-01-02", "14:00:00", [], [], null], // Do not invent an unpublished calendar.
    ["2099-01-02", "14:00:00", [], [exception("2099-01-02", "open")], "open"],
  ];
  for (const [date, time, events, exceptions, expected] of cases) {
    const now = at(date, time), result = await resolveCenterStatus(now, events, exceptions);
    assert.equal(result.status, expected, JSON.stringify({ date, time, events, exceptions }));
    assert.equal(result.date, date);
    assert(Date.parse(result.nextChangeAt) > now.getTime());
  }
  const before = await resolveCenterStatus(at("2026-09-10", "13:59:59"), [event("2026-09-10", "14:00 - 1700")], []);
  assert.equal(before.nextChangeAt, at("2026-09-10", "14:00:00").toISOString());
  assert.equal(seoulDate(new Date("2026-12-31T15:00:00Z")), "2027-01-01");
});

test("legacy meetup time ranges remain readable; ambiguous times do not claim an ongoing meetup", () => {
  for (const time of ["14:00 - 1700", "14:00 ~ 17:00", "1400–1700", "14:00 — 17:00", "14:00 ～ 17:00"]) {
    assert.deepEqual(eventWindow(event("2026.09.10", time)), { start: at("2026-09-10", "14:00:00").getTime(), end: at("2026-09-10", "17:00:00").getTime() });
  }
  assert.equal(eventWindow(event("2026-09-10", "00:00 ~ 24:00")).end, at("2026-09-11", "00:00:00").getTime());
  for (const time of ["", "14:00", "시간 미정", "14:00 ~ 14:00", "24:00 ~ 02:00", "12:60 ~ 14:00", "14:00 ~ 24:01", "14:00 ~ 27:00", "14:00 ~ 17:00 (예정)"]) assert.equal(eventWindow(event("2026-09-10", time)), null, time);
  assert.equal(eventWindow(event("2026-02-30", "14:00 ~ 17:00")), null);
});
