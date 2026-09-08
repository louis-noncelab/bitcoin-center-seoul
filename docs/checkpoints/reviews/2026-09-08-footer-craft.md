# Footer craft — 2026-09-08

Status: implementation handoff for integrated browser QA. Source checks are not
visual approval.

## Owned changes

- `web/src/components/site/site-footer.tsx`
- `web/src/styles/footer.css` (imported by `SiteFooter`)
- This review file

The root agent owns removal of the preceding home visit block, old `site.css`
footer rules, shared tokens, the build and integrated browser QA.

## Reference and result

Read the actual `/Users/max/saturdayblock-web/components/Footer.tsx`. Its desktop
four-column group alignment, compact mobile organization and separate bottom
row informed this composition. No reference content, asset, modal, settings
request or miniature typography was copied.

The footer has a 32–48px English wordmark using `--text-footer-name`, with Seoul
in the existing accessible blue. Address, station access, all operating-hours
lines and the Google Maps action precede navigation in DOM order. Email and
telephone use the shared 48px `ActionLink` button treatment with visible real
contact details and native `mailto:` / `tel:` destinations. Shared control
radius is 8px. No new dependency or client component was added.

The composition uses four columns from 1200px, a full-row brand plus three
information columns from 768–1199px, and a single column with two-column
navigation below 768px. Every color, type size, spacing and control radius uses
the existing shared tokens. The bottom row wraps if its real content needs room.

## Verification performed

- Targeted ESLint: `npm exec -- eslint src/components/site/site-footer.tsx --max-warnings 0` — passed.
- Existing PostCSS parser successfully parsed all 24 top-level footer CSS rules.
- Source review confirms all three `visit.hours.lines`, actual address/note,
  map URL, email/phone labels and destinations are read directly from
  `centerContent` for either locale.
- `#visit` now targets this footer; source search found no duplicate ID.
  `#top` resolves to the existing shared header. Every footer menu item still
  uses the localized section route.
- No added animation or hidden-until-JavaScript content. The shared reduced
  motion rule continues to govern control press feedback; footer icons do not
  slide sideways when their action is hovered.

## Open visual checks

Integrated QA must inspect both locales/themes at 320, 375, 768 and 1280px,
including actual font loading and keyboard focus. Particular risks are the
English exhibition-menu wrap, email width at the three-column breakpoint,
wordmark wrapping near 1200px and the bottom row at 320px. Confirm the latest
production CSS has no old footer rules, the home/footer handoff feels compact,
all button borders remain visible in both themes, and the map/back-to-top actions
work. Build, browser, contrast and final owner approval remain with the root
workflow; none are claimed from these source checks.
