# BCS craft visual review — English matrix

**Recommendation:** REQUEST_CHANGES

This is a read-only review of the current public preview. It is bound to
`docs/checkpoints/evidence/design-craft-2026-09-08/final/source-manifest.json`:

- build: `NzQQpR_UFZ019chp0Cnef`
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`
- source fingerprint: `e906a0d0c62ec0ff64334945190d71de863a77e6d3fa6462e2d661d467ff782a`

The latest rendered source timestamp is 20:26 KST; the English captures were
written at 20:28 KST. The manifest was refreshed at 20:32 KST. I made no
product, build, browser, or test changes.

## Coverage — PASS (48 / 48)

I individually opened every file in this complete set with `view_image`:

`public-site/en-{home,about,programs,experience,journal,goods,visit,design-system}-{light,dark}-{375,768,1280}.png`

All 48 are valid non-interlaced RGB PNGs at their stated viewport widths.
The review also inspected the available English manual viewport evidence:

`manual/en-dark-1280-{top,programs,journal,visit,reduced-program}.png` and
`manual/en-light-375-{top,programs,journal,visit,menu,reduced-program}.png`.

Static captures do not establish motion quality. I did not use them to rate
animation; `manual.json` is separate runtime evidence.

## What passes

- The public surface is real DOM, not a pasted page image. `CenterPhoto` renders
  `next/image` with localized alt text at
  `web/src/components/site/center-photo.tsx:13-36`; `Home`, `SectionContent`,
  `SiteHeader`, and `SiteFooter` compose the visible routes with reusable live
  elements. The rendered evidence shows the supplied lounge, class, gallery,
  wallet, and goods photographs as content media rather than a raster UI.
- The system is genuinely token-driven. Theme, typography, spacing, radii,
  control, media, and motion tokens are centralized in
  `web/src/styles/tokens.css:1-123`; shared `Button`, `ActionLink`,
  `SectionFrame`, and `MediaFrame` primitives live in
  `web/src/components/ui/primitives.tsx:9-69`. The CSS uses those tokens across
  the rendered light and dark frames.
- The image-led 5/7 hero, compact program selector, paired exhibition frames,
  journal index, goods band, and practical footer give the home page distinct
  section jobs. This avoids the repeated title/description/button/photo template
  that the contract forbids. The real photos remain sharp and aligned at 375,
  768, and 1280 in both themes.
- Header, footer, visit information, contact controls, content width, type scale,
  8px controls / 12px media geometry, and light/dark contrast are coherent in
  the inspected English captures. The mobile disclosure is a live menu state,
  not a visual mock.
- The implementation uses the useful Bali qualities—concrete activity proof and
  direct visit/contact actions—without copying its assets, invented activity
  feed, or deliberately louder visual language. This is appropriate because the
  benchmark is not a clone target.

## Findings

### CRITICAL

None. No raster or background-image substitute for the UI, no missing live
component tree, and no failure of the shared token system was found.

### HIGH

None.

### MEDIUM

1. **Home journal category breaks inside one English word.** In
   `en-home-{light,dark}-{768,1280}.png` and
   `manual/en-dark-1280-journal.png`, `Education` renders as `Educatio` then
   `n`. This makes a short factual category look broken at the two wider
   layouts. The source constrains the category column to 64px at
   `web/src/styles/site-sections.css:43-47` (`var(--space-16)`), while the
   contract calls for a readable fixed category column. Increase that track to
   the required 5.5rem token / prevent intra-word wrapping, then recapture the
   affected English light and dark frames.

2. **The mobile home exhibition heading leaves “and” alone.** In
   `en-home-{light,dark}-375.png` and
   `manual/en-light-375-programs.png`, the heading reads as three lines:
   `Exhibitions` / `and` / `wallet demos`, while `Exhibition details` remains
   side-by-side. This is a visible English hierarchy and wrap failure in a
   section specifically requested for review. The no-wrap action in the flex
   heading consumes the available title measure at
   `web/src/styles/site.css:46-47,80-81`. On small screens, allow the heading
   row to wrap so the action gets its own row and the heading retains a natural
   two-line grouping; recapture both themes at 375px.

### LOW

None.

## Subjective preference, not a finding

The page is intentionally more restrained than Bitcoin House Bali. A more
ornamental or louder hero would be personal preference, not a fidelity failure:
the approved contract calls for a contemporary cultural venue with real
photography, substantial typography, and restrained orange/blue identity.

## Required before approval

1. Resolve the two English wrap defects above.
2. Produce fresh `en-home-{light,dark}-{375,768,1280}.png` evidence against the
   changed source and re-review it. The currently inspected 48-frame coverage
   is complete, but the visual findings gate an approval.
