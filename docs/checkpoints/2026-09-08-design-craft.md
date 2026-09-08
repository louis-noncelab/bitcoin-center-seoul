# Public design craft revision — 2026-09-08

Status: local public-design implementation, runtime verification, independent English/Korean rendered gates and durable handoff complete. Owner visual adoption remains separate. This supersedes the previous candidate's completion claim for visual approval. Owner explicitly reopened the design: exceptional modern UI/UX, ordered composition, crafted motion and menu activation effects; moderate corners; continuous SaturdayBlock reference.

## Work plan
- completed: recover current source, existing verification and two independent art-direction reviews (Codex + real Claude CLI Read-only).
- completed: rebuild public composition and interactions using existing components and tokens; preserve complete routes/content.
- completed: production build, full locale/theme/viewport browser matrix, direct nav/tab/motion inspection, independent rendered review and fixes.
- completed: capture exact-source evidence and durable next-session handoff.

## Responsibility
- Root: Home, shared content sections, page entrances, selection transitions, tokens and shared CSS; integration and actual browser verification.
- navigation_craft: SiteHeader, NavigationDisclosure, optional nav client island, navigation.css, focused navigation tests and review report.
- footer_craft: SiteFooter, footer.css, footer review report.
- editorial_art_direction: read-only report in reviews/2026-09-08-editorial-direction.md (complete).
- Claude CLI: read-only direction review complete, is_error=false; raw artifact .local/design-craft/claude-review.json; sanitized report reviews/2026-09-08-claude-direction.md.

## Added quality benchmark
Owner added https://bitcoinindonesia.xyz/bitcoin-house-bali/ on this turn: the result should exceed its quality. A bounded real-browser reference review is active (bali_reference); source was also opened via web tool. Compare identity, activity proof, visit journey, mobile and motion; do not copy content/assets/services. SaturdayBlock remains a continuous reference.

## Direction
Contemporary cultural venue: aligned name-and-room first screen, purposeful photographic grouping, differentiated sections and strong practical closing. Preserve Pretendard, actual venue photos, orange/blue identity, both locales/themes, local SVG licenses and every detailed route. Use 8px controls and 12px media corners, real 44–48px targets and readable labels. No pill-everywhere, fake section numbering or decorative scroll spine.

- Hero: aligned 5/7 name/photo composition; two-line center name, introduction/actions; station/hours rail.
- Programs: substantial text tabs with moving underline and coordinated photograph/description transition.
- Exhibition: two equal documentary plates with factual captions.
- Journal: compact ruled index with readable title hierarchy.
- Goods: image and caption composition distinct from another about split.
- Footer: consolidate home visiting facts, prominent center name, clear map/contact buttons.
- Navigation: immediate press/pending feedback, current-page indicator, mobile menu enter/exit, destination entrance without scroll jump or delay.
- Motion: native CSS/WAAPI plus already installed Motion; transform/opacity, cancel-safe, reduced motion immediate; no scroll hijacking; the later owner-requested footer marquee is the sole controlled continuous effect.

## Boundaries
No GitHub Actions, backend/DB/auth, production deployment, remote tunnel, commits or destructive cleanup. Existing dirty/untracked work preserved. Historical deploy.yml.disabled preserved; expected SHA256 f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d. Local preview only 127.0.0.1:3100.

## Verification
Latest build `AFKk_t8vqWjTq4n4S-G_D`: `npm run check`, production build and production Playwright scope **123/123 passed** (one unchanged development-only test is intentionally run only against dev). Fresh96 route/locale/theme/viewport captures,80 wide/state captures,29 manual captures and54 DPR1/2 image measurements are in `evidence/design-craft-2026-09-08/final/`. Wide20 layouts, manual5 routes/18motion records,32 axe cases with0violations/0incomplete,16 narrow reflows with0overflow,7HTTP/security checks and0external requests passed. Older build/report artifacts are historical, not proof of this build.

## Integration observations
First rendered sweep exposed a goods image width constrained by aspect-ratio/max-height; corrected to fill its grid. Program actions grouped next to their explanation instead of distant panel bottom. Base body type now17–18px. Existing journal summaries now accompany named links to their matching detail anchors; station fact is a directions button. Initial focused browser suite20/21passed; one768pxDPR1 hero decoding/crop failure revealed the frame had no explicit width. Fixed frame width100% and responsive source sizes; full current-source verification follows. Re-enabled reduced-motion-safe explicit hash smoothing after stylesheet separation; route offsets remain governed by Next documentedHTMLattribute.

## Owner idea: horizontal photo album (review only)
Owner suggested photographs sliding sideways like an album and explicitly asked only to consider whether useful. No gallery/carousel implementation authorized by that message. Assessment: a manually operated space gallery on the center introduction route could help compare lounge/classroom/gallery; current fixed photographs already support the main visiting flow. A future comparison should verify content discovery, touch/keyboard controls, reduced motion and no hidden essential visitor facts. Keep as an option, not required scope or completed feature.

## Added wide-screen and marquee direction
Owner requested wide-screen verification and particular care for cards, CTA and marquee balance. Final polish keeps the80rem reading measure, verifies1440/1920/2560/3440px, retains desktop navigation from960px after actual bilingual geometry checks, and adds one controlled text marquee to the footer. It replaces the duplicate static footer brand column and preserves real contact/visit details.48s CSS movement only after hydration, pause/play and hover pause, immediate static reduced-motion/no-JS fallback. This is distinct from the photograph album idea, which remains review-only.

## Independent baseline reviews
Code review CLEAR; Claude scoped visualPASS with goods alignment and nav visibility refinements. English visual review found two required wrap fixes (Education category and lone and in mobile title), both now corrected. Refreshed build/captures and 121 tests passed for final polish; wide/manual/final review pending; previous120pass run is archived in before-polish.

## Wide audit findings and additional owner reference
- First wide sweep:20 layouts,80 captures,6 static fallbacks,0 runtime errors.1440/1920/2560/3440 centered geometry,48px CTA/8px corners, equal marquee loop groups and complete static wordmark passed. Root directly viewed ultrawide hero/cards and1920footer.
- Observed hydration pushed footer content44.92px at1280 (marquee growth CLS0.00823),17.28px at375. Reserve marquee-window height using existing font/line tokens. Evidence archived under before-polish/marquee-hydration; final verification must show delta0.
- English reviewer found tablet768footer Explore subdivided too narrowly; use a single navigation column at768–1023 and two columns from1024. This shared-footer fix needs refreshed renders.
- Owner added https://www.coconut.onl as their product reference. Bounded card/CTA/navigation/motion reference review assigned to bali_reference; source also opened with web tool. Maintain current design scope.

## Final runtime evidence
- Source fingerprint: `659df61b8e3dd62c257b512c06e5dc722de36d6971282528682ab87f41721326`. Manifest independently rehashed2563source/config/test/font/SVG files,7imported photographs,205PNG captures; all match.
- Widescreen:1440/1920/2560/3440×ko/en×light/dark.1280px centered container; both exhibition photo frames576×432, CTA>=48px/radius8px; no overlap/overflow. Desktop nav also validated960/1024×bothlocales.
- Marquee:48s equal repeat groups cover the full window;0ms and48000ms screenshots are byte-identical. Pause/play,hover pause,live reduced motion and noJS static text passed.320/375/1280 static name fits. Hydration heightdelta0 at375/1280, measured shifts empty in both cases.
- Manual: actual menu/locale/theme links, route scrollY0, anchor target visible, both tab directions/rapid keyboard input/live reduce, noJS content. Fresh29screens and JSON retained.
- Lighthouse13.0.3,ko/en×mobile/desktop, local warm-cache lab: performance/accessibility/best-practices100 in4cases, CLS0 andTBT0. LCP189–763ms is a warm local sample, not field/cold-network performance. SEO69 reflects deliberate preview noindex. Reports retain framework/image-discovery and BFCache hints; no score is represented as production readiness.
- Dependency audit has0 vulnerabilities; package-lock SHAa757cc5faa112d488cc54b9ff085d3dea8851358148431e64eb2454388ea2fb7 unchanged from audited source. No authentication/session/payment boundary changed.
- Public suite first ran inadvertently with the dev-only200test against production404; it stalled during failed-fixture teardown. Root stopped its own test process and preserved the failed run. Correct production scope, workers1, passed123 with exit0. No test expectations weakened.
- Test default evidence directory was copied with original mtimes into this final folder; all final captures are after the final source timestamps. Older root evidence is not a stable historical snapshot; use revision/craft-named folders and manifest hashes.
- Workflow hash, absence of active local.yml/.yaml,10ignore eligibility checks and git diff --check passed. No commits,staging,tunnel,Actions,backend/DB or deployment.

## Final closure
Codefollow-up CLEAR/APPROVE, Korean30/30 APPROVE, English30/30 APPROVE. Root read the final reports and verified their exact build/source binding. The prior English body/footer failures are resolved; no current blocker remains within the implemented public scope. Final ledger: `evidence/design-craft-2026-09-08/final/verification-summary.json`; root gate: `reviews/2026-09-08-craft-final-gate.md`.

Next-session entry: [2026-09-08-design-craft-next.md](../handoff/2026-09-08-design-craft-next.md). It preserves the original10TODO mapping plus font/SVG/directory/cleanup requests and the deliberately unstarted backend/DB/admin/operational work. All four current work-plan steps are complete. No deployment/commit/remote exposure was performed.
