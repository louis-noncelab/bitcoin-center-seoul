# Footer, reading progress, compact hero, and motion code review

## Verdict

- **Reviewed HEAD:** `fd7c472d856a257a77bf66766163b3f245a8757f`
- **Reviewed source fingerprint:** `182389382a6dddb6960a82d41bd27f7104d27aca0aff48a454b4dc4124c385d4`
- **Build:** `RcYcgiLOZAi3KkRBM4anP`
- **codeQualityStatus:** `WATCH`
- **recommendation:** `APPROVE`
- **blockers:** None.

The final manifest binds all 2,568 enumerated sources and 282 PNG captures to
that source/build pair. This review found no correctness, accessibility, scope,
or lifecycle defect that requires a product change. One intentionally retained,
synthetic fallback test is a MEDIUM maintenance concern.

## CRITICAL

None.

## HIGH

None.

## MEDIUM

- **MAINT-01 — synthetic test coupling for an unreachable current fallback.**
  `web/src/components/site/page-motion.tsx:40-45` retains the older fallback
  that observes a whole `.section-frame` when it contains no
  `[data-reveal-part]` markers. All live home frames currently have marked
  parts, while detail pages use `.detail-page` rather than `.section-frame`
  (`web/src/app/[locale]/[section]/page.tsx:38-65`).
  `web/tests/motion.spec.ts:54-81` therefore patches
  `IntersectionObserver.prototype.observe` during hydration to remove markers
  from the experience frame. This tests PageMotion's current iteration and
  `observe()` ordering instead of a live user-facing surface, so an equivalent
  refactor can fail it without regressing the product. The fallback is preserved
  deliberately as existing behavior; if it becomes a supported contract, give
  it a real fixture or surface. Otherwise, remove its branch and synthetic test
  together in a scoped cleanup.

## LOW

None.

## Verified implementation

- `ReadingProgress` uses a passive listener, one pending RAF, a body
  `ResizeObserver`, pathname/history refresh handling, and full listener,
  observer, and RAF cleanup (`web/src/components/controls/reading-progress.tsx:11-42`).
  It performs no scroll write or React state render.
- The fixed, non-interactive bar is visually empty without JavaScript, has no
  extra reduced-motion animation, and remains below the skip-link layer
  (`web/src/styles/controls.css:20-30`, `web/src/styles/tokens.css:77-107`).
- Footer mail and telephone actions retain their real destinations, localized
  accessible names, native titles, icon-only DOM, and 48px controls
  (`web/src/components/site/site-footer.tsx:43-63`,
  `web/src/styles/footer.css:57-68`).
- The compact hero keeps the complete accessible H1 while only letter spans
  animate; the 5:7 desktop / 3:2 photo treatment, 16:9 tablet treatment, and
  4:3 mobile treatment are bounded in the relevant CSS
  (`web/src/components/site/home.tsx:11-54`, `web/src/styles/site.css:2-31`).
- `PageMotion` keeps content visible before enhancement, observes individual
  nonnested groups at the viewport edge, animates each once, and cancels pending
  and active effects when reduced motion becomes active
  (`web/src/components/site/page-motion.tsx:7-59`).

## Tests and evidence inspected

- `final/check.log` and `final/build.log`: typecheck, lint, and optimized build
  passed.
- `final/playwright.log`: **141 passed**. The corrected SEO test derives
  contact identity from real destinations/native contact title and verifies
  accessible names; it no longer mistakes intentionally hidden icon-link text
  for structured data (`web/tests/seo.spec.ts:40-64`).
- `final/image-quality-dpr1.json` and `image-quality-dpr2.json`: 60 decoded
  image cases, all at or below the 1.01 density threshold. The selector repair
  still selects the same first exhibition image after its reveal wrapper was
  added (`web/tests/image-quality.spec.ts:4-15`).
- `final/footer-progress/checks.json`: 12 layouts, 12 contact checks, 12
  progress checks, 60 captures, and no errors. `final/identity/identity.json`:
  28 layouts, four text-zoom cases, 25 captures, and no errors.
- `final/webkit/checks.json`: five final scenarios, 20 captures, expected
  title letters, zero residual navigation scroll, end progress of one, 48px
  icon controls, and no reduced-motion title animations. The earlier failed
  pre-paint history probe is preserved separately and is not used as success
  evidence.
- `final/browser-audit.json`: 32 axe cases with zero violations, 16 narrow
  reflow checks with no overflow, and no external requests. Its three
  color-contrast incompletes are resolved by the recorded visible-text,
  hit-test, and measured contrast evidence in `final/contrast-review.json`.
- `final/wide/wide.json` records 20 wide layouts and 80 captures without
  overflow. `final/motion/video-manifest.json` records two 25fps native Chrome
  motion videos and verified MP4 exports.

## Required skill-perspective check

The `omo:programming` TypeScript guidance and `omo:remove-ai-slops` criteria
were consulted before assessing maintainability and tests. The reading-progress,
title-motion, image-quality, and contact/SEO tests exercise observable behavior;
they are neither deletion-only nor implementation-constant checks. The
production code introduces no untyped escape hatch beyond the narrow standard
CSS custom-property typing required for the letter index, no needless data
parsing/normalization, and no unnecessary abstraction. MAINT-01 is the one
exception under both perspectives: its synthetic observer patch is brittle and
has no current live surface.
