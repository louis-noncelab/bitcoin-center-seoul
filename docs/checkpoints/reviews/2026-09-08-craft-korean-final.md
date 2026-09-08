# Korean home and wide craft gate

**Recommendation:** APPROVE for the scoped Korean static-render gate.  
**Coverage:** PASS, 30 / 30 requested captures individually inspected.  
**Scope:** `ko-home` at 375px, 768px, and 1280px in light and dark themes, plus Korean `top`, `cards`, and `footer` slices at 1440px, 1920px, 2560px, and 3440px in both themes. This is not a broader route, locale, or motion approval.

## Evidence binding

- Manifest: `docs/checkpoints/evidence/design-craft-2026-09-08/final/source-manifest.json`
- Build: `AFKk_t8vqWjTq4n4S-G_D`
- Commit: `fd7c472d856a257a77bf66766163b3f245a8757f`
- Source fingerprint: `659df61b8e3dd62c257b512c06e5dc722de36d6971282528682ab87f41721326`
- Capture paths: `docs/checkpoints/evidence/design-craft-2026-09-08/final/public-site/` and `docs/checkpoints/evidence/design-craft-2026-09-08/final/wide/`

Every requested file was opened directly at original resolution. SHA-256 verification matched all **30 / 30** requested capture entries in the manifest. All **2,563 / 2,563** manifest-listed source files also matched their recorded SHA-256 values.

| Surface | Light | Dark | Result |
| --- | --- | --- | --- |
| `ko-home` full page: 375 / 768 / 1280 | 3 | 3 | 6 / 6 pass |
| Wide top: 1440 / 1920 / 2560 / 3440 | 4 | 4 | 8 / 8 pass |
| Wide cards: 1440 / 1920 / 2560 / 3440 | 4 | 4 | 8 / 8 pass |
| Wide footer: 1440 / 1920 / 2560 / 3440 | 4 | 4 | 8 / 8 pass |

## Static visual result

The Korean home holds a deliberate 5/7 hero relationship, documentary photography, and compact practical rail from 375px through 3440px. Korean title and body lines remain legible and keep natural word groups; no clipped Korean, unintended mid-word break, or layout overflow was observed.

The shared 80rem measure remains centered as the viewport expands. At 1440px through 3440px, the hero, program selection, two exhibition plates, journal rows, goods band, and footer align to the same content edges. The very wide outer margins are a consequence of the stated capped measure, while cards, imagery, and controls retain useful physical size rather than scaling down.

All observed primary and secondary actions use the shared 48px control height, 8px control radius, and 12px media treatment. Adjacent exhibition cards retain equal image frames and aligned captions. Dark mode preserves the same information hierarchy and real photography, with readable light text, orange visiting actions, and blue selected/name signals.

The footer is substantial and stable across each wide capture: the marquee occupies a reserved band above practical visit, navigation, and contact groups; the contact buttons remain readable; and the lower copyright/back-to-top row stays aligned. The partial letters at the marquee window edges are the expected overflow-clipped frame of moving text, not clipped footer content. The static captures show no shift or collision with the content below.

## Component and design-system integrity

- [`center-photo.tsx`](../../../web/src/components/site/center-photo.tsx) renders documented media as live Next `Image` elements with localized alt text and focal positions at lines 13–37. It is not a page screenshot or CSS background substitute.
- [`home.tsx`](../../../web/src/components/site/home.tsx) composes the hero, shared `SectionFrame`, program, experience, journal, goods, and page-motion components at lines 10–110. The footer is a separate reusable [`SiteFooter`](../../../web/src/components/site/site-footer.tsx) at lines 9–63.
- [`tokens.css`](../../../web/src/styles/tokens.css) supplies the 80rem content cap, 48px control height, 8px/12px radii, type scale, and 48-second marquee duration at lines 3–116. [`primitives.css`](../../../web/src/styles/primitives.css) consumes the shared control tokens and applies Korean `keep-all` at lines 18–180.
- [`brand-marquee.tsx`](../../../web/src/components/controls/brand-marquee.tsx) provides real DOM text, an accessible label, and a pause/play control at lines 8–42. [`footer.css`](../../../web/src/styles/footer.css) reserves the marquee height and limits animation to `prefers-reduced-motion: no-preference`; the unenhanced/reduced-motion base is static.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None in the scoped static evidence.

### LOW

None in the scoped static evidence.

## Scope limits and Blockers

There is no static visual blocker in the requested Korean coverage.

Still captures cannot independently establish marquee continuity, hover/pause behavior, press feedback, menu behavior, entrance timing, hydration stability, or reduced-motion runtime behavior. Those are intentionally excluded from this review rather than inferred from the still frames.
