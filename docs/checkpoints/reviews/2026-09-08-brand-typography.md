# Brand typography and color — 2026-09-08

Read-only recommendation. Visual judgments here are design opinions, not measured usability failures. Inspected the current `DESIGN.md`, source, final 375/768px home captures, 1440px hero captures and 1920px footer capture under `docs/checkpoints/evidence/design-craft-2026-09-08/final/`. No browser or build was run for this review.

## Recommendation

Use monochrome names and emphasize **Seoul through weight**, consistently in the hero, header and footer. Keep Pretendard, the current composition, orange visit actions, 8px controls and 12px photographs. The real lounge already supplies a strong blue area; the title does not need another one.

The main problem is grouping. `home.tsx:19–20` currently forces “비트코인 / 센터 서울” and “Bitcoin / Center Seoul”. This gives the blue treatment to the wrong semantic unit. Use exactly two unbroken groups: **“비트코인 센터” + “서울”** and **“Bitcoin Center” + “Seoul”**. The slash is explanatory, not visible copy.

Make these inline-block spans with an ordinary space between them. Set the first group's `max-inline-size: 100%` and `overflow-wrap: normal`; keep Seoul unbroken. With the sizes below, each first group fits intact, and the parent can wrap only before Seoul. Normal internal whitespace provides an emergency word boundary if text zoom makes the first group wider than its container. Remove the forced block display from `.hero-title-line` and `.wordmark-city`. Do not force a `<br>`, compress the font, or split “Bitcoin Center” to preserve 84px. Animate the heading as one name rather than treating spans as guaranteed rendered lines.

## Size and hierarchy

Hero: first group weight 500; Seoul weight 650; same size and baseline, line-height 1.08, tracking −0.035em. Weight and an isolated line already emphasize Seoul; a second color or oversized city is unnecessary.

| Viewport | Hero size | Current available copy width | Expected normal-size result |
| --- | --- | --- | --- |
| 320px | 40px | 280px | “비트코인 센터” / “서울”; English likewise two lines |
| 375px | 44px | 335px | Two intact groups on two lines |
| 768px | 48px | About 341px | Two lines in the existing equal-column tablet hero |
| 1280px and wider | 72px maximum | About 477px | Two lines in the existing 5/7 hero |

A buildable starting scale is `clamp(2.5rem, 11.75vw, 3.25rem)` below 768px, then `clamp(3rem, calc(4.6875vw + 0.75rem), 4.5rem)`. This also fits the narrower left column immediately after the layout changes at 1024px. Keep the main composition unchanged.

The bundled font's unshaped advance for “Bitcoin Center”, including −0.035em tracking, is approximately 5.85em: about 421px at 72px. This is a sizing estimate, not a browser result; final weight, shaping and zoom still need the root's comparison. At 200% text zoom, permit an emergency internal wrap if required rather than clipping content.

Header: retain 15px mobile/18px desktop, first group 500 and Seoul 650. Let the wordmark shrink to its available space while protecting the first group. At 320px the present three controls leave roughly 108px, so Seoul should wrap; at 375px roughly 163px remains, enough for the whole English name on one line. Keep controls full size. At 768/1280px the complete name can remain inline. Footer applies the same monochrome weight distinction without changing the marquee's approved behavior or sizes.

## Blue: two scoped options

- **Brand-only monochrome:** remove blue from `.hero-city`, `.wordmark-city` and `.brand-marquee-city`. This directly addresses the owner's complaint and preserves current interaction colors.
- **Recommended refinement:** also make resting informational icons and section-link arrows inherit their text color. Keep blue on actual links, current/selected navigation, selected tabs and interaction states. Preserve the existing underline, selected surface and focus outline, so color is never the sole state signal. Change role selectors; do not replace the global blue tokens with gray.

The second option reduces scattered accent marks without starting a new palette or design cycle.

## Three evidenced remnants worth fixing

1. **Arbitrary colored word groups.** Visible in both 1440px hero captures; `.hero-city` currently includes “Center”. Repair semantic grouping and use weight.
2. **Decorative wordmark period.** Visible after Seoul in the header; `site-header.tsx:58` and `.brand-stop` add an orange dot unrelated to the name. Remove the dot, retaining orange on useful actions.
3. **Blue applied to every resting arrow and factual icon.** Visible in the 1440px information rail and section links; `site.css:43` and `primitives.css:210` enforce it. Neutralize these defaults, keeping interaction feedback.

The present photographs, differentiated sections and modest corners are already specific to this venue. These captures do not justify another layout overhaul or a generic critique of every component.
