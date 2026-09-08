# Independent review A — first capture

- Reviewer: `/root/design_integrity_review`, read-only clone/design-system reviewer.
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`; dirty sources/captures recorded in `source-manifest-first.json`, build `bUlfTJGG318bqSEkcA01c`.
- Verdict: **REVISE**, confidence high. This is superseded only by a later fresh-build review.
- Coverage: exact 96-file matrix verified, representative screenshots directly opened across all eight page types, locales, themes and widths; all eight state captures opened. Sources, 100-case production suite, four-case dev suite and browser audit inspected.

## Required repairs

1. [product][HIGH per reviewer] `web/src/styles/site.css` mobile masthead uses `clamp(2.375rem, 9.4vw, 4rem)` directly. Move to the responsive `--text-masthead` token and document it.
2. [product][MEDIUM] `SiteHeader` has a redundant wordmark aria-label that differs from visible text. Correct the accessible name and regenerate accessibility evidence.
3. [product][LOW] Document existing light `--focus: #ae4308` and dark focus token in `DESIGN.md`.

## Confirmed strengths

- Real DOM primitives and `next/image` with actual static center photographs; no screenshot substitution, fake photo rendering or canvas interface.
- Token-driven colors/spacing/surfaces and shared `CenterPhoto`, `SiteHeader`, `SiteFooter`, `SelectionTabs` and primitives.
- Server content/metadata with limited client theme/menu/tab controls. Six localized sections and usable visit content.
- Only the specified hero arrival and state/action motion; reduced-motion alternative exists.
- Final logo, font, operating facts and photo permissions remain owner-release decisions, not local-candidate blockers.

## Audit correction

The first 32 axe runs omitted the WCAG 2.1 A tag/experimental label rule. The extended run identified label-in-name failures in all 32 route/theme runs, including language controls. The earlier zero-violation count does **not** cover those failures. Preserve it as historical evidence and use the extended rule set for the repaired build.
