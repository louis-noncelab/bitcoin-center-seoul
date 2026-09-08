# Public design revision — 2026-09-08

Status: **UI/UX revision and verification complete; owner visual adoption remains open**. The previous candidate's technical PASS is historical;
the owner rejected its whitespace, composition, weak controls, footer and copy.
Branch: `redesign/center-web`. Base HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`.

## Accepted direction

- Orderly, consistent alignment and image sizes. No artificial diagonal offsets.
- Use the actual SaturdayBlock public source as the structural reference:
  `components/HomePageClient.tsx`, `components/Navigation.tsx`,
  `components/Footer.tsx`, `app/globals.css`, `lib/animation-variants.ts`.
- Carry its grouped controls, regular grid, compact footer columns and staged
  motion into the center's existing light/dark orange/blue identity. Its platform
  content, smaller text, glows and backend are outside this adaptation.
- Clear buttons for contact and page actions. Readable small text, shorter gaps,
  closely grouped category/title rows, visible hover/focus/selected states.
- Remove district terminology from public copy and metadata, including the
  displayed address; retain its accurate street/building/floor and map link.
- Plain Korean and English: name the section and describe the real content.
  Remove mood-setting filler such as “센터 한쪽의”. No invented operational facts.
- Preserve Pretendard, local SVG libraries, bilingual routes and preview noindex.

## Execution plan

1. completed — Current/reference comparison, record revision contract and
   reproduce navigation scroll offset.
2. completed — Implement shared tokens, aligned sections, buttons/footer, restrained
   entrance and state motion; integrate copy and navigation repair.
3. completed — Run local type/lint/build and relevant browser regressions, inspect
   full pages and interactions in actual Chrome, independent visual review.
4. completed — Resolve review findings, capture final evidence and update handoff.

## Ownership

| Owner | Files / output |
| --- | --- |
| root | `web/DESIGN.md`, shared CSS, home/section/footer composition, motion, integrated verification and this checkpoint |
| saturday_design_reference | Read-only reference packet, delivered; no reference repository changes |
| nav_scroll_fix | Locale layout HTML scroll attribute only, navigation regression and dedicated checkpoint |
| plain_language_copy | `web/src/content/{center,site,media}.ts` and copy revision checkpoint |

Do not revert another owner's work. Existing legacy/untracked files are retained.
No commit, GitHub Actions, backend, DB, or deployment work is authorized here.

## Findings before changes

- Experience image has `margin-block-start: 8rem`, mobile left offset and 85%
  width. About photo has another 3rem top offset. These explain the forced layout.
- Record rows use `1fr 4fr auto`; category/title distance grows with screen width.
- Footer has three uneven columns and underlined email rather than a clear action.
- Public caption is 13px; descriptions and footer links are often 14px.
- Nav agent reproduced route offsets: about/programs/experience/journal/goods
  48px, visit 96px. Reduced motion is 0px. Toggling the documented Next HTML
  scroll-behavior attribute changes 48 → 0 → 48 on the same click.

## Validation evidence

Initial `npm run check` passed (Next route type generation, strict TypeScript,
ESLint with zero warnings). LSP's 3-second timeout on section content is not a
clean LSP claim. Browser/build evidence follows under `evidence/revision-2026-09-08/`.
The old screenshots and source manifest remain untouched.

Root browser inspection found and repaired two implementation defects before
the independent visual gate: media-frame selector specificity had retained 16:9
instead of the new equal 4:3 crop; optimized CSS serialized `600ms` as `.6s`,
which bare parseFloat incorrectly passed to Web Animations as 0.6 milliseconds.
The motion regression is captured in `motion-before.log` (normal motion fails,
reduced motion passes); duration conversion now handles both CSS time units.
Specimen caption/gutter descriptions are updated to the actual 14px/48px tokens.

## Frozen initial visual-review build

- Build `36qqQbDoOvDD_Ek_d-Bop`; base HEAD unchanged.
- Manifest `evidence/revision-2026-09-08/source-manifest.json`, SHA-256
  `60c1427be1db34f041ddc9d02884837893b7209688d87e3bed6e4927e7f88d69`.
- 141 source/config/font files and 122 fresh PNGs: 96 complete pages, 8 states,
  18 headful manual captures. PNG signatures, dimensions, and post-edit timestamps checked.
- `npm run check`, build, 110 browser tests, 54 DPR image measurements passed.
  Accessibility: 32 axe runs, 16 narrow reflow checks, 7 HTTP checks, no violations
  or external runtime requests. Four headful CDP font checks confirm Pretendard.
- Actual section entrance: 600ms; opacity 0 → 0.5975 at 100ms → 1 at 600ms.
  Reduced motion disables it; content and links work with JavaScript disabled.
- React Scan audit: 16 routes, zero runtime errors or idle commits. The first
  audit hung without progress and was interrupted (exit 130); bounded font-status
  waits and per-route receipts completed the retry. Underlying first hang is not
  established as a product defect. Production profiling hooks remain unavailable
  (`no-inject-method`); this is not an “unnecessary renders = 0” claim.
- React Doctor: 70, one error and two warnings. Observer cleanup warning is a
  source-verifiable false positive: cleanup calls `stop()`, which disconnects
  the observer and cancels animations, then removes the media listener. Other
  warnings concern intentional initial selection state and a seven-item server
  navigation filter/map. No suppressions or speculative memoization added.
- Root spotted narrow mobile footer address/hours wrapping. Independent lanes
  are checking every page and will return a combined final-fix list.
- Baseline top-frame pixel diff: 66.65% changed, intact alpha, equal 1280×900.
  This quantifies departure from the rejected old candidate, not a clone score.

Raw test/build/browser artifacts are ignored. The `.gitignore` cleanup from the
previous work remains effective; all source, licenses and checkpoints remain
reviewable. Disabled workflow SHA-256 remains
`f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`.

## Initial review and final correction batch

Both independent reviewers finished. Integrity lane PASS; visual/CJK lane REVISE
with three concrete refinements. Reports are preserved in `reviews/2026-09-08-revision-initial-*`.
Root accepted the visual findings: mobile footer full-width groups with two-column
navigation, About card balanced wrapping, and goods detail original 16:9 ratio.
Only the two shared CSS files changed; facts and functionality remain preserved.
Final capture scripts use a fixed program route/viewport for the tab sequence.
Initial Lighthouse 32/32: performance/accessibility/best practices 100, SEO66–69,
max LCP1067.85ms and CLS0 under local warmed-cache conditions.
Final verification artifacts are isolated under `evidence/revision-2026-09-08/final/`.


Root final-width measurement caught an orphan English word at 768px despite
`text-wrap: pretty`. Before issuing any final READY, the rule was changed to
`text-wrap: balance` for these short notes. Temporary browser CSS proved all
three cards at 375/768/1280 end with multi-word lines while keeping the same copy.
The intermediate build `kbW95A12JSfvXm_wKF3GW` (110 passing tests,32 axe,16 reflow)
and its captures are preserved under `pre-wrap-fix/`. Its partial Lighthouse run
was stopped intentionally before the new build to avoid mixed-build evidence.
The final build and fresh captures supersede that intermediate verification.


## Final source and capture freeze

Build `SKMZrpDkw36xxCbLYGY6Z`, unchanged base HEAD.
`final/source-manifest.json` SHA256
`0375c3d7cbda6dc6d8ca46499868306d8d999214ac5a18af4bc5c48300cacef1`.
142 source/config/font/doc files and127 PNGs:96 pages,8 states,18 manual,5 focused fixes.
Every PNG signature/dimension/hash and post-source-edit timestamp checked.

- Final typegen, strict TypeScript, ESLint0 warnings and production build pass.
- Root's actual Chrome measurements:335px mobile footer visit width; goods16:9;
  no isolated final English word in any of the three cards at375/768/1280.
- Root opened final desktop hero, mobile footer, goods detail and tablet notes.
  Other layouts, real motions, buttons/navigation and no-JS were exercised in headed Chrome.
- Manual report:4 layouts,4 actual Pretendard checks,7 motion states,noJS pass,0 page errors.
- Axe32 runs0 violations;320px reflow16 runs0 overflow;7HTTP checks pass;0 external runtime requests.
- Final browser suite recorded all110 passed assertions; runner termination is still being checked.
- Fresh final reviewer `/root/revision_final_gate` received READY for this exact manifest.
- Git eligibility recheck:2460 source/asset/test/handoff/review files are not ignored;
  local generated/private paths are ignored. Disabled workflow hash remains unchanged.


Final run's110 test assertions passed but Playwright did not finish browser-fixture
teardown while other Chrome audits ran. The runner was explicitly interrupted
(exit130) after its last assertion. This is not recorded as a clean suite PASS.
The same source/captures remain frozen; a serial retry will write to a separate
`final/serial-verification/` folder after the other browser audits stop. No test,
timeout or application behavior is weakened. The first final captures remain
immutable for the independent reviewer.


Final Lighthouse32/32 completed on `SKMZrpDkw36xxCbLYGY6Z`:
performance/accessibility/best practices100; SEO66–69 with deliberate preview
noindex; maximum LCP992.385ms, CLS0, TBT0. These are local warmed-cache laboratory
runs, not cold-load field/p75 claims. Final React runtime audit covered16 routes
with0 page errors; production profiling hooks are unavailable, as in the initial
run, so idle-commit counts do not establish the absence of unnecessary renders.


Isolated final retry completed normally: **110 passed (1.1m), exit0**.
Receipt: `final/serial-verification.log`; debug lifecycle shows browser graceful
close, process exitCode0/signal null, graceful-close end. Chrome emitted macOS
CVDisplayLink diagnostics, but no application page errors; the suite completed.
The retry did not overwrite any reviewed captures or alter product source.


## Final outcome — complete

Fresh independent final reviewer `/root/revision_final_gate`: **APPROVE, blockers0**.
Durable report: `reviews/2026-09-08-revision-final.md`.
The reviewer directly opened all127 final PNGs and independently verified142 source
and127 capture hashes with0 missing/mismatched entries. Root read the final report
and reconciled its source/build/manifest identity with the actual worktree.

| Final check | Result |
| --- | --- |
| Type generation / strict TypeScript / ESLint / production build | PASS |
| Production browser regression, isolated |110 passed,1.1m,normal exit0 |
| Responsive full-page captures |96,ko/en × light/dark ×375/768/1280 ×8pages |
| State/manual/fix captures |31 additional captures, directly reviewed |
| Photo decode/cover density |54 DPR1/2 measurements pass |
| Accessibility / narrow reflow |32 axe0 violations;16 reflow0 overflow |
| Actual Chrome / font / motion / no-JS |PASS,0 page errors |
| Lighthouse local warmed-cache |32 runs;P/A/BP100;SEO66–69 intentional noindex |
| Source/capture integrity |142/127 hashes match frozen manifest |
| Final independent visual gate |APPROVE,0 blockers |

The execution plan's four steps are complete. This completes the current public
UI/UX revision, not the deferred backend/admin/database/payment/deployment work.
The user's actual visual adoption and remaining logo/photo/operational decisions
remain open. Latest continuation: `../handoff/2026-09-08-design-revision-next.md`.
Preview remains available at `http://127.0.0.1:3100/ko` and `/en`.

Known verification limits remain explicit: LSP timeouts use strict compiler/lint
fallback; React Doctor's observer-cleanup result is a confirmed false positive;
React Scan production profiling hooks are unavailable; Lighthouse is a local lab
revisit measurement. Initial concurrent browser teardown was interrupted130;
the final isolated110-test run closed normally. No assertion was weakened.
No commit/staging, GitHub Actions, backend, database migration or production
operation was performed. Existing files and disabled deployment workflow are preserved.
