# Events-only refined-system review — historical only

**Recommendation:** REVISE — no current approval

This is a source-only checkpoint from the `4833af345a51601bf408a3b5ec016139ff0c1650c6122b826af87e876e86b908` 191-file freeze. It is historical: the back-to-top and journal-arrival fixes landed after that freeze, and the owner then added navigation-motion, address, and notice work. It must not be used as approval of the current worktree.

## Evidence inspected

- `docs/checkpoints/evidence/events-only/source-freeze.json` — 191-file source manifest with digest `4833af…`.
- `web/src/components/controls/back-to-top.tsx` — live client component with a real anchor, scroll state, and focus handling.
- `web/src/components/site/site-footer.tsx`, `web/src/styles/footer.css` — reused footer composition, tokenized three-column layout, and contact actions.
- `web/src/components/site/events-public.tsx`, `web/src/components/site/section-content.tsx`, `web/src/styles/events-public.css` — live catalog cards, native pagination links, gallery image elements, and tokenized interaction states.
- `web/src/components/ui/primitives.tsx`, `web/src/styles/primitives.css`, `web/src/styles/tokens.css` — shared action/media primitives and color, type, spacing, radius, shadow, and motion tokens.
- Owner requirements in `docs/superpowers/specs/2026-09-09-events-only-design.md`.

## Findings

### CRITICAL

None found in the reviewed frozen source. The inspected public surface is composed from React components, semantic links/buttons, shared primitives, and real image elements. No reviewed component used a UI screenshot, canvas, `background-image`, data URI, or raster stand-in for live interface structure.

### HIGH

- **[evidence] Stale source/evidence identity.** `source-freeze.json` records `4833af…`, but subsequent changes altered the back-to-top behavior and journal-arrival selector; further owner-directed changes remain in progress. The existing refinement captures cannot establish the appearance or behavior of the final source. This blocks approval.

### MEDIUM

None found in the inspected historical source. `ActionLink`, `SectionFrame`, `MediaFrame`, `CenterPhoto`, `SiteFooter`, and catalog components form a reused live component tree. Colors, typography, spacing, radii, shadows, and motion in the reviewed refinements resolve through named tokens.

### LOW

None material to the historical refinement review.

## Required before a current recommendation

1. Freeze the final source again and record its digest.
2. Produce complete fresh public/admin, wallet-guide, and reduced-motion matrices from that exact digest.
3. Inspect every resulting contact-sheet group and required close-up/state before issuing a new PASS or REVISE.

## Blockers

- **[evidence]** A stable source digest and its matching complete visual matrices do not yet exist for the current worktree.
