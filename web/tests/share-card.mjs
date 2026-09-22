import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { articleStructuredData } from "../src/components/seo/article-json-ld.tsx";
import { eventStructuredData } from "../src/components/seo/event-json-ld.tsx";
import { defaultShareImage, shareCardPath, shareCardSize } from "../src/content/share.ts";
import { pageMetadata, recordMetadata } from "../src/content/site.ts";
import { composeShareCard } from "../src/server/share-card.ts";

test("a share card is a 1200 by 630 jpeg", async () => {
  const source = await sharp({ create: { width: 640, height: 960, channels: 3, background: "#2458a8" } }).jpeg().toBuffer();
  const card = await composeShareCard(source);
  assert.equal(card[0], 0xff);
  assert.equal(card[1], 0xd8);
  const meta = await sharp(card).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, shareCardSize.width);
  assert.equal(meta.height, shareCardSize.height);
  assert.ok(card.length > 8_000 && card.length < 400_000);
});

test("public pages point link previews at a sized share image", () => {
  const home = pageMetadata("ko");
  const homeImages = home.openGraph?.images;
  assert.ok(Array.isArray(homeImages));
  const homeImage = homeImages[0];
  assert.equal(typeof homeImage === "string" ? homeImage : homeImage?.url, defaultShareImage);
  assert.equal(typeof homeImage === "string" ? 0 : homeImage?.width, shareCardSize.width);
  assert.equal(home.twitter?.images?.[0], defaultShareImage);

  const meetup = recordMetadata("en", "programs", "saturday-meetup", "Saturday meetup", "A meetup at the center.", shareCardPath("programs", "saturday-meetup"));
  const meetupImages = meetup.openGraph?.images;
  assert.ok(Array.isArray(meetupImages));
  const meetupImage = meetupImages[0];
  assert.equal(typeof meetupImage === "string" ? meetupImage : meetupImage?.url, "/og/programs/saturday-meetup");
  assert.equal(meetup.twitter?.card, "summary_large_image");
  assert.equal(meetup.twitter?.images?.[0], "/og/programs/saturday-meetup");
  assert.match(String(meetup.description), /meetup at the center/);
});

test("meetup structured data uses the share card and omits the join link", () => {
  const data = eventStructuredData({
    id: 7,
    revision: 1,
    registrationClosed: false,
    venueType: "center",
    slug: "online-night",
    tags: [],
    title: "온라인 밋업",
    titleEn: "Online meetup",
    date: "2026-10-03",
    time: "19:00 ~ 21:00",
    location: "",
    locationEn: "",
    description: "참가 안내입니다.",
    descriptionEn: "Join us online.",
    image: "/images/uploads/2026-10/cover.webp",
    link: "",
    ticketPriceKrw: "10000",
    ticketCapacity: 20,
    externalPayment: false,
    isOnline: true,
    onlineUrl: "https://meet.example/secret-room",
    onlineInstructions: "secret instructions",
    onlineInstructionsEn: "secret instructions",
    images: ["/images/uploads/2026-10/cover.webp"],
  }, "ko");
  const serialized = JSON.stringify(data);
  assert.equal(serialized.includes("secret"), false);
  assert.match(serialized, /\/og\/programs\/online-night/);
  assert.match(serialized, /2026-10-03T19:00:00\+09:00/);
  assert.match(serialized, /OnlineEventAttendanceMode/);
  assert.match(serialized, /"price":"10000"/);
});

test("journal articles publish a headline and a share image", () => {
  const article = articleStructuredData({
    locale: "ko",
    section: "journal",
    id: "after-the-class",
    title: "수업 이후",
    description: "**굵은** 현장 기록",
    date: "2026.03.22",
    image: "/images/uploads/2026-03/note.webp",
  });
  assert.equal(article.headline, "수업 이후");
  assert.equal(article.description.includes("**"), false);
  assert.equal(article.datePublished, "2026-03-22");
  assert.match(article.image[0], /\/og\/journal\/after-the-class$/);
});
