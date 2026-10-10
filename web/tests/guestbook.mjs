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
const input = (patch = {}) => guestbookInputSchema.parse({ visitDate: "2026-10-09", body: "Test entry", ...patch });
const create = async (patch) => { const record = await saveGuestbook(input(patch)); ids.push(record.id); return record; };
after(async () => {
  await prisma.guestbookEntry.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("boundaries reject invalid dates, empty content, oversized text and unsafe images; new entries are private", () => {
  assert.equal(input().is_active, 0);
  assert.equal(input().visitorName, "");
  for (const patch of [{ visitDate: "2026-02-30" }, { visitDate: "2026.10.09" }, { body: " \n " }, { body: "a".repeat(4001) }, { visitorName: "a".repeat(101) }, { images: ["https://example.com/a.webp"] }, { images: ["/images/uploads/../secret.webp"] }, { is_active: 2 }, { extra: true }]) {
    assert.equal(guestbookInputSchema.safeParse({ ...input(), ...patch }).success, false);
  }
  for (const value of ["0", "-1", "1.5", "01", "1e3", "1000001", ["1", "2"]]) assert.equal(guestbookPageNumber(value), null);
  assert.equal(guestbookPageNumber(undefined), 1);
  assert.equal(guestbookPageNumber("2"), 2);
});

test("public pagination excludes drafts and sorts by visit date then id", async () => {
  const draft = await create({ body: "Draft must stay private", visitDate: "2026-12-01" });
  for (let index = 0; index < 13; index++) await create({ body: `Public ${index}`, is_active: 1 });
  const first = await guestbookPage(1);
  const second = await guestbookPage(2);
  assert.equal(first.records.length, 12);
  assert.equal(first.totalPages, 2);
  assert.equal(second.records.length, 1);
  assert.ok(first.records[0].id > first.records[1].id);
  assert.ok(![...first.records, ...second.records].some((entry) => entry.id === draft.id));
  assert.ok((await listGuestbookAdmin()).some((entry) => entry.id === draft.id));
  assert.deepEqual((await guestbookPage(3)).records, []);
  for (const record of [...first.records, ...second.records]) await deleteGuestbook(record.id, record.revision);
});

test("concurrent edits and deletion use revisions, preserving the winning edit", async () => {
  const entry = await create();
  const results = await Promise.allSettled([
    saveGuestbook(input({ body: "First editor" }), entry.id, entry.revision),
    saveGuestbook(input({ body: "Second editor" }), entry.id, entry.revision),
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

test("draft photos remain referenced for backups, public photos disappear when hidden, shared photos survive deletion", async () => {
  const image = "/images/uploads/guestbook-test.webp";
  fs.mkdirSync(path.join(directory, "uploads"));
  fs.writeFileSync(path.join(directory, "uploads/guestbook-test.webp"), "fixture");
  const first = await create({ images: [image], is_active: 1 });
  const second = await create({ images: [image] });
  assert.ok((await referencedImagePaths(true)).includes(image));
  const hidden = await saveGuestbook(input({ images: [image] }), first.id, first.revision);
  assert.ok(!(await referencedImagePaths(true)).includes(image));
  assert.ok((await referencedImagePaths()).includes(image));
  await deleteGuestbook(hidden.id, hidden.revision);
  assert.ok(fs.existsSync(path.join(directory, "uploads/guestbook-test.webp")));
  await deleteGuestbook(second.id, second.revision);
  assert.equal(fs.existsSync(path.join(directory, "uploads/guestbook-test.webp")), false);
  await assert.rejects(create({ images: [image] }), { code: "IMAGE_NOT_FOUND" });
});
