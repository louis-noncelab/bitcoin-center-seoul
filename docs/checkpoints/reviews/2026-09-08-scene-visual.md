# Scene composition visual review — 2026-09-08

## Verdict

**Recommendation: APPROVE** for the photographic-composition revision.

This review is bound to build `7pPh7w-kNyrXLmmKQJHB-`, commit
`fd7c472d856a257a77bf66766163b3f245a8757f`, and source fingerprint
`725f1f19b5735fe9640b46431ed918b81ca16aa74fad585ca66ca55b09f7a106`.
The current hashes of the reviewed home, media, photo primitive, tokens, scene
styles, motion files, and design contract match the final source manifest.

## Findings

### CRITICAL

None. The prominent imagery is live `next/image` output from the locally
imported center photographs. It is not a pasted capture, CSS background
substitute, carousel, or external/reference asset. `Home` composes the hero,
programs, experience, journal, and goods as live sections; `CenterPhoto`
supplies the local source, responsive `sizes`, focal position, and bilingual alt
text. See `web/src/components/site/home.tsx:14`,
`web/src/components/site/home.tsx:91`,
`web/src/components/site/center-photo.tsx:19`, and
`web/src/content/media.ts:79`.

### HIGH

None. Color, type, spacing, radii, media ratios, and motion duration are drawn
from the documented token layer rather than one-off values. The single `scale(2.1)`
on the retail detail is an intentional crop presentation tied to the real
photograph, not a replacement styling system; the associated responsive image
request has enough decoded pixels at each checked DPR. See
`web/src/styles/tokens.css:3`, `web/src/styles/tokens.css:21`,
`web/src/styles/site.css:19`, and `web/src/styles/site-sections.css:67`.

### MEDIUM

**Resolved target-capture evidence gap (non-product).** The initial
`en-light-375-goods.png` was malformed: its upper area was blank and it omitted
the goods title and retail-detail frame. It has been preserved outside `final/`
as a capture anomaly and replaced only after direct English/light/mobile DOM and
painted-pixel verification. The final target, matching full-page render, and
other locale/theme targets show the intended sequence. See the evidence
resolution below.

For the product states that render correctly, the 4:3 retail pair shares exact
desktop/tablet dimensions and stacks in order on mobile. The capture script
records 12 locale/theme/viewport layouts and four DPR checks with no page errors;
its highest detail-crop demand is 1209.6 × 907.2 rendered pixels versus a 3840 ×
2160 decoded source.

### LOW

None. The preceding crop was optically over-tight at desktop; the frozen
`scale(2.1)` / `75% 42%` crop fixes that concern. It retains the rabbit and
glasses as an actual close observation while restoring enough shelf context to
read as the first half of a deliberate detail/context pair. It is crisp enough
at 1280 and remains legible at 375; it should not be enlarged again.

## Evidence resolution — 2026-09-08

**Resolved: English/light/mobile goods target.** I physically reopened the
replacement `final/scenes/en-light-375-goods.png`. It correctly shows the
heading, detail crop, and context crop in sequence. `final/goods-paint-check.json`
records three direct browser attempts after image decode and paint settlement;
each has the same 335 × 251.25 px frame at y=221.34375, `opacity: 1`, complete
images, no overflow, and a 0.9992358208955224 painted-pixel ratio. The two
repeated capture files are byte-identical to the replacement target
(`738dbc1a55d4ce6754a0ae1acec9d963c8de84ca21080ee52b7fc2b43b9de241`). The
earlier malformed image is retained outside `final/` in `capture-anomaly/` and
does not represent the reviewed product state. The source fingerprint and build
remain unchanged.

## Visual assessment

The wide 21:9 lounge photograph makes the masthead a recognizable place rather
than a generic service header. The text-first masthead, one real wide room, then
the practical rail create a clean first decision path. The revised 768px layout
uses the full-width name, a compact introduction/action row, and then the image;
it removes the earlier dead vertical area without reducing the room's presence.

Program imagery now has enough width and human activity to form the page's
second major beat. The two documentary experience plates, restrained journal
index, and goods detail/context pair each use a different structural role, so the
full page no longer repeats a heading/copy/photo card formula. Korean and English,
light and dark captures keep the same hierarchy, aligned edges, and practical
wayfinding. The composition meets the current `web/DESIGN.md` contract while
preserving Pretendard, neutral center naming, truthful copy, local photography,
and the stated no-shop/no-signup scope.

## Evidence inspected

- `web/DESIGN.md` and `docs/checkpoints/2026-09-08-scenes.md`.
- `docs/checkpoints/evidence/scenes-2026-09-08/final/source-manifest.json`.
- All 48 fresh scene PNGs under
  `docs/checkpoints/evidence/scenes-2026-09-08/final/scenes/`, physically opened
  for this review. One target capture is malformed as documented under MEDIUM;
  it is preserved outside `final/` as a capture anomaly. The final replacement,
  its two repeated paint captures, and the matching English/light/mobile
  full-page render show the intended goods sequence.
- `docs/checkpoints/evidence/scenes-2026-09-08/final/scenes/scenes.json` and
  `scenes-check.log`.
- The original `public/images/what-we-do/retail.jpeg` at 4032 × 2268 px.
- Current `home.tsx`, `center-photo.tsx`, `media.ts`, `tokens.css`, `site.css`,
  `site-sections.css`, `page-motion.tsx`, and `motion.css`.
- Before-composition captures in
  `docs/checkpoints/evidence/identity-2026-09-08/final/identity/` for direct
  comparison.

## Scope boundary

This is a static composition and design-system-fidelity approval. The report does
not independently certify root's completed browser, manual, wide-screen, motion,
axe, or reflow suites.

## Blockers

None.
