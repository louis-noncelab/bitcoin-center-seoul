# Coconut reference review — 2026-09-08

Reference: [Coconut](https://www.coconut.onl/), supplied by the owner as their own product page. This is a bounded read-only comparison, not a request to copy its assets, product claims or entire page structure.

## Evidence and limits

- Real Playwright Chrome, headless, DPR 1; **1280 × 900** and **375 × 900**, normal motion preference. Inspection began **2026-09-08 20:49:34 KST** (`11:49:34.722Z`). Only the home URL was visited.
- Captures: `docs/checkpoints/evidence/design-craft-2026-09-08/reference-coconut/`.
- Desktop: `1280-top.png`, `1280-section-1.png` (paired product plates), `1280-section-2.png` (transaction sequence), `1280-section-3.png` (practice/open-source transition), `1280-section-4.png` (open-source composition), `1280-footer.png`, `1280-cta-hover.png`.
- Mobile: `375-top.png`, `375-section-1.png`, `375-section-2.png`, `375-section-3.png`, `375-footer.png`, `375-menu-open.png`.
- `inspection.json` contains the completed **desktop** runtime record: computed type/control styles, active keyframes, image/control positions and driven desktop hover states. The mobile page was captured and its heading/control inventory printed, but the later hover timeout prevented that viewport's JSON from being persisted.
- The mobile menu was opened successfully. After Escape, `.mobile-menu` still intercepted the subsequent footer-link hover, which timed out. No force-click or external navigation followed. The browser was closed in an awaited `finally` block before the process exited. Root was notified immediately; no browser was reopened.
- No payment, app-store navigation, message, registration, install, local build, deployment or product-file edit occurred. This is not a complete keyboard, reduced-motion or performance audit.

Comparison contract: the current top section of `web/DESIGN.md`, including the approved 5/7 lounge hero, 8px controls, 12px media/panels, 48px actions, restrained orange/blue accents, practical footer and controlled 48s footer-name marquee. Earlier BCS home/footer source and rendered evidence remain comparison context; the root's concurrent build was not inspected.

## What actually works in the reference

**Cards have a clear internal relationship.** The two product plates share one anatomy: a large quiet image field above an attached, slightly differentiated caption band. Equal desktop dimensions make the pair easy to compare. The transaction section reuses that relationship for a genuine sequence; its five cards are a product explanation, not generic features added to fill a grid. On mobile the paired plates stack in the same reading order, preserving the image/caption connection. See `1280-section-1.png`, `1280-section-2.png` and `375-section-1.png`.

**CTA grouping stays simple.** The hero's filled primary action and outlined secondary action share a row and baseline on both captured widths. The final conversion section groups the two store destinations directly below its copy. Browser-computed desktop hero controls were 38px high with 12px corners and a 12px gap; the header action was 36px high. BCS should retain its larger approved 48px action height and 8px corners. The transferable quality is hierarchy and proximity, not those smaller dimensions.

**The page changes structure with the story.** The side-by-side hero, paired product explanation, dark sequence, practice panel, source-code scene and centered final CTA each serve a different purpose. The contrast makes sections distinct. The BCS venue should keep its real-space palette and light/dark switch; copying automatic black/white section flips or a product-device backdrop would weaken its documentary identity.

**The mobile menu keeps the scope readable.** Clicking its hamburger replaces it with a close icon and displays three large destinations plus a filled download action on a full-height pale surface. The logo and language control remain visible. The screenshot proves the open state, but intermediate menu timing was not retained. The sampled Escape behavior described above is a reason to preserve BCS's already-required focus, Escape and inert handling, not a behavior to inherit.

## Motion: observation versus inference

- An active `os-code-rain-move` browser animation translated the open-source backdrop from `translateZ(0)` to `translate3d(0, -200px, 0)` over **30 seconds**, linearly and repeatedly. This is a vertical moving backdrop, not a horizontal text marquee.
- **No horizontal text marquee was observed on the captured home page.** Do not describe BCS's approved footer marquee as a copied Coconut mechanism.
- Hovering the actual App Store link changed its computed transform from none to **scale 1.02 plus −3px vertical translation**, and added a soft `0 16px 36px` shadow with 0.14 opacity. `1280-cta-hover.png` records the settled state. This observation applies to that interactive link only; it does not establish hover behavior on every card or the hero's button controls.
- The phone compositions look dimensional in the screenshots. A static image and an animation declaration are insufficient to claim a specific float, tilt, parallax or scroll choreography; none is asserted here.

## Compatible refinements — at most three

| Refinement | Concrete BCS application | Boundary |
| --- | --- | --- |
| **Give the existing exhibition pair one media-and-caption surface per plate.** | If the latest render still leaves captions visually detached, place each real exhibition/experience photo and its caption in one shared 12px frame with a quiet surface caption band. Keep equal images and aligned caption starts. | Use only for the existing paired comparison. Do not turn programs, journal and every section into additional card grids; do not round the photographs beyond the current token or obscure artwork. |
| **Keep actions immediately adjacent to the copy they complete.** | Retain the current filled visiting action + secondary program action grouping, and the program CTA grouping already improved after the Bali review. In final mobile/English QA, let this pair wrap naturally while preserving equal 48px targets and clear priority. | This is an acceptance refinement of the active implementation, not a request to add another CTA row, reduce controls to Coconut's 36–38px heights or restore empty space to balance columns. |
| **Limit continuous movement to the already-approved footer name.** | Let that single controlled 48s marquee carry BCS identity; keep address, hours and map/contact actions stationary and readable below it. Verify pause/play, hover pause, reduced motion and no-JS fallback in the fresh build. | Coconut's observed code loop is meaningful to an open-source product section. It provides no reason to animate BCS photographs, insert a code backdrop, add another marquee or weaken the existing menu lifecycle. |

The first item is the only possible new visual adjustment suggested by this inspection. The other two protect the current revision's stronger behavior while incorporating the reference's hierarchy and restraint. No new library, discovery cycle, brand-copy rewrite or backend work is needed.

## Root decision
Root directly inspected desktop hero and product-plate captures. Current BCS paired exhibition frames already use the same `MediaFrame` with aligned captions and a12px media radius. Keep that relationship; do not add another enclosing box solely to imitate the reference. Primary/secondary actions and the program CTA remain grouped with their explanations; natural mobile wrapping preserves48px targets. Keep the existing stationary practical footer and one controlled name marquee. No Coconut assets, claims,36–38px controls, code-rain animation or mobile Escape behavior were copied. This reference review did not introduce an unrequested photo album or a new layout cycle.
