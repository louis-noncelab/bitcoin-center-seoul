# Clone / design-system fidelity review — `revision_design_review`

**Recommendation:** APPROVE  
**Review result:** PASS  
**Confidence:** 0.94  
**Reviewed render:** build `36qqQbDoOvDD_Ek_d-Bop`, source-manifest SHA-256 `60c1427be1db34f041ddc9d02884837893b7209688d87e3bed6e4927e7f88d69`

## Scope and evidence integrity

The manifest contains 141 source entries. I independently verified its SHA-256 and opened the current captures, rather than using the earlier rejected `first-*` material or treating automated checks as visual proof.

- 96/96 fresh public renders: each of `home`, `about`, `programs`, `experience`, `journal`, `goods`, `visit`, and `design-system`; for Korean and English; light and dark; at 375, 768, and 1280 pixels. This is the complete `public-site/{ko,en}-{name}-{light,dark}-{375,768,1280}.png` matrix.
- 8/8 interaction-state captures: `states/hero-0.png`, `hero-100.png`, `hero-650.png`, `tab-rest.png`, `tab-transition.png`, `tab-settled.png`, `skip-focus.png`, and `menu-open.png`.
- Motion and mobile-footer spot evidence opened: `manual/scroll-{0,100,600}.png`, `manual/panel-{0,100,500}.png`, `manual/ko-dark-375-footer.png`, and `manual/en-dark-375-footer.png`; corresponding browser measurements in `manual/manual-check.json` and `browser-audit.json` were read.
- Source and contract examined: `web/AGENTS.md`, current contract in `web/DESIGN.md`, the public parts of `/Users/max/saturdayblock-web`, `web/src/styles/tokens.css`, `web/src/styles/primitives.css`, `web/src/styles/site.css`, `web/src/components/site/*`, `web/src/components/controls/*`, `web/src/components/ui/primitives.tsx`, and `web/src/content/media.ts`.

## Findings

### CRITICAL

None. The result is live React/Next UI. It does not substitute a page image, canvas, or CSS background screenshot for the interface. `CenterPhoto` emits `next/image` with real locally imported center photography and localized alt text ([`center-photo.tsx:13`](../../../web/src/components/site/center-photo.tsx#L13)); the photo catalogue is real image metadata ([`media.ts:1`](../../../web/src/content/media.ts#L1)). `MediaFrame`, `SectionFrame`, and `ActionLink` are real shared DOM primitives ([`primitives.tsx:29`](../../../web/src/components/ui/primitives.tsx#L29)).

### HIGH

None. Colors, typography, spacing, dimensions, radii, layering, and motion are driven from the shared custom-property system in [`tokens.css:1`](../../../web/src/styles/tokens.css#L1), then consumed by reusable primitives and site styles. The one JavaScript motion duration is an explicit format bridge to the token value, documented in [`selection-tabs.tsx:20`](../../../web/src/components/controls/selection-tabs.tsx#L20), rather than a visual one-off.

### MEDIUM

None. The mobile footer was specifically checked in Korean and English. At 375px, the address wraps at sensible boundaries (for example, `30` / `2층`) and the longer English address and hours occupy additional lines. Neither version clips, breaks Korean within a word, uses undersized text, weakens the contact actions, or disrupts reading order. This is an acceptable compact two-column treatment, not a responsive-information defect.

### LOW

None.

## Fidelity assessment

- The shared page tree composes header, content, and footer as live components; home repeats `SectionFrame` and `MediaFrame` rather than duplicating isolated layouts ([`home.tsx:10`](../../../web/src/components/site/home.tsx#L10)). Detail routes reuse the same content and action primitives ([`section-content.tsx:9`](../../../web/src/components/site/section-content.tsx#L9)).
- The result is a structural adaptation of SaturdayBlock’s compact, regular editorial grid: it preserves the center’s own brand colors, Pretendard, localized content, and photos. Renders show orderly aligned media, grouped panels, pill actions, and the useful four-column desktop footer without copying the reference’s branding or pretending to be a pixel clone.
- All rendered photos have regular, non-diagonal frames. The two experience frames are equal 4:3 in the inspected mobile and desktop evidence; captions align to their own frames. The direct measurement evidence records 335 × 251.25px at 375px and 576 × 432px at 1280px.
- Contact controls are prominent button-like links, not underlined text. The inspected measurement evidence records 50px height and `text-decoration: none` for email and telephone actions; the visit page also makes map, email, and phone actions immediately findable.
- Horizontal program selection is a real tablist: buttons expose `role=tab`, `aria-selected`, roving tab focus, left/right and Home/End handling, and labelled tab panels ([`selection-tabs.tsx:42`](../../../web/src/components/controls/selection-tabs.tsx#L42)). The rest, transition, and settled captures visibly show the selection changing and the panel completing.
- Native section arrival is real and visible. The 0/100/600ms manual scroll sequence changes from hidden to partially revealed to fully revealed; the panel sequence does the same over its shorter transition. `PageMotion` derives a 600ms value correctly from either `600ms` or optimizer-serialized `.6s` ([`page-motion.tsx:11`](../../../web/src/components/site/page-motion.tsx#L11)). Its observer and animations are disconnected/cancelled on media change and effect cleanup ([`page-motion.tsx:34`](../../../web/src/components/site/page-motion.tsx#L34)); the reported observer warning is not a lifecycle defect.
- Both themes retain contrast, clear visual hierarchy, and meaningful active-navigation state. The skip-link and open-menu state are visibly usable. Source search found no `Mapo`, `마포`, or `센터 한쪽` public copy, and no raster or data-URI page substitution.

## Blockers and minimal fixes

None. No CRITICAL or HIGH design-system, DOM-integrity, responsive-hierarchy, or visual-fidelity issue remains in the reviewed frozen render.
