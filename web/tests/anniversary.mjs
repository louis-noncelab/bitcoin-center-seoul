import assert from "node:assert/strict";
import test from "node:test";
import { anniversaryHighlights, anniversaryWindow, anniversaryYears } from "../src/lib/anniversary.ts";

test("the anniversary marker appears only around October 21 and archives stay available", () => {
  assert.equal(anniversaryWindow("2026-10-13"), null);
  assert.deepEqual(anniversaryYears("2026-10-13"), []);
  assert.equal(anniversaryWindow("2026-10-14"), 2026);
  assert.equal(anniversaryWindow("2026-10-21"), 2026);
  assert.equal(anniversaryWindow("2026-10-27"), 2026);
  assert.equal(anniversaryWindow("2026-10-28"), null);
  assert.deepEqual(anniversaryYears("2026-10-28"), [2026]);
  assert.deepEqual(anniversaryYears("2027-10-13"), [2026]);
  assert.deepEqual(anniversaryYears("2027-10-14"), [2027, 2026]);
});

test("each archive includes only its own dated public photos through the current Seoul day", () => {
  const photo = (id, date, overrides = {}) => ({
    id, date, startDate: "", endDate: "", is_active: 1,
    image: `/images/uploads/2026-09/photo-${id}.webp`,
    images: [`/images/uploads/2026-09/photo-${id}.webp`],
    ...overrides,
  });
  const records = [
    photo(1, "2025-10-20"),
    photo(2, "2025.10.21"),
    photo(3, "2026-10-14"),
    photo(4, "2026-10-15"),
    photo(5, "2026-10-21"),
    photo(6, "2026-10-22"),
    photo(7, "2027-10-21"),
    photo(8, "2026-08-10", { is_active: 0 }),
    photo(9, "2026-08-11", { image: "", images: [] }),
    photo(10, "", { startDate: "2026.09.01", endDate: "2026.09.03" }),
    photo(11, "2026-09-02", { image: "/images/uploads/2026-09/photo-3.webp", images: ["/images/uploads/2026-09/photo-3.webp"] }),
  ];
  assert.deepEqual(anniversaryHighlights(records, 2026, "2026-10-14").map(({ id }) => id), [2, 10, 11, 3]);
  assert.deepEqual(anniversaryHighlights(records, 2026, "2026-10-27").map(({ id }) => id), [2, 10, 11, 3, 4, 5]);
  assert.deepEqual(anniversaryHighlights(records, 2027, "2027-10-21").map(({ id }) => id), [6, 7]);
});
