import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventDetail, HighlightDetail } from "../src/components/site/events-public.tsx";
import { EditorFields } from "../src/components/events-admin/editor-fields.tsx";
import { contentTagsSchema, splitContentTags } from "../src/lib/content-tags.ts";

const common = {
  id: 1, slug: "tags-render", title: "검토", titleEn: "Review", date: "2026-09-10",
  description: "본문", descriptionEn: "Body", image: "", images: [], link: "", tags: ["비트코인", "<script>alert(1)</script>"],
};
const event = { ...common, time: "19:00", venueType: "center", location: "", locationEn: "" };
const highlight = { ...common, meta: "", metaEn: "", category: "", categoryEn: "", host: "", hostEn: "", startDate: "", endDate: "", icon: "calendar", sort_order: 0, is_active: 1 };

for (const locale of ["ko", "en"]) {
  for (const item of [
    { kind: "events", component: EventDetail, props: { event, locale } },
    { kind: "highlights", component: HighlightDetail, props: { highlight, locale } },
  ]) {
    test(`${item.kind} ${locale} tags are an escaped, noninteractive list before the body`, () => {
      // Given a public record with bilingual content and HTML-like tag text.
      // When its real public detail component renders on the server.
      const html = renderToStaticMarkup(createElement(item.component, item.props));
      // Then hashtags remain text, expose a localized list name, and precede the body.
      const tags = /<ul class="content-tags"[^>]*>(.*?)<\/ul>/s.exec(html)?.[0];
      assert.ok(tags);
      assert.match(tags, new RegExp(`aria-label="${locale === "ko" ? "해시태그" : "Hashtags"}"`));
      assert.match(tags, /#비트코인/);
      assert.match(tags, /#&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      assert.doesNotMatch(tags, /<(?:script|a|button|input)\b|tabindex=/);
      assert.ok(html.indexOf(tags) < html.indexOf('class="event-description'));
    });
  }
}

test("an empty legacy tag list emits no placeholder or empty list", () => {
  // Given an existing record whose tags were not authored.
  // When its real public component renders.
  const html = renderToStaticMarkup(createElement(EventDetail, { event: { ...event, tags: [] }, locale: "ko" }));
  // Then the tag primitive occupies no space in the document.
  assert.doesNotMatch(html, /class="content-tags"/);
});

test("the existing event editor includes a native comma-separated tag field", () => {
  // Given an existing tagged record.
  // When the editor fields render.
  const html = renderToStaticMarkup(createElement(EditorFields, { locale: "ko", kind: "events", record: event }));
  // Then editing preserves both tag values and uses the shared accessible field wrapper.
  assert.match(html, /name="tags"/);
  assert.match(html, /value="비트코인, &lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  assert.match(html, /aria-describedby="content-tags-help"/);
});

test("comma-separated form input preserves empty segments for validation", () => {
  // Given cleared, valid and accidentally doubled separators in an admin field.
  // When each field string passes through the shared parser.
  const cleared = contentTagsSchema.parse(splitContentTags("  "));
  const valid = contentTagsSchema.parse(splitContentTags("#비트코인, Lightning, lightning"));
  const invalid = contentTagsSchema.safeParse(splitContentTags("비트코인,,Lightning"));
  // Then clearing works, duplicate spelling normalizes, and empty entries are rejected.
  assert.deepEqual(cleared, []);
  assert.deepEqual(valid, ["비트코인", "Lightning"]);
  assert.equal(invalid.success, false);
});
