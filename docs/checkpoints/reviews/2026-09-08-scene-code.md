# Scene composition and PageMotion code review

## Verdict

- **Source fingerprint:** `725f1f19b5735fe9640b46431ed918b81ca16aa74fad585ca66ca55b09f7a106`
- **codeQualityStatus:** `CLEAR`
- **recommendation:** `APPROVE`
- **blockers:** None.

## Review scope

Reviewed the supplied before checkpoint against the current homepage composition
and `PageMotion` change: `home.tsx`, `page-motion.tsx`, `media.ts`, the three
site stylesheets, `motion.spec.ts`, `image-quality.spec.ts`, and `DESIGN.md`.
The stated goal was a visual/emotional upgrade to the existing public homepage
without introducing shop, signup, backend, deployment, or GitHub Actions work.

The final manifest's fingerprint was independently recomputed from its 2,565
listed source inputs and matches the value above. The reviewed source stays at
HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Correctness and scope assessment

- The homepage uses the existing `CenterPhoto` mechanism and the real retail
  asset for its detail crop. `retailDetail` supplies the distinct bilingual alt
  text and focal point needed for that presentation; it does not add content,
  inventory, checkout, signup, or data fetching.
- The hero, program emphasis, paired goods photographs, responsive ratios, and
  `80ms`/maximum-`160ms` stagger each match the current design contract.
  The desktop program-panel override is already limited to `.site-main`; detail
  routes use `detail-page`, so the shared `ProgramsContent` does not leak the
  homepage layout into `/[locale]/programs`.
- `PageMotion` still leaves server-rendered content visible by default. Its
  observer uses a single once-only entry per section, selects explicit reveal
  groups when present, and falls back to the section itself when absent. The
  preference-change cleanup disconnects the observer, cancels collected WAAPI
  animations, clears references, and rejects queued callbacks through `active`.
- No reviewed source imports backend/authentication/deployment code or enables
  a workflow.

## Test and evidence assessment

- `motion.spec.ts` tests the public motion contract: group ordering and token
  timing, capped stagger behavior required by `DESIGN.md`, fallback behavior for
  unmarked sections, and reduced-motion cancellation. It contains no deletion-
  only, prompt-text, tautological, or implementation-constant-only assertion.
- `image-quality.spec.ts` adds the new zoomed crop to the existing decoded-pixel
  coverage. The final DPR artifacts contain 30 measurements per DPR; maximum
  decoded-pixel scale is `0.9867` at DPR 1 and `0.8934` at DPR 2, both within the
  asserted `<= 1.01` limit.
- The stored final results are green:
  - `final/check.log`: generated route types, strict TypeScript check, and ESLint.
  - `final/build.log`: optimized Next production build completed.
  - `final/npm-audit.json`: zero vulnerabilities.
  - `final/playwright.log`: `133 passed (1.2m)`.
  - `final/scenes-check.log`, `final/manual-craft.log`, and
    `final/identity-check.log`: visual/motion scenarios completed with no page
    errors; these include the new crop, stagger, both locales/themes, no-JS, and
    text-zoom coverage.
  - `final/browser-audit.json`: 7 HTTP checks, 32 axe runs, 16 reflow runs, zero
    accessibility violations, overflow, or external requests.
  - `final/wide/wide.json`: 20 wide layouts, 80 captures, 6 fallbacks, zero
    errors, zero footer hydration-shift sources, and no marquee height delta.

## Required skill-perspective check

The required checks ran: `omo:programming` with its TypeScript reference, and
`omo:remove-ai-slops`.

- **Programming:** No new untyped escape hatch, non-null assertion, needless
  abstraction, boundary validation/parsing, or brittle prompt test appears in
  the reviewed diff. The CSS-token conversion follows the existing PageMotion
  pattern and is necessary to honor the design token.
- **Remove AI Slops:** No deletion-only or tautological test, dead code,
  redundant data normalization, speculative production extraction, or
  unnecessary abstraction was found. The additional media record is justified
  by a genuinely different crop and accessible description.
