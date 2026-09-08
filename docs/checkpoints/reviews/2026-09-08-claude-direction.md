# Claude design-direction review — 2026-09-08

Real Claude CLI, read-only source and images; direction feedback, not implementation approval. Exit0, is_error=false.

## What I actually viewed

Read: `web/DESIGN.md` (current contract, lines 1–160), `web/src/components/site/home.tsx`, `web/src/styles/site.css`, `web/src/styles/site-sections.css`, `web/src/styles/tokens.css`, `web/src/content/media.ts`. Viewed as images: `final/manual/ko-light-1280-top.png`, `ko-dark-375-top.png`, `ko-dark-375-footer.png`, `final/public-site/ko-home-light-1280.png`.

## Critique

The candidate is competent and orderly, and the hero at 1280 is genuinely good: real photography, honest copy, correct type scale. The problem is that order has become uniformity.

**One template, six times.** In the full-page capture, `about`, `programs`, `experience`, `journal`, `goods`, `visit` all resolve to: hairline → h2 → one grey line → pill → a 4:3 photo. `home.tsx:59–124` literally repeats the same `section-heading` + right-aligned secondary pill block four times, and `.about-preview`/`.goods-preview` share one rule (`site-sections.css:1`). Nothing tells the visitor which section matters. Scroll rhythm is metronomic because `--section-gap` maxes at 4rem (`tokens.css:59`) while every divider is the same hairline.

**Weak hero identity.** Identity currently equals wordmark + orange full stop. Everything else — eyebrow, 14ch headline, 42ch paragraph, two pills, 21:9 frame with the same 12px radius as every other frame — is the default editorial template. `.hero-heading` uses `align-items: center` on a 1.1fr/1fr grid, so the intro column floats at no defensible optical relationship to the masthead. At 375 (dark) the 4:3 crop reduces the lounge to a corner, and the section immediately below starts with the identical heading/pill pattern, so the hero never reads as a threshold.

**Photo tone drift is structural, not per-image.** `gallery` is tungsten-warm, `community`/`education` warm amber, `exhibition` flat cool grey, `experience` and `retail` bright neutral white. Placed in equal adjacent frames, the page looks like a folder of phone photos. `media.ts` encodes focal points and ratios but no grade contract.

**Footer under-closes.** At 375 (dark) it is a stack of small labels with a 2×3 nav grid, two differently-weighted contact buttons, then a thin copyright row. It informs but does not conclude; the brand appears at `--text-subheading`, smaller than any section heading above it.

## Proposed art direction: *Documentary Index*

The site is presented as the center's own working index of a real room: numbered sections, one persistent spine, and photography treated as evidence rather than decoration.

**Spine.** A 1px `--line` rail runs the full document at the grid's left edge (desktop) / hidden on mobile, carrying section numbers (`01`–`06`) and the section name in `--text-caption`, sticky within each section. An orange hairline segment inside the rail tracks scroll progress. This is the single new identity device and it replaces four repeated pills as the wayfinding mechanism.

**Three section archetypes, not one.** Every section must declare one of: **Evidence** (full-bleed photo, edge-to-edge past the 80rem container, caption on the grid), **Index** (typographic list, no photo — journal, and programs' schedule), **Panel** (paired copy + framed media, current `about`/`goods` anatomy). Assign: about = Panel, programs = Panel, experience = Evidence, journal = Index, goods = Panel, visit = Index. Adjacent sections may never share an archetype. Section rhythm becomes `--section-gap` 64px between same-family, 112px before an Evidence section.

**Hero.** Masthead moves to a two-line left block on the grid with the eyebrow as a rule-and-label pair; the intro and both actions align to the *baseline* of the masthead's last line, not to its centre. The lounge photo goes full-bleed at 16:9 desktop / 5:4 mobile with 0 radius (radius belongs to Panel frames only), and the caption row becomes a three-cell fact rail — station, hours, address — separated by hairlines, real data only. Below 768px the fact rail collapses to two rows.

**Photography grade contract.** Add per-asset `--photo-grade` tokens in `media.ts` (`filter: saturate() contrast() brightness()` plus a small `sepia`/`hue-rotate` nudge) tuned once to bring all seven images to a common neutral-warm target; in dark theme apply a 4–6% brightness reduction. Evidence photos additionally get a bottom canvas-to-transparent gradient so captions sit on the image.

**Footer.** Becomes a colophon: the wordmark at `--text-heading` on the top row spanning the grid, the address/hours block as the practical close directly beneath, then nav and contact columns, then the bottom band. Contact actions use one variant, not two.

## Motion (three mechanisms)

1. **Hero threshold.** Photo reveals via `clip-path: inset(0 0 100% 0)` → `0`, 700ms `cubic-bezier(0.16,1,0.3,1)`; masthead line 1 / line 2 / intro / actions stagger at 0/70/140/210ms, 20px rise, 520ms same easing; fact rail hairlines scale-X 400ms at 320ms. One sequence, ends by ~950ms.
2. **Spine tracking.** IntersectionObserver (`rootMargin: -45% 0px`) swaps the active section label with a 240ms crossfade + 4px rise; the orange progress segment uses `animation-timeline: scroll()` where supported, otherwise stays static. Section content enters once, 24px / 560ms, 60ms stagger, max 3 children.
3. **Programs selection morph.** Keep the existing shared background, retimed with WAAPI FLIP at 320ms `cubic-bezier(0.2,0,0,1)`; panel photo cross-dissolves 400ms while the description lines rise 300ms with 40ms stagger. Controls stay at 160–220ms.

All three disabled to opacity-only (or nothing) under `prefers-reduced-motion`, which the current CSS already scaffolds at `site.css:178`.

## Five ranked changes

1. **Adopt the three archetypes** and remove the repeated `section-heading` + pill block from at least three sections in `home.tsx`.
2. **Rebuild the hero** — baseline alignment, full-bleed photo, fact rail, radius removed.
3. **Add the photo grade contract** to `media.ts` + `CenterPhoto`.
4. **Add the spine** with numbering, active-section tracking and progress.
5. **Rebuild the footer** as a colophon with a dominant wordmark and single-variant actions.

## Failure risks

- Full-bleed Evidence photos can break the 80rem contract if implemented with viewport-width hacks; use a grid `full-bleed` column, and re-check `sizes` or LCP regresses.
- The spine can degrade into decoration at 1024–1120px where nav already collapses; specify its hide breakpoint before building.
- Filter-based grading raises paint cost on large images and can crush shadows in dark theme; verify contrast of captions over Evidence gradients.
- `animation-timeline: scroll()` support is uneven — it must be purely additive.
- Section numbering is meaningful only if section order is stable; if content order changes often, numbers become noise.
- Increasing gap before Evidence sections lengthens the page; confirm mobile scroll depth stays acceptable.

## Root decision
Adopt distinct section anatomies, coordinated state transitions and stronger footer. Do not adopt decorative numbering/spine, broad photo filters, square full-bleed edges or wider gaps: these conflict with the owner's ordered, moderately rounded, less empty direction.
