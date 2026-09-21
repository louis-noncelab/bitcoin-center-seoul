import assert from "node:assert/strict";
import { test } from "node:test";
import { eventListLocation } from "../src/lib/event-location.ts";
import { eventInputSchema } from "../src/lib/events-contract.ts";

const input = { title: "행사", titleEn: "Event", date: "2026-09-21", time: "", location: "", locationEn: "", description: "설명", descriptionEn: "Description", image: "", images: [], link: "" };

test("list visibility follows explicit venue type, never a name comparison", () => {
  for (const locale of ["ko", "en"]) {
    assert.equal(eventListLocation({ venueType: "center", location: "다른 표기", locationEn: "Different spelling" }, locale), "");
    assert.equal(eventListLocation({ venueType: "external", location: "비트코인 센터 서울", locationEn: "Bitcoin Center Seoul" }, locale), locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul");
    assert.equal(eventListLocation({ venueType: "external", location: "외부 행사장", locationEn: "" }, locale), "외부 행사장");
  }
});

test("requires an explicit venue choice and a Korean location for external events", () => {
  assert.equal(eventInputSchema.safeParse(input).success, false);
  assert.equal(eventInputSchema.safeParse({ ...input, venueType: "unknown" }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...input, venueType: "center" }).success, true);
  assert.equal(eventInputSchema.safeParse({ ...input, venueType: "external" }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...input, venueType: "external", location: "   " }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...input, venueType: "external", location: "외부 행사장" }).success, true);
});
