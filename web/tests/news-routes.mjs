import assert from "node:assert/strict";
import { test } from "node:test";

const origin = process.env.BCS_NEWS_TEST_ORIGIN || "http://127.0.0.1:3102";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));

for (const locale of ["ko", "en"]) {
  test(`${locale}: news hub exposes existing publishing destinations and canonical metadata`, async () => {
    const response = await fetch(`${origin}/${locale}/news`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(/<h1[^>]*>/.test(html), "Missing page heading");
    for (const path of ["notices", "journal", "reviews", "news?view=media"]) {
      assert.ok(html.includes(`href="/${locale}/${path}"`), `Missing ${path} destination`);
    }
    assert.ok(new RegExp(`<link rel="canonical" href="[^"]*/${locale}/news"`).test(html), "Missing canonical news URL");
    assert.ok(!html.includes("상품 등록 전 예시"));
  });

  test(`${locale}: media view uses real source links without loading autoplay embeds`, async () => {
    const response = await fetch(`${origin}/${locale}/news?view=media`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(/news-media-grid/.test(html), "Missing media grid");
    assert.ok(/https:\/\/www.youtube.com\/watch\?v=/.test(html), "Missing video source link");
    assert.ok(!/<iframe[^>]+youtube/.test(html), "Unexpected YouTube embed");
    const newsNavigation = html.match(/<nav\b[^>]*class="news-navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
    const mediaLink = (newsNavigation.match(/<a\b[^>]*>/g) || []).find((tag) => tag.includes(`href="/${locale}/news?view=media"`));
    assert.ok(mediaLink?.includes('aria-current="page"'), "Missing current media navigation state");
  });
}

test("unknown news view returns to the canonical hub", async () => {
  const response = await fetch(`${origin}/ko/news?view=unknown`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status));
  assert.equal(response.headers.get("location"), "/ko/news");
});

test("home exposes one combined news/media region, not repeated legacy media sections", async () => {
  const response = await fetch(`${origin}/ko`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(/id="home-news"/.test(html), "Missing home news region");
  assert.ok(html.includes('href="/ko/news"'));
  assert.ok(!/id="journal-title"|id="videos-title"/.test(html), "Repeated legacy media sections");
});
