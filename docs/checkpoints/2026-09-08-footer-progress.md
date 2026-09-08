# Footer contacts, reading progress and hero review — 2026-09-08

Latest user requests: icon-only footer reservation/contact actions like the supplied SaturdayBlock reference; a top reading-progress line; independent UI/UX designer check of hero photo length and intro/button placement. Previous source725f1f19b5735fe9640b46431ed918b81ca16aa74fad585ca66ca55b09f7a106/build7pPh7w-kNyrXLmmKQJHB- is the before state.

Additional approved request: assemble the home title's letters on entry, and let individual content groups settle into place as they reach the viewport. Preserve the full accessible/SEO name and the compact hero correction. The earlier whole-section trigger could finish lower mobile content before it was visible; observe individual reveal parts instead. Native CSS/WAAPI, no new dependency, visible content without JavaScript and reduced-motion support.

## Plan
- completed: read current footer/layout/controls and screenshot; define bounded contact/progress contract; preserve before copies.
- completed: implement footer icon actions, scroll progress and the designer-reviewed compact hero composition.
- completed: add the newly requested title assembly and viewport-timed content entrances; fix the old contact-text-derived SEO test to use actual contact destinations.
- completed: actual browser checks of scroll endpoints/history/resize, icons/focus, hero across languages/themes/mobile/wide; local check/build and durable handoff.

## Ownership
- Root: reading-progress component/integration/tokens/style/tests, DESIGN, hero integration after designer review, all browser work and verification records.
- Footer worker: site-footer.tsx and footer.css only, plus its report. Keep other edits intact.
- hero_composition_ux: read-only diagnosis/recommendation in reviews/2026-09-08-hero-ux-check.md. The supplied hero image is a zoomed desktop capture inside Orca mobile, not evidence of responsive overflow.
- scene_motion: PageMotion and motion.spec.ts only; per-part viewport observation and reduced-motion/cleanup checks. Root owns title markup/CSS and home reveal grouping.

Interim verification: check/build passed for source3ce1acc0a13998ef93e4c1e2537d7ac3d30ceb9ef08144472ec2395663d1d287/buildjxX_LSl_Y8BZ2fcFwJjBb. Browser suite: 136 passed, 2 failed because old SEO tests read now-empty visible footer text; JSON-LD kept the real email/telephone. Preserve this result as `final/playwright-before-title-136-pass-2-contact-expectations-failed.log`; it is not final coverage. WebKit browser installation completed locally.

Current product build: `RcYcgiLOZAi3KkRBM4anP`. Final source/test fingerprint after fixture corrections: `182389382a6dddb6960a82d41bd27f7104d27aca0aff48a454b4dc4124c385d4`. The first title run passed135/142; preserve its log. Two old image selectors needed the new photo-group wrapper, two motion fixtures mutated DOM before hydration and were restored, and two exact CSS timing assertions encountered72.00000000000001ms. Fixed those test inputs/timing precision without changing the product or pixel thresholds. Focused title/image checks now pass4/4. The remaining development-only routing test expected an executable dev script in a production build; exclude that dev-only case from the production run and separately assert all three production dev-tool requests return empty404 (recorded in `production-dev-tools.json`). Do not enable dev tools to pass a production test. Fresh141-case production suite is running.

No source reset/clean/stage/commit; web/ remains untracked. No Actions, backend/DB, deployment, new routes/shops/signups, or remote tunnel. Existing font/SVG/licenses, true destinations, locale SEO and preview exclusion preserved.

## Final verified outcome

- All authorized changes in this increment are implemented. No active plan step remains.
- Source/test fingerprint `182389382a6dddb6960a82d41bd27f7104d27aca0aff48a454b4dc4124c385d4`, product build `RcYcgiLOZAi3KkRBM4anP`, unchanged HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`.
- Node22 check/build pass. Production Playwright141pass; separate correct production dev-tool404 checks pass. Earlier failure logs are retained, not final results.
- Identity28layouts +4text-zoom cases, footer/progress12variants, wide20layouts, WebKit5scenarios, axe32zero violations, narrow reflow16zero overflow. Axe's3color-contrast incomplete cases are separately resolved by computed contrast + clipping/hit-test/opacity checks; ratios5.544/8.149/15.563.
- Manifest rechecked2568sources,282PNGs,7originalphotos. Two10.6/11sec native browser motion recordings exported to MP4 and hash/encoding verified. Root directly inspected17current frames; independent UI/UX followup inspected6new static frames.
- Final code review: APPROVE/WATCH, no blockers. One nonblocking maintenance note concerns the synthetic test for the pre-existing unmarked-section fallback; current real groups are covered separately.
- Preservation/ignore checks pass; disabled workflow and lockfile hashes unchanged. Preview remains localhost3100; no remote tunnel or release operation.
- Next entry: [2026-09-08-motion-footer-next.md](../handoff/2026-09-08-motion-footer-next.md). It carries the four latest requests and original-scope constraints forward.
