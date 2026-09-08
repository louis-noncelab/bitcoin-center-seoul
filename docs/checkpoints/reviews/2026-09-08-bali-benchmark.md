# Bitcoin House Bali benchmark — 2026-09-08

Reference: [Bitcoin House Bali](https://bitcoinindonesia.xyz/bitcoin-house-bali/). This is a read-only design benchmark, not a clone specification or a final acceptance of the BCS redesign.

## Inspection and evidence

- Real Playwright Chromium, installed `web/node_modules/playwright`, Chrome channel, headless, DPR 1, default motion preference.
- Two browser passes began at **2026-09-08 20:21:50 KST** and **20:22:58 KST** (11:21:50Z / 11:22:58Z). Viewports: **1280 × 900** and **375 × 900**.
- Visited only the supplied page; drove its desktop navigation hover, an internal explore anchor and its mobile navigation disclosure. No registration, payment, message, external contact or local build was performed. Both browser instances were closed.
- Raw evidence directory: `docs/checkpoints/evidence/design-craft-2026-09-08/reference-bali/`.
- Primary desktop captures: `1280-top-settled.png`, `1280-intro.png`, `1280-activity.png`, `1280-education-settled.png`, `1280-nav-hover.png`, `1280-contact-0.png`, `1280-footer.png`.
- Primary mobile captures: `375-top-settled.png`, `375-menu-settled.png`, `375-contact-0.png`, `375-footer.png`.
- Runtime records: `inspection.json` (headings, positions, controls and image sources) and `interaction.json` (actual driven state, keyframes and timing).
- The first desktop top capture preceded the central illustration loading. **Use `1280-top-settled.png`, not `1280-top.png`, to judge the finished hero.** The illustration loaded in the subsequent capture. This was a transient observation, not proof of a permanent broken asset.
- Several subsequent heading-target screenshots landed on the education section because scrolling/content continued settling. In particular, the files named `*-visit-settled.png` are **not visit evidence**. Use the visually inspected `1280-contact-0.png` and `375-contact-0.png` instead. Likewise `375-menu-open.png` was captured during an unsettled scroll; only `375-menu-settled.png` is menu evidence.

BCS comparison sources: current `web/DESIGN.md`, `home.tsx`, `section-content.tsx`, `site-footer.tsx`, `page-motion.tsx`, and `center.ts`; visually inspected `design-craft-2026-09-08/first/ko-light-1280-top.png`, `ko-light-1280-full.png`, `en-light-375-top.png`, and the older revision's full Korean desktop home. No claim about the root agent's later build or its runtime performance is made here.

## What gives the reference presence

**A memorable focal object and a strong hierarchy.** The hero uses an orange container-house illustration, palm silhouettes, an arched backing shape, a green field and a very large two-level name. Browser-computed desktop title sizes were approximately 73px and 102px in Poppins. This is deliberate visual identity, not a neutral feature grid. Its illustration is evocative, while BCS's actual lounge photograph gives more direct information about the space a visitor will enter. The current BCS 5/7 hero already has the right counterweight: substantial real photography, a strong two-line name and visible practical actions.

**Specific activities make the venue believable.** The reference combines a current-month calendar image, embedded activity media, photographs of people attending sessions and detailed descriptions of what a visitor can do. The useful quality is specificity and visible participation. It is not the number of services or the social-platform chrome. Its long event list includes recurring future months; the initial measured page was about 16,173px tall on desktop and 23,611px on mobile. Those lengths varied as external content loaded. This makes a compact BCS program section and existing event-notice link a stronger basis than copying the feed.

**Distinct sections create progression.** The oversized hero is followed by an explanatory panel plus a page overview, activity media, a tour, photo-and-text service sections, a colored visit/contact block, then a contrasting dark footer. The different jobs are easy to distinguish. BCS's revised program selector, paired exhibition frames, journal index and goods caption band already provide useful structural variation. The first BCS render still has two conspicuous empty regions described below.

**Wayfinding is explicit.** The early overview links directly to activity, tour, learning and visiting sections. The desktop header reveals a large grouped navigation panel on hover, confirmed in `1280-nav-hover.png`. Map and contact actions are clearly labeled and visually prominent on desktop and mobile. BCS has fewer destinations, so its existing compact navigation is appropriate; the transferable benefit is direct access and obvious action labels.

## Motion actually observed

- Clicking the mobile menu produced a black navigation surface, moving the content wrapper to `scale(0.84) translateX(-348.75px)` and introducing the menu from `translateX(110px)`. Runtime duration was **800ms**, easing `cubic-bezier(0.15, 0.2, 0.1, 1)`. The settled screenshot visibly confirms the changed state.
- The internal explore link initiated a long scroll. Samples after successive waits of 40/160/500/900ms recorded scroll positions **0 / 1 / 168 / 4483px**. This establishes animated navigation, but not a reliable universal scroll duration.
- A rotating hero emblem had a **12s linear** running animation. The footer's oversized text used a **30s linear** running animation. These were read from active browser animations, not inferred from screenshots.
- Desktop navigation hover visibly exposed the grouped panel. The tested explore link's text and parent colors/transforms did not materially change in the sampled default/hover computed states; recorded transition declarations alone are not evidence of a meaningful visible hover effect.
- Reference reduced motion, keyboard focus trapping and menu Escape closure were **not fully audited**. No accessibility or performance score is claimed.

The useful lesson for BCS is visible state progression. The 800ms whole-page displacement and perpetual rotation/marquee are unnecessary for the approved BCS contract. Its 160ms control feedback, 260/180ms menu lifecycle, directional program transition and 600ms section entrances can be more responsive and still more legible if inspected in motion.

## Five concrete BCS improvements

| Priority | Change within the current design | Why it improves the comparison | Scope / verification |
| --- | --- | --- | --- |
| 1 | **Make the goods photograph occupy the same full content width as its caption band.** Preserve the real retail photograph and 12px frame. | In `first/ko-light-1280-full.png`, the image occupies roughly three quarters of the available width, leaving a conspicuous blank strip on the right while the caption spans the entire row. The reference's major visual regions read as intentional complete compositions. | Adjust the existing goods layout, not its content. Verify the real crop and image sharpness at 375/1280px and both themes. |
| 2 | **Group each program's heading, description and event action together.** Give the action a normal content gap instead of pushing it to the bottom of a mostly empty half-panel. | BCS's first desktop render separates the short description from the event action with a large blank region. Bali makes the visitor's activity and next action read together. The current BCS copy and real education/community images are already sufficient. | Reuse `ProgramsContent` and its existing action. Keep panel height stable during selection; check both education and meetup labels/copy in ko/en. |
| 3 | **Expose existing journal summaries on the home index beneath their corresponding titles.** Keep the compact list and genuine categories. | Title-only rows establish subjects but give little evidence of what happened. The reference's activity media and concrete session descriptions give a stronger reason to believe the center is active. `center.ts` already contains factual summaries; using them requires no invented dates or new feed. | Reuse `entry.summary`; no new schema, fabricated event, testimonial or calendar. Keep the whole row clearly interactive and confirm natural Korean wrapping. If space becomes excessive, expose only the first verified record's summary rather than reducing body text. |
| 2 | **Make the hero's station/directions fact an explicit route to the existing map or visit details.** Retain the primary visit button and grouped footer address/hours. | Bali supplies early jump links and a clear map destination. BCS's first mobile screen already shows useful directions, but `home.tsx` renders them as an inert span; a visitor who has chosen to come must still find another action. | Use the existing verified destination and a readable direction label. Do not introduce a new map service or add contact operations. Check one-tap access, focus visibility and the English line wrap. |
| 3 | **Make the program selection change the signature visible motion, and record its intermediate states.** Preserve the selected underline and directional photo/panel change from the current contract. | Bali's observed menu transformation makes state change unmistakable. BCS can exceed that interaction quality through a useful, quicker transition tied to actual program choice. A static screenshot cannot show whether the current code achieves it. | This may already be implemented in the root revision; treat it as a final acceptance requirement, not proof of a defect. Capture switching both ways at 0/150/600ms, rapid repeated input and reduced motion. Selected label, image and action must settle on the same program without blank content. |

No stack change, copied Bali asset, invented event, new service, social embed or live backend is needed for these improvements. Preserve the approved 5/7 hero, Pretendard, orange/blue identity, light/dark modes, bilingual routes, real photography and SaturdayBlock alignment reference. The fresh final BCS render still needs its own interaction and visual review before claiming it exceeds the benchmark.

## Root handoff update

After this comparison, the root agent reported that the goods width and program action grouping were fixed in the active revision, while the 5/7 photographic hero was retained. The first two rows therefore record the rationale for changes already made; their fresh visual verification belongs to the root's current build. This reference inspection did not reopen a local browser or verify that later render.
