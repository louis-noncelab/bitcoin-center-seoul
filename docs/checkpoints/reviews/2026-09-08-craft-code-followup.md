# Craft code follow-up review — 2026-09-08

**Technical review result:** `CLEAR`  
**Recommendation:** `APPROVE`  
**Scope:** focused, read-only source review of the marquee and named responsive
follow-up. This is not visual approval.

## Binding

- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`
- Build evidence ID: `SCErnVblQFcknPRkL-fPQ`
- The final source manifest was intentionally still being refreshed by root.

| Scoped file | SHA-256 |
| --- | --- |
| `web/src/components/controls/brand-marquee.tsx` | `5b677a8a83a58be266b4e260aa8a6f01f194dc1c19a2613260c06cf2fec39418` |
| `web/src/components/site/site-footer.tsx` | `a864c5fa8238bfa0477c1813f0c6d898bb7e075ebea049b175d59e459e9e0da5` |
| `web/src/components/site/home.tsx` | `ff33829d924a3b55793d76905729fd7c03d5eee52501707d67b75ec0881d3754` |
| `web/src/styles/footer.css` | `81174b39aba61d6d3d7edbb266e8e549f745e78c9496997e264e569c872d6710` |
| `web/src/styles/navigation.css` | `19255542d11c3bcd245f51af93710576908d2e773c4f5d7fc4637ec74725a69f` |
| `web/src/styles/site-sections.css` | `898c9c00d2671ec9618e1382898258d1fe339c06f9355628c46ed850ce976531` |
| `web/src/styles/site.css` | `9e025299fdc0a4cdf393461806ffa108ade353ab40d5eb5b117be5db5e3bd3d8` |
| `web/src/styles/tokens.css` | `9fb3f99b63f224a4c911bf7d695f3478a1b798c7a65198a9e84a09f3046c8c87` |
| `web/tests/content-motion.spec.ts` | `059c428c8bb4a09d9f9d1e18d2721679120267b470bab2bc87d7bea7bcc56dd4` |

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Focused audit

- The top, current `DESIGN.md` contract explicitly authorizes one controlled
  48-second text marquee. The CSS implements that scope only: one text track,
  no photo carousel, pause-on-hover, and a labelled pause/play control.
- The component is server-rendered. Without JavaScript the single visible
  wordmark remains static while the duplicate visual track is hidden from the
  accessibility tree and one equivalent screen-reader label remains. The
  enhancement attribute is added only after hydration and removed on cleanup.
- With reduced motion, the enhancement rules do not apply: the track is static,
  its control is hidden, and no animation remains. The focused test covers both
  an OS-preference change during use and the no-JS fallback.
- The pause/play action has a changing, locale-specific accessible name and a
  48px token-sized target. Its visual copies are correctly `aria-hidden`, so
  assistive technology does not announce the repeated scrolling text.
- The goods caption grouping remains semantic and responsive: desktop has a
  title plus flexible information band; mobile dissolves only the layout wrapper
  so the paragraph and link occupy their intended grid cells. The 88px journal
  category column collapses to the title column on mobile. The mobile section
  heading may wrap rather than force a link off-screen, and the 960px navigation
  breakpoint matches the current contract.

The marquee's enhanced type size is deliberately larger than its SSR/static
fallback and therefore changes footer geometry when hydration enables it.
This is a concrete runtime-sensitive behavior, not a source defect under the
approved contract; root's active hydration-layout measurement is the required
gate for it. I did not run browser, build, or test commands in this read-only
review.

## Tests and skill perspectives

`web/tests/content-motion.spec.ts` was inspected. Its marquee coverage asserts
the observable pause/play state, immediate reduced-motion settling, hidden
control, and no-JS static behavior. These are behavior checks, not prose pins,
tautologies, deletion-only tests, or implementation-constant mirrors.

The required `omo:programming` and `omo:remove-ai-slops` perspectives were
consulted and applied. The new client island has a real interaction boundary;
it introduces no untyped escape hatch, speculative abstraction, parsing or
normalization layer, debug/dead code, or needless production complexity. The
test additions do not violate either perspective.

## Blockers

None.

## Final delta binding — 2026-09-08

- HEAD remains `fd7c472d856a257a77bf66766163b3f245a8757f`.
- Final build ID: `AFKk_t8vqWjTq4n4S-G_D`.
- Final changed-source hashes:

| File | SHA-256 |
| --- | --- |
| `web/src/styles/footer.css` | `e6287b64cf2379b814ea3053dc9502e269198cc3f2b23312adee612c95159128` |
| `web/tests/content-motion.spec.ts` | `235d3b07426b6c19e60a0684a0359e40d24dbb9130d06c877583cf1dbb63aa4d` |

All other scoped-file hashes in the initial binding remain unchanged. The
footer window now reserves `--text-marquee × --leading-display`, covering both
the static SSR text and its hydrated enhancement. The cross-context Playwright
assertion compares the actual JS and no-JS marquee heights before motion
assertions; it is a meaningful visual-stability regression test, not a
constant-mirroring test. The 768–1023px one-column footer navigation and
1024px two-column restoration are correctly limited to the responsive footer
list. No new source finding.
