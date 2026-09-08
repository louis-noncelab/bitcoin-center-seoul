# Independent review round two

Both reviewers were fresh read-only agents. Build `9_yczyc3ZOgQmCpP362Bu`, HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`. Sources/captures and complete runtime results are now under `before-image-fix/`.

## A — design_integrity_final

**PASS**, high confidence, no findings. Directly inspected **96/96 page PNGs and8/8 states**; recomputed all50 source hashes and96 PNG hashes/signatures against the manifest. Confirmed real shared DOM/token system and local photos, appropriate server/client boundaries, keyboard/stateful navigation, corrected mobile type token, complete themes, reduced motion, 100 passing tests and expanded axe0.

This does not override the independent visual finding below or approve a later changed build.

## B — visual_cjk_final

**REVISE**, high confidence. Directly inspected **96/96 at original detail and8/8 states**; checked all50 source and96 capture hashes. Korean auxiliary groups and the English road name are intact. No additional clipping, overlap, contrast, missing-glyph or semantic CJK wrapping findings. Settled skip focus/menu evidence is valid.

Sole blocker **[product][MEDIUM] DS-PHOTO-01**: the design-system portrait bookshelf frame enlarges an undersized response. Source5652×3179, but `sizes` described the frame width instead of the cover-painted width.

| Viewport | Portrait frame | Decoded response | Enlargement, DPR1 |
| --- | --- | --- | --- |
|375|335×418.75|384×216|1.94×|
|768|224.86×281.06|384×216|1.30×|
|1280|381.88×477.34|640×360|1.33×|

Concrete repair: account for the approximately2.22× painted width of a landscape image filling4:5, then verify DPR1/2 and recapture.

## Lead follow-through

Traced the other cover callers. Public home/about/goods at375/DPR1 had enough pixels (640×360), but DPR2 decoded750×422 for335×251.25 CSS pixels, requiring1.191× enlargement. Same root cause; repaired these three mobile source hints along with the specimen.

`tests/image-quality.spec.ts` was first run against the old build: **2 expected failures**, one for the specimen atDPR1 and one for home atDPR2. Failure logs/decoded measurements/traces are preserved under `before-image-fix/`. The new source requests205vw/75vw for the portrait specimen and125vw for mobile wide-photo4:3 crops. Actual image files and focal points are unchanged.

Fresh whole-page screenshots and an independent current-build review remain required after this repair. These prior verdicts alone are not final approval.
