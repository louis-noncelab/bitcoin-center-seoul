# Typeface and SVG icon review

## Review surface

Open `http://127.0.0.1:3100/ko/design-system#typography` or
`http://127.0.0.1:3100/en/design-system#typography`. The type study renders
the same Korean and English heading, body and caption at their intended sizes.
The type study renders the alternatives alongside the production default.

| Candidate | Display | Text | Character | Loading observation |
| --- | --- | --- | --- | --- |
| A | Manrope | Noto Sans KR | Broad, calm Latin headings with familiar Korean text | Comparison route only, self-hosted by `next/font/google` at build time |
| B | Manrope | Pretendard | Keeps display contrast while making Korean text denser | Comparison route only; Pretendard uses the local dynamic subsets |
| C | Pretendard | Pretendard | Even bilingual reading rhythm in one family | Current public default; local dynamic subsets |

## Provisional recommendation

Use **C, Pretendard for both display and body**, as the current public default.
It gives Korean and English the same voice and removes the mixed-family fallback
behaviour from normal routes. A and B remain comparison-only alternatives on
the design-system route.

The final visual decision remains open. Confirm at 100%, 125% and 200% browser
zoom, in Korean and English, in both themes before treating the current default
as final visual approval.

## Font source and license

- The public default loads the official
  [Pretendard v1.3.9 dynamic subset CSS](https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard/dist/web/variable)
  from `web/public/fonts/pretendard-v1.3.9/`. Its CSS is 55,760 bytes and
  references 92 local WOFF2 files totaling 2,957,724 bytes. Each source has an
  official `unicode-range`, so a browser requests only subsets that cover the
  rendered Korean, Latin and symbol code points. No font CSS or font file is
  requested from an external origin at runtime.
- Import this CSS as a relative source import from `src/styles/fonts.css`.
  PostCSS/Turbopack includes all 92 font faces and emits the referenced assets
  into the local build. The earlier `@import url("/fonts/...")` disappeared
  from compiled CSS and silently rendered system fallbacks; it is not the
  working loading method. The lead confirmed actual custom Pretendard glyphs
  through Chrome's platform-font inspector in both locales after this repair.
- A fresh browser context on each home page requested 14 font subsets / 367,156
  encoded bytes for Korean, 3 / 89,936 bytes for English. These measurements
  exclude other CSS/JavaScript/media and vary with the rendered characters.
- The locally retained CSS SHA-256 is
  `2973bcae80262dcb630cfb793fbf6af29bd986c769ee54953fb3e5b3e32323ca`.
  The previous 2,057,688-byte complete variable file was moved intact to
  `.local/font-source/PretendardVariable-v1.3.9-full.woff2`; it is not served
  by the public site.
- Pretendard is licensed under [SIL Open Font License 1.1](https://github.com/orioncactus/pretendard/blob/v1.3.9/LICENSE);
  its license text is retained at `web/public/fonts/Pretendard-OFL-1.1.txt`.
  The local subset CSS retains the upstream `font-display: swap` declaration.

Manrope and Noto Sans KR now load only in the comparison component through
`next/font/google`; per the bundled Next Font Module documentation, those files
are downloaded at build time and self-hosted with the application rather than
requested from Google by browsers.

The public route avoids the complete 2MB file without generating an ad-hoc
content corpus. Dynamic subsets retain the upstream Unicode coverage, though
their first-visit transfer cost still depends on the actual characters a page
uses.

## SVG icon direction

Use the installed `lucide-react` package for the public preview. It already
supplies tree-shakeable React SVG components and matches the control code in
the specimen. The study renders an external link, programme date, visit and
menu at the shared 24px viewbox, `1.6` stroke and `currentColor` treatment.

Decorative SVGs carry `aria-hidden="true"` beside visible text. Interactive
icon-only controls must instead have an accessible name on the button, such as
the existing theme and menu controls. Keep `--icon-size`, `--icon-stroke` and
semantic foreground tokens as the only sizing, stroke and color controls.

The inspected Tailwind SVG directory uses 24px outline SVGs with
`currentColor`; the Bootstrap directory mixes 16px filled and outline glyphs.
The owner subsequently requested retaining both collections inside this project.
Their local source library lives under `web/assets/icons/`, with provenance,
licenses and usage guidance. See `svg-assets-2026-09-08.md`. The public controls
continue to use Lucide; selecting an additional SVG does not imply mixing
filled and outline families within the same control group. The final supplied
brand mark remains a separate asset.

Directly inspected reference directories and representative files:

| Directory | Confirmed files | Observed convention |
| --- | --- | --- |
| `/Users/max/saturdayblock-web/public/tailwind-svg/` | `arrow-up-right.svg`, `wallet.svg` | `arrow-up-right.svg` uses a 24px viewbox, outline path and `stroke="currentColor"`. |
| `/Users/max/saturdayblock-web/public/bootstrap-icons-svg/` | `arrow-up-right.svg`, `currency-bitcoin.svg` | `arrow-up-right.svg` uses a 16px viewbox and `fill="currentColor"`. |

## Limitations

These are historical typography research notes, not current build verification.
Use [the design contract](../../web/DESIGN.md) for the current visual requirements.

The candidate notes and comparison introduction are localized by the active
route. The paired Korean and English samples remain visible in both routes so
the bilingual relationship can be judged directly. The comparison grid uses a
minimum 18rem column, so a 768px viewport shows two readable candidates rather
than three cramped columns. A separate CJK visual review remains in progress;
Pretendard is the current default, while final visual approval remains open.
