# Footer contact icons — 2026-09-08

Implemented the current `web/DESIGN.md` contact-icon contract using the existing
`ActionLink` quiet variant and Lucide Mail/Phone icons. The reference mechanism
was checked against `/Users/max/saturdayblock-web/components/Footer.tsx`:
compact horizontal icon links with neutral idle color and visible interaction
feedback. The center retains its real email and telephone destinations.

## Changes

- `site-footer.tsx`: removed visible email/phone text from the two contact links;
  each link has a localized action name plus destination in `aria-label`, and
  its destination in the native `title`. Decorative SVGs remain `aria-hidden`.
- The existing contact heading is visually hidden with `sr-only`; an explicit
  `role="group"` and `aria-labelledby` preserve the named contact grouping.
- `footer.css`: a horizontal flex row uses the 8px spacing token. Both links
  use the 48px control token for width/height and inherit 8px control corners.
  Idle backgrounds/borders remain transparent; hover/focus changes neutral ink
  and reveals a border. The shared focus outline, press feedback and reduced
  motion rules remain in effect in both themes.
- The desktop contact column uses `max-content` instead of `1.1fr`, yielding
  a compact 104px row under the current tokens. Visit/navigation retain their
  existing 1.2/0.8 proportions and responsive navigation columns.

No new abstraction, dependency, client boundary, destination or content source.
Marquee, address, hours, map action, navigation and footer-bottom content are
unchanged. Source responsibilities remain footer markup and footer styling;
no input boundary, union dispatch, assertion escape hatch or helper was added.

## Verification

- Scoped ESLint: `./node_modules/.bin/eslint src/components/site/site-footer.tsx
  --max-warnings 0` — passed, exit 0.
- TypeScript: `./node_modules/.bin/tsc --noEmit --incremental false` — passed,
  exit 0.
- Nonblank/noncomment size check: 73 lines for the component and 126 for CSS.
- Browser/test execution belongs to the root task and was not run by this
  worker. Remaining rendered checks: Korean/English, light/dark, desktop/mobile,
  48px targets, icon-only appearance, pointer hover and keyboard focus, and
  accessible grouping/action names. This note is implementation evidence, not
  a visual acceptance claim.
