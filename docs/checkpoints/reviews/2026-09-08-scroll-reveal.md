# Per-part scroll entrances — 2026-09-08

Implementation and source checks are complete; the root worker owns browser
validation and the final build.

## Root cause and change

PageMotion observed each complete section and started every marked descendant
at its first intersection. A tall mobile section therefore finished animations
for photographs that had not reached the viewport.

`web/src/components/site/page-motion.tsx` now registers each explicit
`[data-reveal-part]` separately. Unmarked sections remain single targets. Each
target receives a fixed section-local DOM-order delay when registered:
0/80/160ms, with later targets capped at 160ms. An intersection starts only that
target's 600ms native WAAPI entrance, using existing distance/easing tokens.

The observer uses the default viewport edge and starts at the first intersection.
This avoids deliberately painting a visible slice before an opacity-zero entrance.
No full-element visibility threshold can prevent tall content from entering.
Each target leaves the pending map before animation and is unobserved immediately
afterward, preventing repeat entrances and duplicate queued notifications.

Reduced motion initially creates no observer or effects. Preference changes and
effect teardown clear pending targets, disconnect the observer, cancel all
recorded animations, and clear their array; teardown also removes the preference
listener. Clearing the pending map prevents already queued callbacks from
creating effects after cleanup. Default content visibility and native scrolling
remain unchanged. No new CSS, dependency, per-frame React state or layout animation.

## Test changes

`web/tests/motion.spec.ts` retains duration, ordered-delay, capped-delay, initial
reduced-motion, fallback and interruption checks. Timing and preference checks
use the unchanged three-part goods scene. The cap check uses the real journal
heading plus three record rows and requires delays of 0/80/160/160ms.

The root worker's production run found that the original constructor-time
fixtures could precede hydration and be overwritten by React. That fixture helper
was removed. The fallback case now temporarily intercepts native `observe` until
the first actual `#programs [data-reveal-part]` registration. This occurs inside
PageMotion's committed effect, before it registers the later experience section.
The fixture then removes experience markers and immediately restores the original
method. Every registration still invokes native `observe`; intersection delivery
is never mocked. The production source is unchanged by this test correction.

The additional mobile case exposes only the first goods group, verifies that the
lower photograph has no animation, scrolls to that photograph and checks its own
600ms/160ms entrance, then revisits it to verify it does not replay. Cleanup tests
pause real active effects so ordinary completion cannot pass as cancellation.

## Source checks

Run from `web/` using `/opt/homebrew/opt/node@22/bin/node`:

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false
PASS, exit 0

node node_modules/eslint/bin/eslint.js tests/motion.spec.ts --max-warnings 0
PASS, exit 0
```

These checks were rerun after the viewport-edge adjustment and the fixture
correction. Automatic LSP diagnostics timed out; the full TypeScript check passed.

PageMotion has 59 nonblank/noncomment lines; its test file has 123. The map owns
pending entrance timing and once-only status without an additional state flag.
No type escapes, new trust boundaries or unrelated changes were introduced.

The root worker reported that the normal/reduced timing, preference cleanup and
mobile per-part cases passed in production. The corrected cap/fallback cases
await its focused rerun. This worker ran no browser, build, server, dependency,
Git or deployment operation and makes no independent rendered-QA claim. The
previously documented bundled checker/TypeScript 7 API mismatch was not retried
or worked around by changing project dependencies.
