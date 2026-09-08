# Public navigation scroll investigation

- Scope: public navigation behavior only; visual composition belongs to the lead.
- Baseline: `redesign/center-web`, HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`, preview build `VW6RTRHWutxOd2NMwW_H2`, existing Next server on `127.0.0.1:3100` (PID 19933). No server/build/dependency operations delegated here.
- Runtime: installed Next 16.3.4, React 19.2.8, next-intl 4.14.2, Playwright 1.59.1 with actual Chrome.
- Read: `web/AGENTS.md`, `web/DESIGN.md`, installed Next Link/scroll implementation; `omo:debugging` runtime Node, Playwright, setup and investigate references.

## Plan and status

1. Complete: reproduce navigation scroll and distinguish the cause.
2. Complete: failing browser regression and smallest shared repair.
3. Complete: targeted static checks and evidence handoff. Integrated-build validation belongs to the lead.

## Competing hypotheses

1. Next route scroll targeting treats the page's first sibling/fragment unexpectedly. Confirm with actual scroll API calls and destination element bounds; compare full-document versus client navigation. If confirmed, repair the page/route boundary.
2. The global smooth-scroll rule creates delayed positioning during route transitions. Confirm by running the same clicks with reduced motion or CSS `scroll-behavior: auto`, while recording settling scrollY. If confirmed, repair the CSS/router contract.
3. Focus or image/font layout shifting causes the movement. Confirm with focus/scroll API calls, activeElement, image/font ready state and layout-shift entries. If confirmed, repair the causal focus/geometry boundary.

## Debug artifact journal

- Browser instrumentation is context-local and disappears when each diagnostic Chrome context closes. No application instrumentation, debugger listener, environment secret or runtime source changes.
- Regression artifacts will use existing ignored Playwright results paths. Durable evidence stays in this report.
- No files from other workers, legacy app, Git index, workflows, deployment or runtime data are modified.
- The lead extended ownership to the `data-scroll-behavior` attribute on `web/src/app/[locale]/layout.tsx` only. Header markup, routing utilities and visual CSS were not changed by this task.
- The failing regression's log and trace are intentionally retained in ignored `docs/checkpoints/evidence/navigation-scroll-red.log` and `navigation-scroll-red-results/` for the requested continuation record.

## Confirmed mechanism

In the baseline, the public stylesheet sets `html { scroll-behavior: smooth }` for normal motion, but the root HTML element does not tell Next about it. The current Next router calls React's Fragment `scrollIntoView` during a page transition. In this page structure, the transformed offscreen skip link triggers the fragment's out-of-viewport check; its native scroll calls visit footer, main, header and skip link. With smooth scrolling enabled, those intermediate operations are asynchronous and the destination remains shifted by the main element's offset. With normal immediate scroll handling they finish at the document top before paint.

Runtime evidence in actual headed Chrome at 1440×1000:

| Scenario | Settled scrollY | Header top |
| --- | --- | --- |
| `/ko` initial document | 0 | 0 |
| Normal motion: about, programs, experience, journal, goods navigation | 48 | -48 |
| Normal motion: visit navigation | 96 | -96 |
| Reduced motion: every same navigation | 0 | 0 |
| Normal motion, `data-scroll-behavior="smooth"` added to HTML in browser | 0 | 0 |
| Reload removing that attribute, normal motion | 48 | -48 |

The last two rows isolate the exact cause without changing image/font geometry or page content. The captured call stack points to installed `layout-router.js` → `disableSmoothScrollDuringRouteTransition`; no application scroll handler or focus call produced the movement. The installed utility checks `htmlElement.dataset.scrollBehavior === 'smooth'` before temporarily disabling CSS smooth scroll during route navigation. This is also the documented [Next.js smooth-scroll contract](https://nextjs.org/docs/messages/missing-data-scroll-behavior).

## Repair and failing regression

Production change: one HTML attribute, `data-scroll-behavior="smooth"`, in the existing locale root layout. No timers, route effects, scroll resets, new clients, dependency upgrades, or changes to anchor/history behavior.

`web/tests/navigation-scroll.spec.ts` samples twelve actual animation frames after public navigation. Korean/English and normal/reduced motion traverse the six sections, current page, wordmark and locale switch. Separate existing-behavior checks cover a browser history reading position (limited by the document's available maximum scroll) and keyboard skip link focus/hash.

Failing-first command against baseline build:

```sh
npm run test -- --workers=1 --headed --grep 'ko navigation keeps the page top with motion no-preference' --output ../docs/checkpoints/evidence/navigation-scroll-red-results tests/navigation-scroll.spec.ts
```

Observed failure: `Unexpected scroll after about navigation`, received scrollY samples `[5, 12, 23, 30, 35, 38, 41, 43, 44, 45, 46, 47]` where all twelve should remain `0`; `1 failed`. The full trace/log are retained locally at the paths above.

## Verification and integration handoff

- Targeted ESLint for the layout and regression test: exit 0, no diagnostics.
- Full installed compiler check `tsc --noEmit --incremental false`: exit 0.
- LSP originally reported `No diagnostics found` for both changed source files. After extending the test to locale/history boundaries, its LSP refresh timed out at 3000ms; the final compiler and ESLint checks passed. Do not relabel the timeout as a clean final LSP result.
- Browser toggle QA (actual headed Chrome, normal motion): all six section navigation clicks and current-item click gave `scrollY:0` with the attribute; keyboard skip link kept `/ko/about#main` and focused `#main`; forward navigation and the native mobile menu ended at `scrollY:0`; browser errors `[]`.
- In the old production server, a locale change creates a fresh root document without the temporary DOM attribute and reproduces `scrollY:96`. The committed-source candidate now renders the attribute on both roots; the integrated build must verify that route. Browser-only mutation is not a production-build PASS.
- One old-build history probe restored `1204` after a pre-click reading position of `1211`; the regression allows the browser's actual document maximum and otherwise requires the saved position. Verify this scenario on the integrated build as well.
- No new server, listener, dependency, application instrumentation, or debug-source temporary file remains. Each diagnostic Chrome browser/context was closed. Ignored RED logs/traces are deliberately retained by the owner's evidence-preservation request.

Files owned by this task:

| File | Change | SHA-256 |
| --- | --- | --- |
| `web/src/app/[locale]/layout.tsx` | One HTML attribute, 37 total lines | `c3b5a76bda8f60fc968bf8b2a0ada348f660f98be89f51ae93daa927cb4ac889` |
| `web/tests/navigation-scroll.spec.ts` | Six focused browser cases, 75 total lines | `0924660c5d42af1a6a38a78ee88f904bbe488f8a95a1d16cfd4459b37781bb3c` |
| This report | Root cause, test failure, validation limits | N/A |

The real source repair is complete. The lead owns the production rebuild and must run the following before claiming the integrated fix is green:

```sh
npm run test -- --workers=1 tests/navigation-scroll.spec.ts
```

Also observe the header from top through a navigation click in normal motion on the final styled desktop page. If a sticky header is introduced, its intentional anchor offset is a separate CSS concern; this repair does not add a global `window.scrollTo` effect that could override history or hash destinations.


## Integrated final GREEN — 2026-09-08

Final build `SKMZrpDkw36xxCbLYGY6Z`, base HEAD unchanged. The complete110-test
production browser suite includes all6 navigation cases and passed in1.1m with
normal exit0 on an isolated run. Evidence: `evidence/revision-2026-09-08/final/serial-verification.log`.
Normal/reduced motion, ko/en, current item, wordmark, locale switch, history and
skip-link focus are green. Root also clicked visit and locale switches in headed
Chrome with scrollY0 in four layouts. No global scroll reset was added.
