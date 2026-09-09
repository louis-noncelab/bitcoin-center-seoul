# Events-only visual-system fidelity review — pre-refinement evidence

**Designation:** PRE-REFINEMENT ONLY — not a current release approval
**Recommendation:** REQUEST_CHANGES
**Reviewed frozen source:** `e9232b0e6b851dbe4570821061d4f23203dc07e4b3fc12dfbdaaeebcf22a2365` (190 files)

## Scope and method

There is no supplied pixel-for-pixel reference. Fidelity was assessed against the owner requirements and the project design contract in `web/DESIGN.md`, including the defined live-DOM, token, responsive, locale, theme, gallery, footer, and wallet-guide requirements.

I independently checked the frozen source before the owner’s later refinements, every capture in the two fresh capture sets, the corresponding audit records, and the wallet-motion frames. I also checked the source’s static-image and styling patterns for screenshot substitution. This review did not read environment files, runtime data, or credentials, and made no source, database, server, staging, or commit change.

## Evidence inspected

- `docs/checkpoints/evidence/events-only/source-freeze.json` — 190-file source manifest. Before the refinement it recomputed exactly to the recorded `e923…` digest.
- `docs/checkpoints/evidence/events-only/complete-final/audit.json` and all **236** corresponding PNGs: 200 public route captures (10 route states × ko/en × light/dark × 375/768/1280/1440/1920) and 36 admin captures (6 states × light/dark × 375/1280/1920). Each recorded `200`, no browser errors, no overflow, and no Axe violations.
- `docs/checkpoints/evidence/events-only/guide-final/audit.json` and all **112** corresponding PNGs: all 14 guide states × ko/en × light/dark × 375/1280. Each recorded `200`, no browser errors, no overflow, and no Axe violations.
- `docs/checkpoints/evidence/events-only/guide-final/motion/audit.json` and all 10 motion PNGs. They show the intended opacity/8px rise settling at 240ms and a visible, non-animated reduced-motion state.
- `docs/checkpoints/evidence/events-only/owner-check/layout.json` — measured equal desktop footer columns and exact center placement of the footer navigation.
- Reused component and style sources, including `web/src/components/ui/primitives.tsx`, `web/src/components/site/site-header.tsx`, `web/src/components/site/site-footer.tsx`, `web/src/components/site/home.tsx`, `web/src/components/site/events-public.tsx`, `web/src/components/wallet-guide/`, and `web/src/styles/tokens.css`.

## Findings

### CRITICAL

None in the reviewed `e923…` source and matching captures. The rendered interface is composed from React components, semantic controls, shared primitives, and image elements. I found no product-source use of a raster screenshot, canvas, iframe, data-image URI, or `background-image` to substitute for live UI.

### HIGH

- **[evidence] The evidence is stale after the owner’s refinement.** The current source no longer matches the reviewed freeze: 5 of the 190 manifest files differ — `web/src/components/site/section-content.tsx`, `web/src/components/site/site-footer.tsx`, `web/src/styles/events-public.css`, `web/src/styles/footer.css`, and `web/src/styles/tokens.css`. The 236 + 112 captures therefore cannot prove the current build. A new source freeze and complete captures/audits from that exact freeze are required before final approval.

### MEDIUM

None in the reviewed frozen round. The public pages use shared header/footer, common section/detail framing, live card and detail components, native pagination links, real Next image elements, and exactly two `PhotoGallery` call sites — the event and highlight detail views. The former duplicate program-list gallery is absent.

### LOW

- **[product] A few admin-control measurements bypass the otherwise token-driven scale.** `web/src/styles/events-admin.css:2`, `:6`, `:9`, `:11`, `:18`, `:22`, `:24`, and `:29` use direct border/size values such as `1px`, `1rem`, `1.25rem`, and `3px`. The values are small, constrained to admin controls, and still use the shared color/radius/spacing tokens, so this does not undermine the reviewed visual system. Future cleanup could add explicit border and control-size tokens.
- **[product] The selection-tab motion bypasses the named motion tokens.** `web/src/components/controls/selection-tabs.tsx:23-26` directly sets a 0.22-second cubic-bezier transition. Using the shared duration and easing values would keep future motion adjustments centralized.

## What the matching frozen evidence establishes

The `e923…` round meets the owner’s visual contract: warm gray-green primary actions; no navigation underline or filled active state; a three-column desktop footer with the visit, centered navigation, and Korean contact heading plus four circular contact icons; icon-only top control; home with three photo cards and no hero location/time caption; uncropped reading-width detail images following titles and preceding date/body; no detail “Photos” heading or generic trailing metadata; native journal pagination; and the safe local, bilingual six-model wallet guide.

Light/dark and Korean/English layouts stayed coherent at the supplied mobile and desktop widths. The guide’s download, model selection, six model-specific first steps, mnemonic, QR, question, retry, and success states remain legible and contained in all 112 inspected images. The real-Bitcoin warning is visible in the guide, and no payment flow appears.

## Required before approval

1. Create a new source manifest after the footer, scroll control, pagination, and card refinements.
2. Rebuild and recapture the complete public/admin set, the full guide matrix, and reduced-motion frames from that manifest’s exact source hash.
3. Rerun this independent review against those artifacts. No product change is requested based on the `e923…` visual round; this gate is solely the loss of evidence/source identity.

## Blockers

- **[evidence]** Fresh frozen-source identity and matching visual evidence are required. Until then, a current PASS would be misleading.
