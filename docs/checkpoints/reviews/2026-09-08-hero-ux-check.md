# Hero composition review — 2026-09-08

**Follow-up status, 23:15 KST production captures: PASS for the requested static hero composition and footer-icon appearance.** The original recommendations below are now implemented. See the final follow-up for the exact observed evidence and limits.

**Recommendation: put the name, introduction and actions back into one left-hand group, beside a 3:2 lounge photograph.** The current problem is the desktop composition: the text is split across the masthead and a second, very large photographic row lengthens the opening. This is a visual hierarchy issue, not evidence of responsive overflow.

Scope: focused, read-only review of the hero. Only this report was written. No browser, source edits, footer changes or interaction testing. The current `web/DESIGN.md` and `home.tsx`, `site.css`, `tokens.css` were read; CodeGraph was consulted first, but returned unrelated source for the requested files, so the missing sources were read directly. Guidance: Impeccable `critique`/`frontend-design` and the OMO frontend design/Lane C review references. Existing owner context was sufficient; no new discovery or approval round is needed for this review.

## Evidence actually viewed

- Owner's Orca screenshot: `/var/folders/42/65_x_x3s6s3fytgn3v511h5h0000gn/T/orca-paste-1788875499126-c55cefef-ece1-47e2-a1db-f0bd38024e6c.png`. This is a cropped/zoomed desktop PNG in Orca's mobile viewer. It cannot establish mobile page overflow.
- Current [Korean 1280](../evidence/scenes-2026-09-08/final/scenes/ko-light-1280-top.png), [English 1280](../evidence/scenes-2026-09-08/final/scenes/en-light-1280-top.png), [Korean dark 1280](../evidence/scenes-2026-09-08/final/scenes/ko-dark-1280-top.png).
- Current [Korean 768](../evidence/scenes-2026-09-08/final/scenes/ko-light-768-top.png), [English 768](../evidence/scenes-2026-09-08/final/scenes/en-light-768-top.png), [Korean 375](../evidence/scenes-2026-09-08/final/scenes/ko-light-375-top.png), [English 375](../evidence/scenes-2026-09-08/final/scenes/en-light-375-top.png).
- Earlier split composition: [Korean 1280](../evidence/identity-2026-09-08/final/identity/ko-light-1280-identity.png), [English 1280](../evidence/identity-2026-09-08/final/identity/en-light-1280-identity.png).

These are existing captured states, not fresh browser measurements. Pixel positions below are read from those frames and checked against the current layout rules; proposed positions are estimates.

## Diagnosis

**Anti-pattern verdict: pass, with a composition weakness.** Real center photography, local Pretendard, monochrome naming and a single orange action give the page a specific identity. There are no gradients, inflated statistics, ornamental badges or generic card stacks in this hero. The issue is the relationship between otherwise suitable elements.

1. **P2 — The name and explanation are too separate.** At 1280px, the name begins at x≈48/y≈130, while the introduction starts at x≈687/y≈181 in Korean and y≈151 in English. Both action rows sit around y≈260. `align-items: end` aligns the bottoms of differently sized content blocks; it does not give their reading order a shared starting line. The result is a large title on the left and a small, detached explanation/action island on the right. Moving only the buttons a few pixels would leave that structural separation. Remedy: `/arrange`, group name → introduction → actions in one column.
2. **P2 — The photo has become a second hero.** The 1184×507px frame runs from y≈350 to y≈857. The station/hours rail starts around y≈889, and no program heading is visible in the current 1000px-tall desktop frame. The picture is useful, but its full-width area dominates after the already substantial masthead. Reducing only its height would make the existing 21:9 panorama thinner and cut more of the actual room. Remedy: `/arrange`, give the photo its own substantial right column instead of a separate full-width row.
3. **P3 — The tablet and mobile layouts expose different grouping choices.** At 768px, the name spans the row, but the description and buttons split again; the English buttons align with the bottom of a three-line description. At 375px, both languages have the clearer name → introduction → actions → photograph order. English actions wrap to two rows, moving the image top to y≈457 versus Korean y≈347. This is valid reflow, not clipping, but compact action padding could keep the English pair together at normal text size. Remedy: `/adapt`, preserve the mobile reading order on tablet and keep reflow available when text is enlarged.

The old split version already demonstrates better grouping: its 667×501px photograph and complete copy/action block occupy one row, with the practical rail around y≈653. It is the stronger foundation for this owner's ordered, balanced direction. The recommendation refines that foundation with a shallower 3:2 image; it does not restore every earlier spacing decision.

## Recommended geometry

| Element | Desktop, ≥1024px | Tablet, 768–1023px | Mobile, <768px |
| --- | --- | --- | --- |
| Container | Existing 80rem including gutters; at 1280px the usable width is 1184px | Existing fluid gutters | Existing 20px gutters at 375px |
| Composition | 5:7 columns with 40px gap; ≈477px copy + 667px photo at 1280px | One column: name, introduction, actions, photo | Same one-column order |
| Name | 64–72px; one H1, natural wrap before Seoul, 500/650 weights; no forced break | Keep the existing 61–72px scale where it fits naturally | Keep existing 40–52px scale |
| Copy group | Name → 24px → introduction → 24px → actions; body 17–18px, at most 42ch; vertically center the complete group beside the image | 20px internal gaps; description may use the existing 62ch measure to avoid a narrow paragraph with empty space beside it | 20px internal gaps; current readable description measure |
| Photograph | 3:2, ≈667×445px at 1280px; explicit maximum height 480px | 16:9, ≈706×397px at 768px; maximum height 480px | Retain 4:3, ≈335×251px at 375px |
| Group → photo gap | Shared 40px column gap | 24px | 24px |
| Outer space | 40px above the row, 32px below before the practical rail | 40px above, 24px below | Existing 32px above, 20px below |
| Actions | Orange visit action followed by secondary programs action; 48px minimum height, 12px gap | Directly below the description, left aligned | Same order; 16px horizontal padding is sufficient to target a single row at 375px, but allow wrapping at narrower widths or enlarged text |

At 1280px, the photo would end near y≈565 instead of y≈857: roughly 292px less vertical occupation for the opening composition. The practical rail would begin near y≈597, bringing the program heading back into the first desktop view. This is achieved by sharing a row, not by shrinking body text or crushing the photograph into a banner.

The 480px cap is a ceiling, not a minimum height. With the existing desktop content maximum, the nominal photo is already about 445px high. For enlarged text, let the copy determine row height while the photo remains bounded; never clip or shrink the copy to match it. A taller stacked tablet composition is acceptable: preserve readable content rather than requiring every viewport to fit the whole hero above the fold.

Keep the existing 12px media corners, 8px controls, real lounge source and neutral names. Preserve the couch, artwork and blue window when reviewing the new crop. No text overlay, artificial gradient, diagonal offset, photo carousel, extra CTA or new asset is needed.

## Handoff checks and practical limits

- Update the current hero contract in `web/DESIGN.md` before implementing; the older sections in that document are historical. Do not apply the old 5:7 contract wholesale.
- `--hero-height: 36rem` is currently declared but not applied to `.hero-photo`. Editing that token alone will not change the frame. The new ceiling must actually be connected to the photo layout.
- `CenterPhoto` currently requests 1184px on desktop because it fills the container. A split 3:2 frame changes both width and cover scaling: a 16:9 source filling a 667×445px frame needs roughly 791px of source width at DPR1. Recalculate `sizes` with the rendered crop; do not just use the 667px box width or keep over-requesting 1184px automatically.
- The no-forced-break name rule, normal document reading order, photo alt text, real routes, reduced-motion behavior and functional no-JavaScript content must remain intact. No new animation is required to resolve this composition.
- After implementation, capture KO/EN and light/dark at 375/768/1280, plus desktop text enlargement. Check that the two English buttons fit or wrap cleanly, the complete name remains readable, no text is clipped, and the photo still communicates a real room. Existing frames do not validate the proposed change.

## Focused usability assessment

Static cognitive-load checklist: single focus ✓, chunking ✓, grouping ✗, hierarchy ✗, one decision at a time ✓, minimal hero choices ✓, no memory dependency ✓, progressive detail ✓. **2/8 concerns: moderate**, concentrated in spatial grouping. The global navigation has six links, but the hero decision is already limited to two clear actions; no menu restructuring is recommended here.

| Nielsen heuristic | Static-review score | Evidence/limit |
| --- | --- | --- |
| H1 Status visibility | Not assessed | Transitions and feedback were not exercised |
| H2 Real-world match | 3/4 | Factual space description, recognizable photo, clear visiting terms |
| H3 User control | Not assessed | History, keyboard and menu behavior were not exercised |
| H4 Consistency | 3/4 | Type, color and controls remain coherent; responsive grouping varies |
| H5 Error prevention | Not assessed | No input or destructive action in the reviewed hero |
| H6 Recognition | 3/4 | Explicit action labels and practical information; spatial association can improve |
| H7 Efficiency | Not assessed | Route completion was not tested |
| H8 Aesthetic/minimalist design | 2/4 | Useful content, but separate title/copy/photo regions overextend the opening |
| H9 Error recovery | Not assessed | No error state was shown |
| H10 Task guidance | 3/4 | Visit action plus station and hours; these facts sit too far below the desktop introduction |

**Observed subset: 14/20. No full /40 score or release verdict is claimed.**

- **Jordan, first-time visitor:** reads the center name, then looks for what happens there and how to visit. Those answers are present, but desktop placement sends the eye across to the small right block and then down over a large photograph to practical facts. A single copy/action block removes that detour. This is a visual walkthrough, not a measured usability test.
- **Casey, international visitor on a phone:** can see “Plan your visit” before the photograph and has readable touch controls. At 375px the secondary action moves to another row and pushes the scene down by about one button row; preserve its label and target size while allowing a more compact normal-size pair. No claim is made about route success, touch interaction or assistive technology.

Recommended sequence: `/arrange` for the desktop grouping and image geometry, `/adapt` for tablet/mobile order, then `/polish` against fresh captures. No additional reference research or alternative direction is necessary to resolve the stated concern.

## Final visual follow-up — 23:15 KST production capture set

**PASS within this focused static review.** No open composition, obvious clipping, action-overlap or footer-icon appearance issue was found in the six new frames actually viewed at original resolution. Root reports production build `RcYcgiLOZAi3KkRBM4anP`; all listed files have 2026-09-08 23:15 KST modification times. This follow-up did not run a browser or edit product source.

### Actual frames and outcomes

| Viewed frame | Result |
| --- | --- |
| [Korean light, 1280](../evidence/public-site/ko-home-light-1280.png) | Name, description and both actions form one readable left column; the photograph balances it on the right. All hero content and the following program heading are visible within the first 1000px. |
| [English light, 1280](../evidence/public-site/en-home-light-1280.png) | The longer introduction fits without pushing the buttons out of the composition. “Bitcoin Center” and “Seoul” remain complete; the city emphasis is visible and monochrome. |
| [Korean light, 375](../evidence/public-site/ko-home-light-375.png) | Complete one-line Korean name, readable three-line introduction, two actions on one row and an intact 4:3 photograph. No visible edge clipping. |
| [English light, 375](../evidence/public-site/en-home-light-375.png) | Natural two-line name; both actions now fit one row without truncating their labels. The image starts near y≈395, about 62px earlier than the old y≈457 frame. |
| [English light, 768](../evidence/public-site/en-home-light-768.png) | One-line title, two-line introduction and directly adjacent action row share the left alignment. The 16:9 photo reads as the same room rather than a thin banner. |
| [Korean dark, 1280](../evidence/public-site/ko-home-dark-1280.png) | Same balanced geometry, legible neutral type, clear orange primary action and recognizable quiet footer icons. |

The new desktop photo is visibly about 667×446px, spanning x≈565–1232/y≈120–566. The practical rail now begins around y≈598, versus y≈889 in the wide-photo version. The intended reduction of roughly 290px is therefore present in the actual frame. The title/description/actions use one left edge; there is no forced diagonal composition. Vertical centering relates the complete text group to the photograph rather than scattering individual elements.

The tighter crop preserves the couch, artwork, counter and blue window. The room still has substantial visual weight, but it no longer becomes a second full-width hero. No further image shortening or typography reduction is recommended.

The mobile English action pair is a useful improvement: both labels remain whole and the secondary action no longer introduces a separate row at normal text size. The remaining difference in Korean/English image position follows the legitimate one-line/two-line title difference. It should not be equalized with fixed heights or a forced line break.

### Footer and settled title

- Mail and telephone are recognizable neutral outline icons in a compact horizontal pair. At desktop/tablet they align with the navigation/visit row; at mobile they sit below navigation. No surrounding text boxes, clipped glyphs, overlapping links or edge collisions appear in the reviewed frames.
- The settled hero and footer names contain all their letters, with coherent spacing and visible emphasis on Seoul. This confirms the final rendered appearance after the new letter animation, not the animation's timing or intermediate states.
- The darker palette preserves the same hierarchy; the orange action remains visually primary. No numeric contrast certification is inferred from screenshots.

### Resolution of the original findings

| Original finding | Follow-up |
| --- | --- |
| P2: name and introduction/action island are separate | Resolved in the viewed desktop and tablet frames |
| P2: full-width photo creates a second hero | Resolved by the actual 3:2 split composition and shorter opening |
| P3: tablet grouping and mobile English action wrapping | Resolved at 768px and normal-size 375px in the viewed English frames |

Static cognitive-load recheck: the original grouping and hierarchy concerns are resolved; **0/8 observed concerns** in this focused hero assessment. This does not upgrade untested interaction heuristics to a full usability score.

Review limits: no click, keyboard, screen-reader, text-enlargement, animation-timeline or reading-progress behavior was exercised by this reviewer. No claim is made for an unviewed wide-screen or dark/mobile combination. Those remain the root implementation/QA run's responsibility; no additional product change is requested by this visual follow-up.

### Evidence identity

The six reviewed originals are recorded here because the root's separate final evidence directory still contained 23:02–23:03 captures when this follow-up began. Those older copies were not used as the basis of this verdict.

| File | Time KST | SHA-256 |
| --- | --- | --- |
| `ko-home-light-1280.png` | 23:15:33 | `5aba7920acdb4cc09344def1b0f8409cbbfeb9b4449453e074e376804ccff06b` |
| `ko-home-light-375.png` | 23:15:26 | `0007ecc3df36c45d96ddf12a125e82c75aeb6df18a409152e52a471dae289bc6` |
| `en-home-light-1280.png` | 23:15:53 | `5caeed24cc0d446c9884166c26a3a5ec8568a5a1f3d1e6b7400c4d58ef925929` |
| `en-home-light-375.png` | 23:15:47 | `8652ac2a174cc1b6f5d528c7aeee8bca9d33dab4abd266cb3159414278c50522` |
| `en-home-light-768.png` | 23:15:50 | `fc7d856e6b5f08a2ba851c19d695557378f210afbc187cdd3a21d5badcce489c` |
| `ko-home-dark-1280.png` | 23:15:43 | `9b4bc76db5a4489ffe00490ee8e899690f52a66e047ebf79ad64a1006aea5e4a` |
