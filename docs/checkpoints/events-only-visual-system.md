# Events-only visual-system source comparison

**Status:** source comparison complete; rendered visual verdict intentionally pending a fresh post-change capture set.

## Scope and evidence

- Current events-only public/admin source under `web/src/`.
- Recovery snapshot `b1cc3f81190f06fb53da668c003421f479854543` (`backup/center-web-before-events-only-20260909-175952`).
- `git diff --check` was clean during comparison.
- Compared public tokens, primitives, header, footer, home, section layouts, motion, theme, locale control, wordmark, and responsive rules. Commerce, accounts, orders, payments, search, booking, notices, community administration, and unrelated legacy admin surfaces were excluded by the owner’s current scope.

## Findings

No remaining non-commerce public design omission was found after the final source corrections.

- `web/src/styles/tokens.css` matches the recovery snapshot, including the supplied color roles, type/spacing scale, large-screen content measures, motion durations, and visible error/field-border colors used by the event-only admin.
- `web/src/styles/navigation.css` retains the centered live navigation marker and restores the `1119px` navigation breakpoint and the `1440px` navigation gap. The only removed header controls are search, cart, wishlist, and account controls, which are out of scope.
- `web/src/styles/site-sections.css` restores the recovery snapshot’s `1440px` and `1800px` public layout spacing/proportions for programs, experience, journal, visit, and about. Removed rules address the eliminated goods/catalog compact variants only.
- `web/src/components/site/section-content.tsx:140` and `web/src/styles/site-sections.css:81` implement the owner’s latest visit-contact decision with native email/telephone anchors, a 48px token-derived target height, visible focus treatment, and no box border.
- The public surface is live React/Next DOM: shared `Button`/`ActionLink` primitives, real navigation links, `next/image` content photos, and token-driven CSS. The supplied raster wordmark is used only as the actual brand mark, not as a substitute for page UI.

## Boundaries

This is a code-level comparison only. The earlier capture set is superseded by the latest visit-contact change, so it cannot support a visual PASS. Fresh complete captures and independent rendered review remain required before approving visual fidelity, responsive behavior, contrast, CJK wrapping, or interaction states.
