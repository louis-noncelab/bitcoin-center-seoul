import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventDetail, HighlightDetail } from "../src/components/site/events-public.tsx";
import { MarkdownContent } from "../src/components/site/markdown-content.tsx";
import { markdownExcerpt } from "../src/lib/markdown.ts";
import { attachmentMarkdown, moveInsertion } from "../src/components/events-admin/markdown-insertion.ts";
import { ImageSelectionError, uploadImages } from "../src/components/events-admin/image-upload.ts";

const renderMarkdown = (children) => renderToStaticMarkup(createElement(MarkdownContent, { lang: "ko" }, children));

test("event descriptions render Markdown through their public detail component", () => {
  // Given an existing event record containing Markdown in its stored description.
  const event = {
    id: 1, slug: "markdown-review", title: "검토", titleEn: "Review",
    date: "2026-09-10", time: "", venueType: "center", location: "", locationEn: "",
    description: "## 일정\n\n**비트코인** 교육\n\n- 지갑\n- 라이트닝",
    descriptionEn: "", image: "", images: [], link: "", tags: [],
  };
  // When the actual public event component renders on the server.
  const html = renderToStaticMarkup(createElement(EventDetail, { event, locale: "ko" }));
  // Then the description has semantic structure instead of visible syntax markers.
  assert.match(html, /<h2>일정<\/h2>/);
  assert.match(html, /<strong>비트코인<\/strong>/);
  assert.match(html, /<ul>\s*<li>지갑<\/li>\s*<li>라이트닝<\/li>\s*<\/ul>/);
});

test("legacy descriptions preserve single line breaks and escape raw HTML", () => {
  // Given plain text with CRLF endings and raw script/HTML content.
  const source = "첫 줄\r\n둘째 줄\n\n<script>alert('plain text')</script>\n\n<img src=x onerror=alert(1)>";
  // When the shared renderer processes the stored text.
  const html = renderMarkdown(source);
  // Then lines remain distinct and HTML stays visible without executable elements.
  assert.match(html, /첫 줄<br\/>\s*둘째 줄/);
  assert.match(html, /&lt;script&gt;alert\(&#x27;plain text&#x27;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<(?:script|img|iframe)\b/i);
});

test("Markdown headings and code blocks retain accessible document structure", () => {
  // Given a body title, nested heading, quote and fenced HTML-like code.
  const source = "# 본문 제목\n\n### 작은 제목\n\n> 인용\n\n```html\n<script>example</script>\n```";
  // When the body is rendered inside a page that already has its own h1.
  const html = renderMarkdown(source);
  // Then body headings start at h2 and code remains escaped and keyboard focusable.
  assert.doesNotMatch(html, /<h1\b|<script\b/);
  assert.match(html, /<h2>본문 제목<\/h2>/);
  assert.match(html, /<h3>작은 제목<\/h3>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<pre tabindex="0"><code class="language-html">&lt;script&gt;example&lt;\/script&gt;/);
});

for (const destination of [
  "javascript:alert(1)", "JaVaScRiPt:alert(1)", "java&#x73;cript:alert(1)",
  "java&#x0a;script:alert(1)", "data:text/html,unsafe", "vbscript:msgbox(1)",
  "file:///private", "ftp://example.com/file", "https://[invalid",
]) {
  test(`unsafe or malformed Markdown URL is inert: ${destination}`, () => {
    // Given a link with a disallowed or malformed destination.
    const source = `[내용](${destination})`;
    // When the renderer resolves the link.
    const html = renderMarkdown(source);
    // Then the readable label survives without a navigable anchor.
    assert.match(html, /내용/);
    assert.doesNotMatch(html, /<a\b/);
  });
}

for (const destination of ["https://example.com", "http://example.com", "mailto:hello@example.com", "tel:+82200000000", "/ko/visit", "../journal", "#details", "//example.com/path"]) {
  test(`safe Markdown URL remains usable: ${destination}`, () => {
    // Given a supported absolute, relative, or fragment destination.
    const source = `[내용](${destination})`;
    // When the shared renderer processes the link.
    const html = renderMarkdown(source);
    // Then it remains an ordinary same-tab link with the supplied destination.
    assert.ok(html.includes(`<a href="${destination}">내용</a>`));
    assert.doesNotMatch(html, /target="_blank"/);
  });
}

test("remote Markdown images retain alt text without loading remote content", () => {
  // Given image Markdown whose destination must not bypass the managed gallery.
  const source = "![사진 설명](https://example.com/tracking.png)";
  // When its public body renders.
  const html = renderMarkdown(source);
  // Then its description is readable and no image or preload request is emitted.
  assert.match(html, /사진 설명/);
  assert.doesNotMatch(html, /<img\b|<link\b|tracking\.png/);
});

test("trusted uploaded Markdown photos render inside the body", () => {
  // Given a managed local attachment between two paragraphs.
  const path = "/images/uploads/2026-09/body-photo.webp";
  // When its body is rendered by the public Markdown component.
  const html = renderMarkdown(`앞 문단\n\n![센터 사진](${path})\n\n뒤 문단`);
  // Then a lazy local image keeps its alt text and position between the paragraphs.
  assert.match(html, /앞 문단[\s\S]*<img[^>]+alt="센터 사진"[^>]+src="\/images\/uploads\/2026-09\/body-photo\.webp"[\s\S]*뒤 문단/);
  assert.match(html, /loading="lazy"/);
});

for (const path of ["data:image/svg+xml,unsafe", "javascript:alert(1)", "//example.com/image.png", "/images/uploads/2026-09/unsafe.svg", "/images/uploads/../secret.png", "/images/uploads/%2e%2e/secret.png", "/images/unmanaged.jpg"]) {
  test(`untrusted Markdown image stays inert: ${path}`, () => {
    // Given an image destination outside the managed raster upload paths.
    const source = `![대체 설명](${path})`;
    // When the public renderer processes the image syntax.
    const html = renderMarkdown(source);
    // Then no requestable image is emitted, while the label remains readable.
    assert.match(html, /대체 설명/);
    assert.doesNotMatch(html, /<img\b|<link\b/);
  });
}

for (const [before, after, position, expected] of [
  [{ value: "앞뒤", selectionStart: 0 }, { value: "추가 앞뒤", selectionStart: 3 }, 1, 4],
  [{ value: "앞뒤", selectionStart: 2 }, { value: "앞뒤 추가", selectionStart: 5 }, 1, 1],
  [{ value: "aaaa", selectionStart: 0 }, { value: "aaaaa", selectionStart: 1 }, 2, 3],
  [{ value: "aaaa", selectionStart: 2 }, { value: "aaa", selectionStart: 1 }, 3, 2],
  [{ value: "before middle after", selectionStart: 7 }, { value: "before X after", selectionStart: 8 }, 10, 7],
  [{ value: "ab", selectionStart: 1 }, { value: "aXb", selectionStart: 2 }, 1, 1],
  [{ value: "abcd", selectionStart: 0 }, { value: "", selectionStart: 0 }, 3, 0],
]) {
  test(`upload insertion follows edits without replacing text: ${before.value} → ${after.value}`, () => {
    // Given an upload anchored before a real textarea edit.
    // When the beforeinput/input snapshots update its insertion position.
    const actual = moveInsertion(before, after, position);
    // Then the anchor follows preceding edits and survives edits through the anchor.
    assert.equal(actual, expected);
  });
}

test("attachment filenames cannot escape Markdown image labels", () => {
  // Given filenames containing brackets, backslashes and a newline.
  const files = [{ name: "센터[사진]\\1.png" }, { name: "사진\n설명.jpg" }];
  const images = ["/images/uploads/2026-09/one.webp", "/images/uploads/2026-09/two.webp"];
  // When image Markdown is generated and rendered through the real public renderer.
  const html = renderMarkdown(attachmentMarkdown(files, images));
  // Then both photographs keep complete readable alt text and their trusted destinations.
  assert.match(html, /alt="센터\[사진\]\\1"/);
  assert.match(html, /alt="사진 설명"/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 2);
});

test("invalid upload selections fail before sending a request", async () => {
  // Given actual browser-compatible File objects outside the shared upload limits.
  const png = new File(["fixture"], "photo.png", { type: "image/png" });
  const selections = [
    { files: [new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" })], kind: "type" },
    { files: Array.from({ length: 13 }, () => png), kind: "limits" },
    { files: [new File([new Uint8Array(10 * 1024 ** 2 + 1)], "large.png", { type: "image/png" })], kind: "limits" },
  ];
  // When the shared gallery/body uploader receives each invalid selection.
  for (const selection of selections) {
    // Then validation rejects it before Node could attempt a relative network request.
    await assert.rejects(uploadImages(selection.files), (error) => error instanceof ImageSelectionError && error.kind === selection.kind);
  }
});

test("excerpts remove Markdown while preserving paragraph, list and inline word boundaries", () => {
  // Given nested block content, inline emphasis, a hard break and a reference link.
  const source = "# 제목\n\n한**글** [안내][link]\n\n- 첫째\n  - 둘째\n- 셋째\n\n첫 줄  \n둘째 줄\n\n> 인용\n>\n> 다음\n\n![사진](https://example.com/photo.png)\n\n[link]: https://example.com";
  // When the same CommonMark parser derives a card or metadata excerpt.
  const excerpt = markdownExcerpt(source);
  // Then blocks have word separators and inline formatting does not split words.
  assert.equal(excerpt, "제목 한글 안내 첫째 둘째 셋째 첫 줄 둘째 줄 인용 다음 사진");
});

test("excerpt truncation never splits a Unicode code point", () => {
  // Given an excerpt whose boundary falls among two-unit Unicode characters.
  const source = "🟠".repeat(201);
  // When the source is reduced to a bounded excerpt.
  const excerpt = markdownExcerpt(source);
  // Then the excerpt ends cleanly and includes a truncation marker.
  assert.equal(excerpt, `${"🟠".repeat(200)}…`);
  assert.equal(markdownExcerpt(""), "");
});

test("highlight details use the Korean description and language when English is absent", () => {
  // Given a legacy highlight with a Korean body and no English translation.
  const highlight = {
    id: 2, slug: "markdown-highlight", title: "검토", titleEn: "", meta: "", metaEn: "",
    category: "", categoryEn: "", date: "2026-09-10", startDate: "", endDate: "",
    host: "", hostEn: "", description: "**한글 본문**", descriptionEn: "", image: "",
    images: [], link: "", icon: "", sort_order: 0, is_active: 1, tags: [],
  };
  // When an English visitor opens the real highlight detail component.
  const html = renderToStaticMarkup(createElement(HighlightDetail, { highlight, locale: "en" }));
  // Then its formatted fallback body is marked as Korean for assistive technology.
  assert.match(html, /class="event-description markdown-content" lang="ko"/);
  assert.match(html, /<strong>한글 본문<\/strong>/);
});
