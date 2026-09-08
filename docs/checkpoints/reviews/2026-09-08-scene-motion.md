# Section entrance sequencing — 2026-09-08

Implementation handed to the root worker for its final build and browser checks.

## Changes

- `web/src/components/site/page-motion.tsx`: retain the existing native
  IntersectionObserver and Web Animations API. Sections containing
  `[data-reveal-part]` animate those groups in DOM order instead of the section.
  Sections without markers retain their original single entrance. Each section
  is unobserved after entrance.
- Read the root worker's `--duration-stagger` token with the same ms/s conversion
  as the existing duration. The configured 80ms interval produces 0/80/160ms
  delays, capped at 160ms for later groups. Duration remains 600ms and existing
  easing/travel tokens remain authoritative. Backwards fill covers the brief
  delay; no persistent inline styles or hidden-by-default CSS are introduced.
- Initially reduced motion creates no observer/effects. Preference changes and
  effect cleanup deactivate callback handling, disconnect the observer, cancel
  every recorded animation and clear the animation array. The listener is removed
  on effect cleanup. An already queued observer callback cannot restart effects.
- `web/tests/motion.spec.ts`: five browser cases cover configured duration and
  ordered delays, initial reduced motion, the delay cap with a fourth group,
  unmarked fallback, and interrupted-animation cleanup. The interruption case
  pauses real effects before changing preference, so natural completion cannot
  masquerade as cancellation; it also visits an untouched section afterward.
- `web/src/styles/motion.css` required no change. Existing hero, tab, navigation
  and footer motion remain owned by their existing code. Root supplied sibling
  markers, with no marked ancestor/descendant pairs.

## Checks performed

From `web/`, using `/opt/homebrew/opt/node@22/bin/node`:

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false
PASS (exit 0)

node node_modules/eslint/bin/eslint.js src/components/site/page-motion.tsx tests/motion.spec.ts --max-warnings 0
PASS (exit 0)
```

Code measurement: 54 nonblank/noncomment lines for PageMotion, 80 for its tests.
Both files retain one responsibility. No new dependency, abstraction, untrusted
input boundary, type assertion, non-null assertion or error suppression was added.

The bundled programming no-excuse checker exited 2 because it imports
`typescript/unstable/async` and `typescript/unstable/ast`, TypeScript 7 API paths
unavailable in this project's TypeScript 6.0.2. Its generic installation error
does not indicate a missing project TypeScript installation. No packages were
changed to accommodate the external checker.

## Remaining verification

Browser tests, rendered motion inspection, build and broader regression checks
belong to the root worker by explicit task ownership. No browser, build,
deployment, Git or backend action was run by this worker. Test changes preceded
implementation; a browser red run was not performed, as the root worker requested
direct implementation while it inspected the composition build. This report
claims implementation and static checks only, not final browser acceptance.
