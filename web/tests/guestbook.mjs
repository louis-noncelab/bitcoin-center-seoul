import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import "./helpers/pg-content-env.mjs";

assert.ok(new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test"));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-guestbook-"));
process.env.BCS_EVENTS_UPLOADS = directory;
const { prisma } = await import("../src/server/db.ts");
const { guestbookInputSchema, guestbookPageNumber } = await import("../src/lib/guestbook-contract.ts");
const { saveGuestbook, deleteGuestbook, guestbookPage, listGuestbookAdmin } = await import("../src/server/guestbook/index.ts");
const { referencedImagePaths } = await import("../src/server/events/content-images.ts");
const ids = [];
let entryNumber = 1000;
const input = (patch = {}) => guestbookInputSchema.parse({ entryNumber: 1, body: "Test entry", ...patch });
const create = async (patch) => { const record = await saveGuestbook(input({ entryNumber: ++entryNumber, ...patch })); ids.push(record.id); return record; };
after(async () => {
  await prisma.guestbookEntry.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("boundaries reject invalid dates, empty content, oversized text and unsafe images; new entries are private", () => {
  assert.equal(input().is_active, 0);
  assert.equal(input().visitorName, "");
  assert.equal(input().visitDate, "");
  assert.equal(input().volume, 1);
  assert.equal(input({ visitDate: "2024-02-29", volume: 25 }).volume, 25);
  for (const field of ["entryNumber", "volume"]) {
    for (const value of [0, -1, 1.5, 2147483648, "1", null]) assert.equal(guestbookInputSchema.safeParse({ ...input(), [field]: value }).success, false);
  }
  assert.equal(guestbookInputSchema.safeParse({ body: "Missing number" }).success, false);
  for (const patch of [{ visitDate: "2026-02-30" }, { visitDate: "2026.10.09" }, { body: " \n " }, { body: "a".repeat(4001) }, { visitorName: "a".repeat(101) }, { images: ["https://example.com/a.webp"] }, { images: ["/images/uploads/../secret.webp"] }, { is_active: 2 }, { extra: true }]) {
    assert.equal(guestbookInputSchema.safeParse({ ...input(), ...patch }).success, false);
  }
  for (const value of ["0", "-1", "1.5", "01", "1e3", "1000001", ["1", "2"]]) assert.equal(guestbookPageNumber(value), null);
  assert.equal(guestbookPageNumber(undefined), 1);
  assert.equal(guestbookPageNumber("2"), 2);
});

test("public pagination excludes drafts and sorts by entry number regardless of date, volume or insertion order", async () => {
  const draft = await create({ body: "Draft must stay private", visitDate: "2026-12-01" });
  for (let index = 0; index < 13; index++) await create({ entryNumber: 2000 - index, volume: index + 1, visitDate: index ? "2026-10-09" : "", body: `Public ${index}`, is_active: 1 });
  const first = await guestbookPage(1);
  const second = await guestbookPage(2);
  assert.equal(first.records.length, 12);
  assert.equal(first.totalPages, 2);
  assert.equal(second.records.length, 1);
  assert.equal(first.records[0].entryNumber, 2000);
  assert.equal(first.records[0].visitDate, "");
  assert.ok(first.records[0].id < first.records[1].id);
  assert.equal(second.records[0].entryNumber, 1988);
  assert.ok(![...first.records, ...second.records].some((entry) => entry.id === draft.id));
  assert.ok((await listGuestbookAdmin()).some((entry) => entry.id === draft.id));
  assert.deepEqual((await guestbookPage(3)).records, []);
  for (const record of [...first.records, ...second.records]) await deleteGuestbook(record.id, record.revision);
});

test("concurrent edits and deletion use revisions, preserving the winning edit", async () => {
  const entry = await create();
  const results = await Promise.allSettled([
    saveGuestbook(input({ entryNumber: entry.entryNumber, body: "First editor" }), entry.id, entry.revision),
    saveGuestbook(input({ entryNumber: entry.entryNumber, body: "Second editor" }), entry.id, entry.revision),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "EDIT_CONFLICT");
  const saved = results.find((result) => result.status === "fulfilled").value;
  await assert.rejects(deleteGuestbook(entry.id, entry.revision), { code: "EDIT_CONFLICT" });
  await assert.rejects(saveGuestbook(input(), entry.id), { status: 428 });
  assert.equal((await listGuestbookAdmin()).find((row) => row.id === entry.id).body, saved.body);
  await deleteGuestbook(entry.id, saved.revision);
  await assert.rejects(deleteGuestbook(entry.id, saved.revision), { status: 404 });
});

test("numbers stay unique across volumes and concurrent creates; failed edits preserve content and revision", async () => {
  const results = await Promise.allSettled([create({ entryNumber: 3000, volume: 1 }), create({ entryNumber: 3000, volume: 25 })]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "GUESTBOOK_NUMBER_CONFLICT");
  const other = await create({ visitDate: "2026-10-09" });
  await assert.rejects(saveGuestbook(input({ entryNumber: 3000, body: "Must roll back" }), other.id, other.revision), { status: 409, code: "GUESTBOOK_NUMBER_CONFLICT" });
  assert.deepEqual((await listGuestbookAdmin()).find((row) => row.id === other.id), other);
  const updated = await saveGuestbook(input({ entryNumber: other.entryNumber, volume: 30 }), other.id, other.revision);
  assert.equal(updated.visitDate, "");
  assert.equal(updated.volume, 30);
  for (const data of [{ entryNumber: 0 }, { volume: 0 }]) {
    await assert.rejects(prisma.guestbookEntry.update({ where: { id: other.id }, data }));
  }
  assert.equal((await listGuestbookAdmin()).find((row) => row.id === other.id).entryNumber, other.entryNumber);
});

test("draft photos remain referenced for backups, public photos disappear when hidden, shared photos survive deletion", async () => {
  const image = "/images/uploads/guestbook-test.webp";
  fs.mkdirSync(path.join(directory, "uploads"));
  fs.writeFileSync(path.join(directory, "uploads/guestbook-test.webp"), "fixture");
  const first = await create({ images: [image], is_active: 1 });
  const second = await create({ images: [image] });
  assert.ok((await referencedImagePaths(true)).includes(image));
  const hidden = await saveGuestbook(input({ entryNumber: first.entryNumber, images: [image] }), first.id, first.revision);
  assert.ok(!(await referencedImagePaths(true)).includes(image));
  assert.ok((await referencedImagePaths()).includes(image));
  await deleteGuestbook(hidden.id, hidden.revision);
  assert.ok(fs.existsSync(path.join(directory, "uploads/guestbook-test.webp")));
  await deleteGuestbook(second.id, second.revision);
  assert.equal(fs.existsSync(path.join(directory, "uploads/guestbook-test.webp")), false);
  await assert.rejects(create({ images: [image] }), { code: "IMAGE_NOT_FOUND" });
});
