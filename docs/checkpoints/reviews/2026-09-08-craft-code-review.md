# Craft code review — 2026-09-08

**Technical review result:** `CLEAR`  
**Recommendation:** `APPROVE`  
**Scope:** source-only review of the craft revision. This is not visual approval.

## Review binding

- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`
- Build evidence ID: `NzQQpR_UFZ019chp0Cnef`
- Source fingerprint: `e906a0d0c62ec0ff64334945190d71de863a77e6d3fa6462e2d661d467ff782a`
- Manifest: `docs/checkpoints/evidence/design-craft-2026-09-08/final/source-manifest.json`

I recalculated the SHA-256 for all requested TSX and CSS files against that
manifest. Every file matched. The checkout HEAD also matched the supplied
value. The web tree is intentionally untracked, so there is no meaningful Git
diff baseline to review.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Interaction and regression audit

- Fast tab changes retain only the immediately previous panel as outgoing;
  superseded panels become `hidden`. The outgoing panel is both `inert` and
  `aria-hidden`, and the reduced-motion subscription clears it synchronously.
  The media-query listener is removed on cleanup.
- `PageMotion` disconnects its observer and cancels recorded animations both
  on preference change and component cleanup. It observes only the intended
  `.section-frame` elements and has no timer or per-frame React update.
- The mobile disclosure handles outside pointer, focus departure, Escape and
  route navigation. Its panel becomes `inert`/`aria-hidden` as it begins the
  CSS exit, while Escape restores focus to the trigger. Links use the
  locale-aware client Link and pending state comes from `useLinkStatus`.
- `data-scroll-behavior="smooth"` remains on the locale HTML element. The
  scoped navigation tests cover top-of-page routing, history restoration, and
  the skip-link hash/focus path. No custom scroll reset or artificial route
  delay was introduced.
- The home and footer IDs are unique in each rendered route; generated tab IDs
  are instance-scoped by `useId`. The responsive rules maintain one-column
  layouts at mobile widths and constrain media with `minmax(0, 1fr)`/explicit
  aspect ratios.

## Tests and evidence inspected

`web/tests/content-motion.spec.ts`, `navigation-feedback.spec.ts`,
`navigation-scroll.spec.ts`, and `public-site.spec.ts` assert observable
behavior: selection accessibility during transition, motion-preference changes,
no-JS visibility, client navigation/pending state, menu dismissal, hash/focus,
history restoration, and the locale/theme/viewport matrix. They are relevant
behavior tests, not tautologies, prose pins, deletion-only tests, or constants
mirroring the implementation.

I inspected `final/playwright.log`; it records all 120 targeted Playwright
tests passing after the manifest timestamp. I did not execute build, browser,
or test commands in this read-only review. `final/manual/manual.json` was
partial while the root reviewer was still running manual QA, so this review
does not treat it as completion evidence.

## Skill-perspective check

Ran the required `omo:programming` TypeScript guidance and
`omo:remove-ai-slops` review pass. The scoped production code has no untyped
escape hatches, needless parsing/normalization, speculative abstraction,
dead/debug code, or unnecessary validation. The focused modules are each
below the 250 pure-LOC threshold. The inspected tests do not violate either
skill perspective.

## Blockers

None.
