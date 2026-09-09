# Events-only delivery system — design-system and functional integrity

**Recommendation:** APPROVE
**Frozen source digest:** `8892db6865be554f131734f03d03604b01bfd2bbbe40376668cbecb6b7d4aa10` (251 files)

## Scope and evidence inspected

- Current owner requirements in `web/DESIGN.md` and `docs/superpowers/specs/2026-09-09-events-only-design.md`.
- The complete source-freeze manifest, independently re-hashed against the working tree: all 251 entries match.
- `capture-integrity-final-pass.json`, independently checked: 450 distinct PNG artifacts have valid PNG signatures and non-zero IHDR dimensions. Coverage is 256 public/admin captures, 112 guide states, 10 guide-motion frames, 40 notice captures, 16 delivery-motion frames, and 16 card-arrival frames.
- Per-capture audit evidence: all 256 complete, 112 guide, and 40 notice states report HTTP 200, zero page errors, zero horizontal overflow, and zero axe violations. The motion evidence records the required hover lift/shadow, opacity-only new-content entry, smooth pre-navigation return-to-top, and reduced-motion settling.
- Fresh rendered evidence opened directly: Korean light desktop home and journal page 2; English dark mobile programs and desktop wallet guide; Korean light notices and admin; notice public/admin states in both themes; Korean wallet guide mobile; delivery-motion and card-arrival sequences.
- Read-only current runtime probes at `http://127.0.0.1:3102`: public, journal pagination, notice, guide, and Korean/English admin routes return 200. The journal SSR response contains 12 semantic `<article class="highlight-card">` records and pagination links; it has no canvas or CSS screenshot/background-image substitute.

## Findings

### CRITICAL

None. The UI is a live Next/React component tree. `CenterPhoto` renders real `next/image` media, and event/highlight galleries render record images directly ([center-photo.tsx](../../web/src/components/site/center-photo.tsx#L13), [events-public.tsx](../../web/src/components/site/events-public.tsx#L76)). The small `data:image` values in home SSR are Next image blur placeholders for those real images, not a rendered-screen substitute.

### HIGH

None. Shared tokens define both theme palettes, type scale, spacing, geometry, layers, and motion ([tokens.css](../../web/src/styles/tokens.css#L1)). Shared `Button`, `ActionLink`, `SectionFrame`, and `MediaFrame` primitives provide the live reusable visual layer ([primitives.tsx](../../web/src/components/ui/primitives.tsx#L9)); public cards, footer, notices, wallet guide, and administration compose those primitives rather than reproduce page-local imitations.

### MEDIUM

None. The layout follows the stated responsive structure: document landmarks, semantic titles, gallery/card lists, 12-record journal paging, compact three-column footer, and the Korean-only administration have corresponding real route and component paths ([page.tsx](../../web/src/app/%5Blocale%5D/%5Bsection%5D/page.tsx#L59), [events-public.tsx](../../web/src/components/site/events-public.tsx#L166), [site-footer.tsx](../../web/src/components/site/site-footer.tsx#L12)).

### LOW

None that affects the approval. `events-admin.css` retains a few native-control literals such as `1px` and `1rem` ([events-admin.css](../../web/src/styles/events-admin.css#L2)); they exactly duplicate existing design roles and do not introduce off-system color, spacing, typography, or a divergent rendered component. They are a cleanup opportunity if the token policy is later tightened to require zero literal aliases.

## Integrity conclusions

- No pasted-screen, page-sized raster, `canvas`, or CSS `background-image` is used to construct the interface. Images are confined to center photography, record galleries, QR codes, and the supplied brand mark.
- Public cards, pagination, footer links, notices, and wallet states are live links, buttons, forms, and semantic content. `ContentLink` handles the requested current-screen return-to-top before route navigation, parses the shared duration token, and leaves reduced-motion immediate ([content-link.tsx](../../web/src/components/controls/content-link.tsx#L14)).
- Card lift and image shadow are limited to hover-capable, non-reduced-motion environments; the new journal/detail content entry is opacity-only ([events-public.css](../../web/src/styles/events-public.css#L105)). The floating top action is removed from keyboard/assistive navigation while hidden and restored only after scroll ([back-to-top.tsx](../../web/src/components/controls/back-to-top.tsx#L8)).
- Visual review found the intended gray-green primary action, rounded media/panels, stable mobile reading order, readable Korean wrapping, current-page circle, four contact icons plus collaboration email, and the required Mapo-gu address. The card-arrival frames show no vertical entry transform; guide and general motion both settle cleanly when reduced motion is active.

## Blockers

None.
