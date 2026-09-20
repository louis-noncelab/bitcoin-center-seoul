import assert from "node:assert/strict";
import test from "node:test";
import { buildNewsFeed, mediaHighlights } from "../src/lib/news.ts";

const notice = Object.freeze({
  id: 1,
  revision: 1,
  slug: "center-announcement",
  tags: [],
  title: "센터 운영 안내",
  titleEn: "Center announcement",
  description: "센터 방문 전 확인할 내용\n\n**운영 시간** 안내",
  descriptionEn: "Details to check before visiting\n\n**Opening hours**",
  is_active: 1,
  created_at: "2026-09-17 10:30:00",
  updated_at: "2026-09-30 12:00:00",
});

const highlight = Object.freeze({
  id: 1,
  revision: 1,
  slug: "wallet-workshop",
  tags: [],
  title: "지갑 워크숍 현장",
  titleEn: "Wallet workshop",
  meta: "센터 현장 기록",
  metaEn: "A record from the center",
  category: "워크숍",
  categoryEn: "Workshop",
  date: "2026.09.18",
  startDate: "",
  endDate: "",
  host: "비트코인 센터 서울",
  hostEn: "Bitcoin Center Seoul",
  description: "직접 지갑을 사용해 본 시간",
  descriptionEn: "Time spent trying a wallet",
  image: "/images/uploads/2026-09/legacy.webp",
  images: ["/images/uploads/2026-09/workshop.webp"],
  link: "",
  icon: "",
  sort_order: 0,
  is_active: 1,
});

test("the news feed excludes private notices and highlights", () => {
  const feed = buildNewsFeed(
    [notice, { ...notice, id: 2, slug: "private-notice", is_active: 0 }],
    [highlight, { ...highlight, id: 2, slug: "private-story", is_active: 0 }],
  );
  assert.deepEqual(feed.map(({ href }) => href), ["/journal/wallet-workshop", "/notices/center-announcement"]);
  assert.deepEqual(buildNewsFeed([{ ...notice, is_active: 0 }], [{ ...highlight, is_active: 0 }]), []);
});

test("news entries preserve source text, both languages, and original detail URLs", () => {
  const feed = buildNewsFeed([notice], [highlight]);
  assert.deepEqual(feed, [
    {
      key: "journal-1", kind: "journal", href: "/journal/wallet-workshop",
      title: "지갑 워크숍 현장", titleEn: "Wallet workshop",
      description: "직접 지갑을 사용해 본 시간", descriptionEn: "Time spent trying a wallet",
      date: "2026-09-18",
    },
    {
      key: "notice-1", kind: "notice", href: "/notices/center-announcement",
      title: "센터 운영 안내", titleEn: "Center announcement",
      description: "센터 방문 전 확인할 내용\n\n**운영 시간** 안내",
      descriptionEn: "Details to check before visiting\n\n**Opening hours**",
      date: "2026-09-17",
    },
  ]);
  const [koreanOnly] = buildNewsFeed([{ ...notice, titleEn: "", descriptionEn: "" }], []);
  assert.equal(koreanOnly.title, "센터 운영 안내");
  assert.equal(koreanOnly.titleEn, "");
  assert.equal(koreanOnly.descriptionEn, "");
  assert.equal(buildNewsFeed([], [{ ...highlight, slug: "", id: 42 }])[0].href, "/journal/42");
});

test("news ordering uses the Seoul notice creation date and highlight event dates", () => {
  const feed = buildNewsFeed(
    [{ ...notice, created_at: "2026-09-19 16:30:00" }],
    [
      { ...highlight, id: 2, date: "", startDate: "2026.09.14", endDate: "2026.09.21" },
      { ...highlight, id: 3, date: " 2026.09.19 " },
      { ...highlight, id: 4, date: "", startDate: "2026-09-16" },
    ],
  );
  assert.deepEqual(feed.map(({ key, date }) => [key, date]), [
    ["journal-2", "2026-09-21"],
    ["notice-1", "2026-09-20"],
    ["journal-3", "2026-09-19"],
    ["journal-4", "2026-09-16"],
  ]);
});

test("notice timestamps keep explicit time zones and handle the Seoul day boundary", () => {
  const cases = [
    ["2026-09-19 14:59:59", "2026-09-19"],
    ["2026-09-19 15:00:00", "2026-09-20"],
    ["2026-09-19T16:30:00Z", "2026-09-20"],
    ["2026-09-20T01:30:00+09:00", "2026-09-20"],
    ["2026-09-20", "2026-09-20"],
    ["not-a-date", ""],
  ];
  for (const [created_at, date] of cases) {
    assert.equal(buildNewsFeed([{ ...notice, created_at }], [])[0]?.date, date, created_at);
  }
});

test("same-day results have stable unique keys regardless of source array order", () => {
  const firstNotice = { ...notice, created_at: "2026-09-18 01:00:00" };
  const secondNotice = { ...firstNotice, id: 2, slug: "second-notice" };
  const secondHighlight = { ...highlight, id: 2, slug: "second-story" };
  const forward = buildNewsFeed(Object.freeze([firstNotice, secondNotice]), Object.freeze([highlight, secondHighlight]));
  const reversed = buildNewsFeed(Object.freeze([secondNotice, firstNotice]), Object.freeze([secondHighlight, highlight]));
  assert.deepEqual(forward.map(({ key }) => key), reversed.map(({ key }) => key));
  assert.equal(new Set(forward.map(({ key }) => key)).size, 4);
});

test("the media wall excludes inactive, empty, and invalid cover images", () => {
  const inputs = Object.freeze([
    { ...highlight, id: 2, is_active: 0 },
    { ...highlight, id: 3, images: [], image: "" },
    { ...highlight, id: 4, images: ["https://example.com/photo.webp"] },
    { ...highlight, id: 5, images: [], image: "/images/uploads/../photo.webp" },
    { ...highlight, id: 6, images: [], image: "/images/uploads/picture.svg" },
    highlight,
  ]);
  const media = mediaHighlights(inputs);
  assert.equal(media.length, 1);
  assert.equal(media[0], highlight);
});

test("the media wall deduplicates the displayed cover while preserving source order and records", () => {
  const duplicateCover = { ...highlight, id: 2, image: "/images/uploads/2026-09/different-legacy.webp" };
  const secondCover = { ...highlight, id: 3, images: ["/images/highlights/uploads/second.jpg", highlight.images[0]], sort_order: -100 };
  const legacyCover = { ...highlight, id: 4, images: [], image: "/images/events/uploads/legacy.jpg" };
  const duplicateLegacy = { ...highlight, id: 5, images: [legacyCover.image] };
  const inputs = Object.freeze([highlight, duplicateCover, secondCover, legacyCover, duplicateLegacy]);
  const media = mediaHighlights(inputs);
  assert.deepEqual(media.map(({ id }) => id), [1, 3, 4]);
  assert.equal(media[0], highlight);
  assert.equal(media[1], secondCover);
  assert.equal(media[2], legacyCover);
  assert.equal(mediaHighlights(inputs, 2).length, 2);
  assert.deepEqual(mediaHighlights(inputs, 0), []);
  assert.deepEqual(mediaHighlights(inputs, -1), []);
});
