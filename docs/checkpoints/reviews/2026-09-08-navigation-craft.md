# Navigation craft — 2026-09-08

Implementation complete; integration browser verification is owned by the root
agent after the combined frontend build. This report does not claim a visual
approval or a browser pass on unbuilt source.

## Reference and decisions

- Read the actual `/Users/max/saturdayblock-web/components/Navigation.tsx`.
  Its persistent active underline, immediate control response, short opacity /
  vertical menu entrance and 180ms exit inform this implementation. The center
  keeps its own typography, orange/blue identity, routes and relative header.
- Read the installed Next 16.3.4 `link.md`, `use-link-status.md` and
  `use-pathname.md`. The existing server `section` prop already identifies the
  page, so no pathname hook or extra client route store is needed.
- Read `https://beui.dev/r/shared-layout-bg/raw` for independent selected and
  hovered feedback and interruptibility. CSS handles these states here without
  importing a shared-layout animation system.

## Delivered behavior

- Desktop links retain the server-rendered current-page state. A persistent
  blue underline distinguishes that state; hover/focus draws the same line and
  a press uses the existing small scale response. The current page never changes
  before navigation commits.
- A 12-line client leaf reads Next's documented `useLinkStatus` beneath the
  existing next-intl Link. Its absolutely positioned underline exposes a pending
  state only while Next is actually waiting. Default prefetch and immediate
  navigation remain intact; no route interception, timer or scroll reset exists.
- Mobile route links now use that same next-intl Link and receive the server's
  current-page state. The design-system disclosure keeps accepting hash links.
- The menu panel remains mounted for a 260ms entrance / 180ms exit. `inert` and
  `aria-hidden` change immediately when it closes; delayed CSS visibility only
  keeps the fading surface painted. Pointer events stop immediately. Reopening
  reverses native transitions; there are no animation completion callbacks.
- Escape returns focus with `preventScroll`; outside pointer and focus departure
  close the menu. Actual same-tab navigation closes it via `onNavigate`, preserving
  modified-click semantics. Reduced motion removes transitions and transforms.
- Existing skip link, locale/theme labels, all route hrefs, header dimensions,
  published wallet URL and footer navigation for no-JavaScript use are preserved.

## Files and ownership

- `web/src/components/site/site-header.tsx`: current states and feedback leaves.
- `web/src/components/controls/navigation-disclosure.tsx`: mobile disclosure.
- `web/src/components/controls/navigation-feedback.tsx`: real Next pending state.
- `web/src/styles/navigation.css`: header and navigation styles, using shared
  tokens. Imported by both the header and disclosure so the design-system page
  retains its menu styling. The same stylesheet is deduplicated by the bundler.
- `web/tests/navigation-feedback.spec.ts`: seven focused browser checks.

Owned selectors are `.site-header`, `.site-wordmark`, `.wordmark-city`,
`.brand-stop`, `.desktop-navigation`, `.mobile-navigation`, header-specific
control-label visibility, `.navigation-link`, `.navigation-feedback`,
`.navigation-trigger`, `.navigation-menu-*` and `.disclosure-panel`.
Generic header-control / theme styles remain in root-owned `controls.css`.
`navigation-scroll.spec.ts` is unchanged.

## Evidence and remaining integration checks

- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run check`: **passed**, including
  Next route type generation, strict TypeScript and ESLint with zero warnings.
- Browser red run against the already-running previous production build:
  Korean/English mobile current-page assertions failed because no current link
  existed; the exit test failed because the old menu had no `aria-hidden` / inert
  phase; pending feedback failed because no indicator existed.
- The outside-pointer test initially clicked a heading covered by the open menu;
  the test was corrected to click the visible page gutter. On the prior build,
  outside dismissal, focus departure and reduced-motion baseline passed.
- New tests check mobile locale/current-page/client-routing continuity, inert
  exit and Escape focus, outside/focus dismissal, immediate reduced motion and
  genuine pending feedback using a controlled RSC response. The exit test extends
  its CSS duration then finishes native animations, avoiding wall-clock sleeps.
- Source size: header 103, disclosure 103, feedback 12, navigation CSS 147 and
  focused tests 90 nonblank/noncomment lines. Responsibilities remain small;
  no new dependency, backend, workflow, remote operation or build was added.
- Root integration must run both `navigation-feedback.spec.ts` and untouched
  `navigation-scroll.spec.ts`, then inspect menu opening/closing, hover/press and
  reduced motion at the agreed viewport / locale / theme combinations. Include
  the design-system hash menu because it is the disclosure's second caller.
