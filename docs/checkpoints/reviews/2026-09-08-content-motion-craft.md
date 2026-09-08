# Content motion craft — 2026-09-08

Scope: `PageMotion`, `SelectionTabs`, the new `web/src/styles/motion.css`, and three focused browser checks. Header/navigation and public layout belong to the parallel root/navigation work. No packages, routes, data operations, or scrolling code were added.

## Motion contract

- `.hero-title-line` arrives at 0/70ms; `.hero-introduction` at 140ms; `.hero-caption` at 210ms. Each uses the existing 500ms image duration, 20px travel, and decelerating ease.
- `.hero-photo .center-photo` settles from scale 1.035 to 1 over 700ms. Its opacity remains 1, so photography stays available to first paint and LCP.
- `.detail-heading` arrives immediately; its following content `div` settles after 100ms. The latter uses transform alone to keep detail-page photographs opaque. These CSS entrances do not defer navigation or change document scroll.
- `.section-frame` retains its existing one-time native IntersectionObserver/WAAPI entrance: 24px travel, 600ms. Observer cleanup cancels active animation on preference changes and route disposal. Children move together.
- Program selection retains Motion's shared `layoutId` underline and 220ms control transition. The new panel image enters from the selection direction over 500ms; its description crossfades over 180ms after 70ms. The prior panel moves away and fades over 220ms.

`motion.css` is imported from both leaf client components so the design-system specimen receives tab behavior without needing `PageMotion`. Existing spacing, duration, and easing tokens remain the source of common values; the explicitly approved hero delays/scale are local choreography.

## State and accessibility

`.selection-panels[data-direction="forward"|"backward"]` provides direction. A panel with `data-motion="incoming"` plays the entrance; `data-motion="outgoing"` is an absolute visual layer until its own animation ends. Every outgoing/inactive panel is `inert`, `aria-hidden`, and removed from tab order; only the selected panel is exposed as an accessible tabpanel. Hidden panels remain in server HTML to preserve each tab's `aria-controls` target.

The native button focus, arrow, Home, and End behavior is retained. New selection replaces the previous outgoing state immediately; CSS cancels replaced animations and there is no timer queue. Only selection and completion cause React state updates.

Installed Motion 13.2.0's `useReducedMotion` reads a snapshot through `useState` without rerendering on preference changes (`framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs`). `useSyncExternalStore` now subscribes to the browser preference. Enabling reduced motion clears outgoing content and replaces the animated underline with an identical static span, disposing of an active layout animation. CSS also immediately removes entrances and transforms. Re-enabling motion does not resurrect the previous outgoing panel.

All content is rendered by the server. The first panel is readable before hydration and with JavaScript disabled; finite CSS hero/detail entrances do not depend on JavaScript completion.

## Evidence

- `tsc --noEmit --incremental false`: exit 0.
- Targeted ESLint on both components and `tests/content-motion.spec.ts`: exit 0.
- Source size: `SelectionTabs` 182, `PageMotion` 44, browser checks 50 nonblank/noncomment lines.
- Red check against the previously running production build: outgoing-panel scenario failed because selection immediately hid the old panel. The other two boundary checks passed on that baseline. This establishes the missing outgoing transition; it is not a claim that the new build passed.
- New checks cover outgoing content being visible yet inert, repeated keyboard selection followed by a live reduced-motion change, and JavaScript-disabled server rendering.

The root agent owns the fresh production build, integrated browser run, rendered motion inspection, and screenshots. No new-build browser pass is claimed in this report before that integration step.
