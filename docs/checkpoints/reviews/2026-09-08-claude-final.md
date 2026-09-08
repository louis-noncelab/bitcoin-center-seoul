# Claude final visual review — 2026-09-08

Real Claude CLI read-only source/image review, exit0, is_error=false.
Build NzQQpR_UFZ019chp0Cnef; source fingerprint e906a0d0c62ec0ff64334945190d71de863a77e6d3fa6462e2d661d467ff782a.

## What I actually viewed

Read only, no edits, no browser: `web/DESIGN.md`; `src/components/site/home.tsx`; `styles/site.css`, `site-sections.css`, `navigation.css`, `motion.css`; images `final/manual/ko-light-1280-top.png` (true 1280×900 viewport), `final/public-site/ko-home-light-1280.png` (1280×3906 full page, viewed at ~0.51×), `final/public-site/en-home-dark-375.png` (375×4854, ~0.41×), Bali `1280-top-settled.png` and `375-menu-settled.png`; `reviews/2026-09-08-bali-benchmark.md`.

Evidence limits I am not papering over: the two full-page PNGs are heavily downscaled, so I judged **structure and alignment only**, not type size or sharpness from them; the only true-scale shot is ko-light-1280-top. No 375 viewport-crop, no dark desktop, no menu-open or program-switch capture was supplied, and the numeric token file (`--text-body`, `--radius`, `--control-height`) was not in the list — so 17–18/16/15px and 8/12px radii are **unverified**, and I make no claim about motion quality or the 120 passing tests.

## Verdict

**Scoped visual PASS** for Korean light desktop 1280 and overall home structure at 375/1280. The four corrections landed and are visible: goods photo now spans the full content width (ko-1280 y≈1400–1660), program heading/description/`행사 일정 확인` are grouped and vertically centred against the photo (`site-sections.css:21–33`), journal rows carry real summaries (`home.tsx:84`, `.record-summary`), and the hero station fact is a real map ActionLink, not a span (`home.tsx:43–45`). Real photography only, no invented events, no Bali-derived art. Against the benchmark it trades Bali's illustrated mascot hero for documentary proof of the actual room — the right call for this venue; presence is achieved through the 5/7 photo and two-line name rather than spectacle. No blockers.

## Three ranked refinements (all real, none blocking)

**1 — Goods caption band doesn't align with the journal split above it.**
`.journal-preview` is `minmax(0,1fr) minmax(0,2fr)` at `gap: var(--space-10)`; `.goods-copy` is `minmax(0,1fr) minmax(0,2fr) auto` at `gap: var(--space-8)` (`site-sections.css:40, 68`). The extra `auto` track plus the smaller gap shifts the second column start by ~40–45px. Visible in `ko-home-light-1280.png`: the journal rows' text column begins near x≈460 (full-res) while `비트코인 관련 소품과 도구를…` begins near x≈415 — two consecutive one-third/two-third bands that miss each other. Fix: give `.goods-copy` the journal's tracks and `var(--space-10)` gap, and place `.section-link` on column 2 with `justify-self: end` (or add a shared 4th `auto` track to `.journal-preview`). Also consider aligning the `h2` and paragraph on a first-line baseline rather than box tops.

**2 — Desktop navigation disappears at 1120px, where it still fits.**
`navigation.css:139` hides `.desktop-navigation` below 1120px. In ko-light-1280-top the six links occupy x≈420–863 (443px), wordmark ends ≈158, locale/theme start ≈1130. At 1024px the free span is roughly 660px — the row fits with margin, so a common laptop/tablet class loses all six explicit destinations to a hamburger. Bali's transferable lesson was direct access. Fix: move the breakpoint to ~960px, optionally trimming `.navigation-link` padding to `var(--space-2)`; verify no overlap at 1024 and 968.

**3 — The exhibition pair is asymmetric at the bottom.**
Equal 4:3 frames and captions, but only the right plate carries an action (`지갑 체험 가이드`, `.experience-object .button`, `site-sections.css:39`), so with `align-items: start` the left column dead-ends ~60px short (ko-1280 y≈1030–1105). Fix within the existing design: move the wallet-guide button to the section's action row alongside `전시·체험 안내`, or bottom-align both captions so the pair reads as one composition.

## Root adjudication (before final polish)
Accept the goods caption alignment refinement and verify a lower desktop-navigation breakpoint against BOTH languages before changing it. Keep the hardware-wallet guide with its corresponding photograph: it is a specific real action, not an arbitrary imbalance requiring a filler link. Final visual reviewers also identified English Education wrapping in the journal category; restore a sufficiently wide fixed category column. These planned edits require a fresh build and affected visual verification.
