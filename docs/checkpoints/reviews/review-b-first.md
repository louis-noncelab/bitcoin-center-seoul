# Independent review B — first capture

- Reviewer: `/root/visual_cjk_review`, read-only visual/CJK reviewer.
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`; initial build `bUlfTJGG318bqSEkcA01c` and 96 signatures recorded in `before-review-fixes/source-manifest-first.json`.
- Verdict: **REVISE**, confidence high. Not approval of the subsequently repaired source.
- Direct inspection: **all 96 unique production PNGs**, original detail, all eight page types × both languages × both themes × 375/768/1280. All eight interaction/motion state images also opened. No page skipped.

## Blocking findings and concrete fixes

1. [product][MEDIUM] Korean auxiliary groups split at ordinary spaces. Both themes: home375 `나눌 / 수 있어요`; about375 `볼 / 수 있어요`, about768/1280 `볼 수 / 있어요`; home+visit768/1280 `이용할 / 수 없어요`; design-system375 `비교할 / 수 있습니다`; design-system768/1280 `표시하지 / 않습니다`. Join only the affected phrases using nonbreaking spaces, preserving words and font size.
2. [product][SERIOUS] Extended axe found 32 cases with label-content-name-mismatch, comprising 28 wordmark nodes and 18 locale-control nodes. Use visible text in the accessible name. Four specimen aria-prohibited-attr incompletes identify named generic divs; give these appropriate semantic containers.
3. [evidence][MEDIUM] Skip-focus and menu-open were captured before the inherited 160ms button transition settled. Recapture after focus/blur transitions; do not claim persistent product clipping from these images.

## Nonblocking finding fixed with the same batch

[product][LOW] English home/visit375/768 breaks `2an- / gil` inside the street name. Use a nonbreaking hyphen for this word, allowing the rest of the address to wrap.

## Confirmed strengths

- Warm gallery composition, real photographs, clear hierarchy and consistent light/dark styles.
- No visible tofu, clipped baselines, page overflow, missing photographs or major contrast defect across all96.
- Three real font candidates visibly differ as intended.
- Source/state evidence supports the 650ms hero scale and reduced-motion alternative.
- Logo, font choice and release facts/rights remain documented owner decisions.

The earlier captures, expanded failing audit, Lighthouse and React runtime results are preserved under `before-review-fixes/`. A new reviewer must judge the complete new capture set before completion.
