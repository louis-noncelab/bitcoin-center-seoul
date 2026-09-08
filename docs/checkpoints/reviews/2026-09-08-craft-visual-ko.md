# Korean public-site craft visual review — baseline

**Recommendation:** APPROVE for the manifest-bound, static Korean baseline only.  
**48-capture coverage:** PASS (48 / 48).  
**Date:** 2026-09-08  
**Reviewer scope:** rendered still-frame visual review and read-only component/token inspection. No browser, build, product, or asset changes were made.

## Bound evidence

This report is bound to:

- Build: `NzQQpR_UFZ019chp0Cnef`
- Commit: `fd7c472d856a257a77bf66766163b3f245a8757f`
- Source fingerprint: `e906a0d0c62ec0ff64334945190d71de863a77e6d3fa6462e2d661d467ff782a`
- Manifest: `docs/checkpoints/evidence/design-craft-2026-09-08/final/source-manifest.json`
- Design contract: `web/DESIGN.md`
- Comparative benchmark: `docs/checkpoints/reviews/2026-09-08-bali-benchmark.md`

The 48 PNGs were each opened directly at original resolution from
`docs/checkpoints/evidence/design-craft-2026-09-08/final/public-site/`.

| Route | Light: 375 / 768 / 1280 | Dark: 375 / 768 / 1280 | Result |
| --- | --- | --- | --- |
| `ko-home` | inspected | inspected | pass |
| `ko-about` | inspected | inspected | pass |
| `ko-programs` | inspected | inspected | pass |
| `ko-experience` | inspected | inspected | pass |
| `ko-journal` | inspected | inspected | pass |
| `ko-goods` | inspected | inspected | pass |
| `ko-visit` | inspected | inspected | pass |
| `ko-design-system` | inspected | inspected | pass |

## Rendered visual result

The implementation reads as a coherent, gallery-like public site rather than a generic card template. It retains its own Seoul-center identity while meeting the useful structural qualities in the Bali comparison: an intentional hero/photo relationship, clear program hierarchy, documentary imagery, readable editorial rows, useful visit details, and a substantial footer.

- The home page maintains a deliberate 5/7-style editorial hero and a clear progression through program, experience, journal, goods, and contact. It avoids both repeated tile anatomy and unpurposed white space.
- Across the three widths, photos have consistent crop frames and adjacent captions. The 8px control and 12px media/panel language stays perceptible without becoming decorative.
- Korean mastheads, body copy, journal descriptions, map/address information, and control labels remain readable. No observed clipped Korean text, pathological particle wrap, overflow, or caption/image misalignment appeared in the 48 captures.
- Light and dark themes are coherent token inversions: the warm dark canvas preserves contrast, while orange remains an action cue and blue remains a selection/name cue. Photography remains documentary and is not replaced by a theme-specific graphic.
- The footer is now structurally useful on mobile and desktop: brand, map/action, route groups, address, phone, and email are present and legible. It does not have the weak, isolated link-list treatment identified in the benchmark.
- The design-system route visibly demonstrates typography, color, sizing, imagery, and control rules that are reflected in the public routes.

## Component and token integrity

The inspected source supports the rendered evidence as live, reusable UI rather than a screenshot substitute.

- [`web/src/components/site/center-photo.tsx`](../../../web/src/components/site/center-photo.tsx) uses Next `Image` with localized media data at lines 20–36; the photographed regions are live image elements rather than full-page raster or CSS background substitutes.
- [`web/src/components/site/home.tsx`](../../../web/src/components/site/home.tsx) composes shared site sections and `CenterPhoto` at lines 10–110. [`web/src/components/site/section-content.tsx`](../../../web/src/components/site/section-content.tsx) reuses program, experience, journal, and visit content at lines 9–225.
- [`web/src/styles/tokens.css`](../../../web/src/styles/tokens.css) defines color, typography, radius, spacing, and timing variables at lines 3–116. [`web/src/styles/primitives.css`](../../../web/src/styles/primitives.css) consumes these shared variables for Korean wrapping, containers, controls, media frames, and reduced motion at lines 18–298.
- The source examined after capture has queued edits beyond the manifest-bound build (including a footer marquee). Those later edits are deliberately outside this baseline approval.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

1. **Evidence scope — motion and interaction are unverified by stills.** The PNG set cannot establish the specified entrance timing, press feedback, menu lifecycle, tab direction/repeat behavior, focus handling, or reduced-motion behavior. This is not a static visual defect and does not block this baseline result. It requires fresh runtime evidence in the final, post-polish review.

### LOW

1. **Inspection-client PNG presentation anomaly, not a product finding.** Some direct dark PNG views intermittently omitted regions of photographs in the reviewer display. The raw `ko-goods-dark-1280.png` (`sha256:4bf5dd4d7ec5561d5e43245912185950a6f04acea46214e8b273eeb20f3ebfb7`) converted solely for inspection displayed the full photograph (`sha256:5ef3b8d0a5a1a11a5f32c35f416b0179c258bde67670e0915e6bcbce3d04391a`). Direct re-open of `ko-home-dark-375.png` also rendered fully (`sha256:a4a2425c83e3fd140de3e17acc7dc8d16dae543b891d236151f096a32c0c5ebb`). This is not reproducible evidence of masking, blank media, or a source change request.

## Blockers

No product blocker was found in the manifest-bound Korean still set.

Queued source changes invalidate this baseline as a final approval boundary. Capture a new manifest and rerun the same 48-capture static review after the polish; evaluate the footer marquee and other changed behavior with runtime/reduced-motion evidence rather than inferring quality from still images.
