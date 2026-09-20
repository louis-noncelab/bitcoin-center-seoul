import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, beforeEach, test } from "node:test";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-news-"));
process.env.BCS_EVENTS_DB = path.join(directory, "events.db");
process.env.BCS_EVENTS_UPLOADS = path.join(directory, "images");

const { openDatabase, getDatabase } = await import("../src/server/events/db.ts");
openDatabase(process.env.BCS_EVENTS_DB).close();
after(() => {
  getDatabase().close();
  fs.rmSync(directory, { recursive: true, force: true });
});

const { listNotices, getNotice, saveNotice, deleteNotice } = await import("../src/server/notices/index.ts");
const { listHighlights, getHighlight, createHighlight, updateHighlight, deleteHighlight } = await import("../src/server/events/index.ts");
const { noticeInputSchema } = await import("../src/lib/notices-contract.ts");
const { highlightInputSchema } = await import("../src/lib/events-contract.ts");
const { buildNewsFeed, mediaHighlights } = await import("../src/lib/news.ts");

beforeEach(() => {
  for (const notice of listNotices(true)) deleteNotice(notice.id, notice.revision);
  for (const journal of listHighlights({ includeInactive: true })) deleteHighlight(journal.id, journal.revision);
});

const readNews = () => buildNewsFeed(listNotices(), listHighlights());
const readMedia = () => mediaHighlights(listHighlights());

function highlightInput(overrides = {}) {
  return highlightInputSchema.parse({
    slug: "",
    title: "저널 초안",
    titleEn: "Journal draft",
    meta: "",
    metaEn: "",
    category: "",
    categoryEn: "",
    date: "2026-09-20",
    startDate: "",
    endDate: "",
    host: "",
    hostEn: "",
    description: "센터에서 나눈 이야기",
    descriptionEn: "Stories from the center",
    image: "",
    images: [],
    link: "",
    icon: "",
    sort_order: 0,
    is_active: 0,
    ...overrides,
  });
}

test("notice publication, edits, unpublication and deletion reach the next news read", () => {
  let input = noticeInputSchema.parse({
    slug: "center-notice",
    title: "공지 초안",
    description: "방문 안내 초안",
    is_active: 0,
  });
  let notice = saveNotice(input);
  assert.equal(getNotice(notice.id), null);
  assert.equal(getNotice(notice.id, true).title, "공지 초안");
  assert.deepEqual(readNews(), []);

  input = { ...input, is_active: 1 };
  notice = saveNotice(input, notice.id, notice.revision);
  assert.equal(readNews().length, 1);
  let [item] = readNews();
  assert.equal(item.key, `notice-${notice.id}`);
  assert.equal(item.kind, "notice");
  assert.equal(item.title, "공지 초안");
  assert.equal(item.href, "/notices/center-notice");

  input = { ...input, slug: "center-notice-edited", title: "방문 시간 변경", description: "변경된 방문 시간 안내" };
  notice = saveNotice(input, notice.id, notice.revision);
  assert.equal(getNotice(notice.id).description, "변경된 방문 시간 안내");
  [item] = readNews();
  assert.equal(item.title, "방문 시간 변경");
  assert.equal(item.href, "/notices/center-notice-edited");
  assert.equal(readNews().length, 1);

  input = { ...input, is_active: 0 };
  notice = saveNotice(input, notice.id, notice.revision);
  assert.equal(getNotice(notice.id), null);
  assert.deepEqual(readNews(), []);

  notice = saveNotice({ ...input, is_active: 1 }, notice.id, notice.revision);
  assert.equal(readNews().length, 1);
  deleteNotice(notice.id, notice.revision);
  assert.equal(getNotice(notice.id, true), null);
  assert.deepEqual(readNews(), []);
});

test("text-only journals enter news on publication and use the current slug after edits", () => {
  let input = highlightInput();
  let journal = createHighlight(input);
  assert.equal(getHighlight(journal.id), null);
  assert.equal(getHighlight(journal.id, { includeInactive: true }).title, "저널 초안");
  assert.deepEqual(readNews(), []);
  assert.deepEqual(readMedia(), []);

  input = { ...input, is_active: 1 };
  journal = updateHighlight(journal.id, input, journal.revision);
  assert.equal(readNews().length, 1);
  let [item] = readNews();
  assert.equal(item.key, `journal-${journal.id}`);
  assert.equal(item.kind, "journal");
  assert.equal(item.title, "저널 초안");
  assert.equal(item.href, `/journal/${journal.id}`);
  assert.deepEqual(readMedia(), []);

  input = { ...input, slug: "center-story", title: "센터의 하루", description: "새로 정리한 센터 이야기" };
  journal = updateHighlight(journal.id, input, journal.revision);
  [item] = readNews();
  assert.equal(item.title, "센터의 하루");
  assert.equal(item.href, "/journal/center-story");
  assert.equal(getHighlight(journal.id).description, "새로 정리한 센터 이야기");
  assert.equal(readNews().length, 1);

  input = { ...input, is_active: 0 };
  journal = updateHighlight(journal.id, input, journal.revision);
  assert.equal(getHighlight(journal.id), null);
  assert.deepEqual(readNews(), []);
  assert.deepEqual(readMedia(), []);

  journal = updateHighlight(journal.id, { ...input, is_active: 1 }, journal.revision);
  assert.equal(readNews().length, 1);
  deleteHighlight(journal.id, journal.revision);
  assert.equal(getHighlight(journal.id, { includeInactive: true }), null);
  assert.deepEqual(readNews(), []);
  assert.deepEqual(readMedia(), []);
});

test("media reads reflect publication, cover edits and deletion without including text-only journals", () => {
  const uploads = path.join(process.env.BCS_EVENTS_UPLOADS, "uploads");
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, "first-cover.webp"), "isolated image fixture");
  fs.writeFileSync(path.join(uploads, "edited-cover.webp"), "isolated image fixture");

  let input = highlightInput({ images: ["/images/uploads/first-cover.webp"] });
  let journal = createHighlight(input);
  assert.deepEqual(readMedia(), []);

  input = { ...input, is_active: 1 };
  journal = updateHighlight(journal.id, input, journal.revision);
  assert.deepEqual(readMedia().map(({ id, image }) => ({ id, image })), [
    { id: journal.id, image: "/images/uploads/first-cover.webp" },
  ]);

  input = { ...input, title: "새 표지의 저널", images: ["/images/uploads/edited-cover.webp"] };
  journal = updateHighlight(journal.id, input, journal.revision);
  const [media] = readMedia();
  assert.equal(media.title, "새 표지의 저널");
  assert.equal(media.image, "/images/uploads/edited-cover.webp");
  assert.deepEqual(media.images, ["/images/uploads/edited-cover.webp"]);

  const textJournal = createHighlight(highlightInput({ title: "글로 남긴 소식", is_active: 1 }));
  assert.equal(readNews().length, 2);
  assert.deepEqual(readMedia().map(({ id }) => id), [journal.id]);

  input = { ...input, is_active: 0 };
  journal = updateHighlight(journal.id, input, journal.revision);
  assert.deepEqual(readMedia(), []);
  assert.deepEqual(readNews().map(({ key }) => key), [`journal-${textJournal.id}`]);

  journal = updateHighlight(journal.id, { ...input, is_active: 1 }, journal.revision);
  assert.equal(readMedia().length, 1);
  deleteHighlight(journal.id, journal.revision);
  assert.deepEqual(readMedia(), []);
  assert.deepEqual(readNews().map(({ key }) => key), [`journal-${textJournal.id}`]);
  deleteHighlight(textJournal.id, textJournal.revision);
  assert.deepEqual(readNews(), []);
});
