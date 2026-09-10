# Bitcoin Center Seoul: public design revision

## Current contract — navigation, status icons and space film, 2026-09-10

The owner authorizes a cinematic use of the existing center footage and asks for
animated navigation underlines and an icon instead of the operating-status dot.
Reuse the existing neutral surfaces, Pretendard, controls and selection primitive.

- Blue emphasis: the shared `--focus` token follows `--blue-ink`, matching the
  navigation indicator in both themes. Reading progress, field underlines,
  keyboard focus, calendar-today borders and notice rules use this same token.
- Navigation: a text-width, 2px underline identifies the current destination.
  On desktop one indicator glides to the pending link with the existing 280ms
  menu curve; settled route, history, font/viewport changes and failed navigation
  restore the actual current link. Only one underline is visible: hover changes
  text color and keyboard focus retains its outline. Mobile disclosure and
  no-JavaScript use a current-label underline without the shared enhancement.
  Both paths use the label's baseline and the same gap. The initial position is
  measured before paint without an entrance from the left; page-header remounts
  hand off the currently painted transform so cached navigation and history keep
  moving from the previous position. Reduced motion changes position immediately.
- Status: 20px Lucide DoorOpen, AudioLines, Moon and Clock3 distinguish open,
  meetup, closed and unavailable alongside the existing bilingual labels.
  Success/orange/muted tokens retain their meanings. Opening and meetup icons
  perform two gentle 2.4s cycles when the state appears, then settle; the state
  remains legible and the icon never implies a loading spinner. Reduced motion
  is static. Scheduling, polling and administrator exceptions are unchanged.
- Film: the about page introduces a `SpaceTour` with the existing accessible
  `SelectionTabs` for lounge, library and exhibition. Each selection combines a
  real silent clip, a short description and a relevant program/collection link.
  Home links directly to this section. This supersedes the historical still-only
  video decision below; the high-resolution home photograph stays in place.
- Composition: after the owner's width revision, the tour fills the page content
  width and aligns with the page heading. A 3:2 column split enlarges the video
  alongside its description, with shared 32/40px gaps, 16:9 frame and 12px corners.
  Under 768px the image and description stack. The real 640×360 footage scales
  with its frame; its actual colors and watermark remain. No invented frames,
  faux grain, decorative subtitles or audio. Scene changes use a 500ms
  opacity dissolve with the existing image/exit tokens and selection lifecycle.
  The owner's latest revision removes every visible playback icon and the bottom
  control rail. The unobstructed film loops automatically. A transparent native
  button covers the frame for pointer/touch and keyboard pause/play, with an inset
  focus outline and bilingual accessible action labels. No icon appears on hover,
  focus, touch or pause. Reduced-motion/no-JavaScript behavior remains intact.
- Delivery: H.264/yuv420p MP4 derivatives with fast-start and WebP posters,
  same-origin under `/images/space-tour/`; no remote video requests or new CSP
  allowance. Source URLs, cuts and sizes are recorded with the assets. No media
  source is attached until its scene is on screen or explicitly played.
  Offscreen/background video pauses. Reduced-motion users initially see the
  poster and can explicitly play; changing the preference pauses playback.
  Manual pause persists through visibility changes. Failed/autoplay-blocked
  playback retains a poster, a useful label and a working retry/play action.
  No-JavaScript retains the initial poster, description and destination.
- References: beui.dev `tabs` and `animated-badge` source consulted for shared
  selection and state-icon mechanisms; native media lifecycle follows installed
  Next.js video guidance. Adapt mechanisms only; no registry components copied.
- Media provenance: the center's existing `BCS_480p.mov` at
  `https://bitcoin-center-seoul.s3.ap-northeast-2.amazonaws.com/BCS_480p.mov`.
  The whole 120s source was inspected before extending the original 5.5s clips.
  Lounge (25.67s): source 109.5–116.5s hall, 23.5–31s front tables and projection,
  36.5–46.5s lounge counter. Library (17.92s): 79–88.5s bookcase, 89.5–94.5s
  reading table, 105.5–108.5s whitepaper displays. Exhibition (33.21s) follows
  the owner's revised order: board games → full display → merchandise → art.
  Source 48–75s is one uninterrupted camera pass, without inserted effects or
  reordered cuts; 101–104.8s adds the corridor painting at the end. Each is
  640×360 at 24fps and 90% source speed, with 0.5s dissolves only between separate
  shots and at the end-to-start loop boundary.
  H.264 CRF 22, yuv420p, fast-start, no audio; first-frame WebP poster quality 85.
  Original footage remains untouched; the derivatives preserve its watermark.
- Verify both locales/themes, 375/768/1280 and wide layouts, pointer/keyboard,
  history, motion frames, actual decoded playback, offscreen/background pause,
  reduced motion, blocked/failed media and no-JavaScript. No auth/data changes.
- About gallery: the owner asks to show the full variety of the center below
  the film. Replace the single artwork plate and repeated short notes with six
  captioned originals: art, merchandise, hardware wallets, library, lounge and
  hall. Reuse CenterPhoto and MediaFrame, 16:9 photographs, shared corners and
  neutral typography. Three equal columns on desktop, two below 1024px and one
  below 768px; each photograph has a bilingual title, description and alt text.
  Reuse the existing once-per-viewport entrance with reduced-motion and no-JS
  visibility. These are static photographs, with no new carousel or media files.

## Current owner contract — events-only public surface, 2026-09-09

The owner selected `63a08b95cb54e06d9a00c89ae14d8d9eb1851284`
as the reset base and asked to retain the later public visual craft while reducing
the product to the center and its events. This section supersedes every historical
reference below to goods, shop, cart, checkout, payment, booking, accounts,
notices, community administration, inquiry forms and transaction state. Those
notes remain only as a record of earlier design work.

- Public routes are home, about, programs, experience, journal and visit, plus
  numeric event and highlight detail routes. Programs show the real event records;
  journal and the home preview show active real highlights. Empty states state
  that no record is published and never substitute fabricated content.
- Event details retain the legacy title, date, time, location, description and
  original external HTTP(S) link. Highlight details retain their category,
  date or date range, host, description, metadata and original HTTP(S) link.
  Neither surface accepts registration or payment.
- Record images use the existing `/images/uploads/`,
  `/images/events/uploads/` and `/images/highlights/uploads/` sources. Detail
  pages use a simple responsive one/two-column gallery with meaningful alt text;
  no carousel, modal viewer or added client state.
- Preserve the documentary hero, real center photography, Pretendard, supplied
  orange/sky identity, official light/dark wordmarks, centered navigation marker,
  locale path/query/hash continuity, reading progress, reduced-motion-safe page
  motion, factual footer marquee and wider centered chrome at large viewports.
- Footer actions are direct `mailto:`, `tel:` and map links. There is no inquiry
  backend, notice archive, account access or commerce destination.
- Public copy and metadata remain Korean/English. Runtime SQLite reads occur only
  after a request connection, so static builds do not touch review or production
  content. The local review remains `noindex` until a separate release decision.
- Accessibility constraints: semantic headings and landmarks, visible focus,
  44px minimum interactive targets, descriptive gallery alt text, non-color-only
  metadata and immediate reduced-motion behavior. Accepted debt is limited to
  owner visual approval and final real-browser verification after integration.

## Current motion contract — title assembly and viewport entrances, 2026-09-08

The owner requests the large home name to form on entry and content to settle
into position while scrolling. Reveal real Korean syllables and English letters
with a short upward movement and opacity, using the existing 600ms entrance curve
and 24ms letter stagger. The heavier city completes last, within one second.
Keep a single H1 with its complete accessible name and ordinary text spaces;
retain the natural wrap before Seoul, emergency text-zoom wrapping and the compact
hero layout below. No scrambled characters, loading gate, loop or cursor.
The title reserves its final dimensions; letters do not change layout.

Observe individual marked content groups, rather than starting an entire long
section at once. Trigger near the viewport's bottom edge, once per visit, with
600ms movement and at most 160ms group delay. On mobile, later photo groups must
wait until they actually enter the viewport. Keep related photo/caption and
copy/action groups together. Content remains visible by default; reduced motion
shows everything immediately and changing that preference cancels active motion.
Preserve native scrolling, working controls during entry and existing navigation,
tab and footer interactions. This replaces the old whole-H1/whole-section motion
constraint only; it adds no library or scrolling controller.

## Current contract — compact hero, contact icons and reading progress, 2026-09-08

The owner found the full-width hero photo too long and the introduction/actions
awkwardly separated from the name. A focused UI/UX review of nine actual frames
recommends one left-hand name/introduction/action group and a right-hand 3:2
lounge photo in a 5:7 desktop grid. At 1280px the photo is about 667×445px,
bounded by the existing 80rem content measure and a 480px photo-height ceiling.
The desktop name returns to the
48–72px fluid scale so its first name group stays intact. At 768–1023px use a
single column with a 16:9 photo and wider description measure; below 768px keep
the 4:3 photo and existing 40–52px name. Mobile action padding is 16px so the
English pair fits at normal 375px size, while remaining free to wrap. Preserve
all practical facts below the hero, actual copy, natural
Seoul wrapping, photograph, and entrance motion. This supersedes only the wide
hero portion of the preceding photographic-composition contract.

The owner supplied a SaturdayBlock footer screenshot and requested icon-only
reservation/contact links plus a reading-progress line at the top of the page.
Keep the real email/telephone destinations. Show neutral mail/phone SVGs in a
compact horizontal row, no text-filled contact boxes. Preserve 48px targets,
8px control corners, visible focus/hover feedback, bilingual accessible names
and native destination titles. The contact heading may be visually hidden.
Use the existing footer anatomy with compact contact-column width; no invented
social destinations or legal links from the reference.

The progress line is fixed to the viewport's top edge, 3px high, using the
contrast-safe blue `--focus` token, and
non-interactive. It reflects actual document scroll distance with a left-origin
scale transform, including route/history changes, resizing and changing content
height. No artificial easing, added scrolling, per-frame React render, loading
indicator or scroll interception. No-JavaScript leaves it empty. Reduced motion
still shows position immediately, without additional animated motion. Preserve
the existing skip-link/focus layer above it.

## Previous contract — photographic composition upgrade, 2026-09-08

Owner authorized upgrading overall visual impression after explicitly excluding
new shop and meetup-registration pages. Preserve the established typeface, neutral
name, natural wrapping before Seoul, both locales/themes, practical navigation,
8px controls/12px media corners and 80rem centered content measure. This revision
raises the hierarchy and photographic presence inside that existing system.

- Hero: an editorial masthead with the name and introduction/actions in aligned
  columns, followed by one wide lounge photograph. Name remains one H1 with
  500/650 weights; desktop 75–88px, tablet 61–72px, mobile 40–52px. At 768–1023px,
  the name spans the row, then introduction and actions share the next row.
  Below 768px, stack name, introduction/actions and a 4:3 photo. Desktop photo
  21:9; no autoplay photo album.
- Home section emphasis: program and goods headings use a feature scale
  `--text-feature: clamp(2rem, 4vw, 3.5rem)`. Other section headings retain the
  existing scale, so the content has a clear hierarchy. No decorative numbers.
- Program photograph gets more width in the home layout while the existing
  education/meetup selection, copy and real destinations remain usable.
- Goods becomes an aligned photographic pair: a closer view of the actual rabbit
  object/glasses and the full retail context. Same 4:3 frames and aligned edges.
  Crop remains CSS presentation of the unchanged real source, with a specific
  alt text and source/pixel-density verification; no invented products or prices.
- Scroll motion: existing once-only section entrances may reveal explicit
  `[data-reveal-part]` children in order, with `--duration-stagger:80ms`, at most
  160ms extra delay. Content is visible by default, no scroll interception or
  per-frame React state. Preference changes and cleanup cancel active effects.
  Existing nav/tab interactions and controlled footer name marquee remain intact.
- Reference lessons remain SaturdayBlock alignment and grouped actions, Bali's
  real-place presence, Coconut's clear hierarchy. No new reference research,
  copied assets, typography swaps, decoration layers, backend or launch controls.

## Previous contract — craft and identity revision, 2026-09-08

Identity follow-up: the owner found the craft candidate much improved, then
requested less blue in the name, emphasis on Seoul and a final copy/SEO pass.
Use monochrome names in the hero, header and footer. Group “비트코인 센터” / “서울”
and “Bitcoin Center” / “Seoul” with ordinary semantic spaces; wrap before the city
only when needed. Keep one accessible H1. Name weight 500, city 650 at the same
size; allow an emergency word wrap under text enlargement. No decorative period.
Resting informational icons inherit text color. Blue remains for links and
interaction/selected states with visible non-color feedback. Preview stays noindex.

The owner reopened the previous candidate: it was ordered but generic, and the
UI/UX, navigation feedback, motion and visual identity need a substantial upgrade.
This is approved implementation work; visual acceptance remains the owner's.

- Audience/job: first-time Korean and international visitors understanding the
  center's real space and activities, then finding programs or planning a visit.
- Direction: contemporary cultural venue, documentary photography and substantial
  typography. Design variance 5 (distinct section structures inside a regular
  grid), motion 7 (coordinated entrances and state changes), density 6 (closely
  grouped information, no expansive dead areas). No retro serif or decorative
  numbering/spine, template card stacks, arbitrary diagonals or repeated pills.
- Reference: continuously compare actual `/Users/max/saturdayblock-web` components
  for alignment, grouped navigation/footer content and responsive composition.
  Preserve the center's own assets and semantics; do not copy miniature text,
  ambient canvas, backend code or its multi-brand scope.
- Added quality benchmark: https://bitcoinindonesia.xyz/bitcoin-house-bali/.
  Compare real-space presence, useful activity proof, visiting flow, mobile and
  motion. Do not transplant its services, claims, events or photographs.
- Grid: 80rem including 20–48px gutters; 24–40px columns; 40–64px section padding.
  Equal neighboring photo frames, no off-grid offsets or empty grid columns.
- Hero: aligned 5/7 name-and-lounge composition. Naturally wrapping center name, factual intro
  and visit/program actions grouped on the left; substantial photograph on right.
  Station and operating hours form a compact practical rail below. Mobile stacks
  copy/actions then photo, with all useful facts and an about-route link.
- Home anatomy: working program selector; two image-first exhibition plates;
  compact readable journal index; goods photograph and concise caption band.
  Avoid repeating title/description/button/photo anatomy for every section.
  Fold duplicate home about/visit blocks into the introduction and shared footer;
  every complete detail route and navigation destination remains available.
- Type: local Pretendard, masthead 48–72px desktop and 40–52px mobile; headings 30–44px,
  body 16–18px, labels/captions 15–16px. Korean keep-all; deliberate readable wraps.
- Geometry: controls 8px, media and grouped panels 12px. Neither pills nor sharp
  rectangles. Actions 48px high; targets at least 44px. All geometry uses shared tokens.
- Color: supplied orange/blue identity; light default and dark switch. Orange
  highlights primary visiting action, blue supports links/current selection.
  Avoid image filters that alter actual artwork/skin or unrelated theme flips.
- Navigation: immediate 160ms press feedback, selected/pending underline, ~260ms
  menu entry/~180ms exit with focus and inert handling. Destination content arrives
  after routing; no artificial navigation delay or scroll reset. Preserve
  `data-scroll-behavior="smooth"` on HTML and correct browser history restoration.
- Wide screens: verify 1440/1920/2560/3440px. The 80rem content measure stays centered;
  cards/photo plates and CTA retain readable sizes and shared alignment. Desktop
  navigation remains visible from 960px when both languages fit.
- Motion: title/intro choreography and photo settling; 600ms once-only section
  entrances; directional panel/image transition and shared tab underline. Menu
  exit and repeated input must settle correctly. Use existing Motion, CSS/WAAPI;
  no new dependencies, per-frame React updates or scroll hijacking.
  Reduced motion settles immediately; content remains readable without JavaScript.
- Footer: one controlled text marquee of the real center name, with pause/play,
  hover pause, static reduced-motion and static no-JavaScript fallbacks. 48s linear
  movement with reserved height so enhancement does not shift the footer. No
  auto-moving photo album. Grouped real address/full hours/map button,
  navigation and contact buttons below. Email/phone must be visible buttons. Home's
  redundant visit panel is consolidated here; detail visit route stays complete.
- Copy/content: concrete names and facts, no “마포”/“Mapo” or “센터 한쪽”; no invented
  events, dates, stock, claims, prices or social proof. Seven genuine photographs.
- Preserve existing code/untracked web/, bilingual SEO, font subsets/OFL, vendored SVG
  and MIT provenance, preview noindex, disabled workflow. No backend/DB/actions/
  production deployment or remote tunnel.
- Verify with actual browser interaction, complete route/locale/theme/viewport
  matrix and independent rendered review. Old build/tests are historical evidence.

## Earlier revision contract (superseded by craft revision)

This section supersedes the historical first-candidate contract below. The owner
rejected excessive whitespace, diagonal composition, tiny text, weak links and
footer, barely visible motion and generic copy. This is an authorized revision,
not a fresh discovery/approval round. Final owner approval is still pending.

- Reference: actual `/Users/max/saturdayblock-web` public components. Reuse its
  regular grids, closely grouped information, pill actions, four-column footer,
  150–300ms control feedback and 400–600ms staged entrances. Preserve the center's
  photography and orange/blue light/dark identity. No reference assets or backend.
- Layout: 80rem maximum including 20–48px gutters; 24–32px column gaps; section
  padding 40px on mobile, up to 64px on desktop. Equal adjacent media frames,
  no offsets, narrow floating images, arbitrary alternate alignments or empty
  grid columns. Home about/goods previews use the same two-column anatomy.
  Detail pages retain full-width documentary images and practical information.
- Hero: center name, concrete introductory copy, visit and program buttons,
  one substantial lounge photograph and useful station/hours information.
  Desktop heading/intro align in a regular two-column grid; mobile stacks.
- Type: Pretendard remains the actual local font. Masthead 40–72px, headings
  28–44px, body 16–18px, small copy 16px, captions/navigation 14–15px. Headings
  semibold; Korean keep-all. Do not copy the reference's 10–12px labels.
- Geometry: media radius 12px, grouped panels 16px, action pills. Icon controls
  remain at least 44px, normal actions 48px. Use one shared token per role.
- Programs: compact horizontal selection above an image and readable detail
  panel, instead of a tall image beside two lonely labels. Preserve arrow-key,
  Home/End, selected and focus behavior.
- Experience: equal columns and equal 4:3 frames; captions start on one baseline.
  Responsive `sizes` accounts for cover scaling. The genuine wallet photo stays.
- Journal: fixed 5.5rem category column, 16px title gap, flexible title and arrow;
  mobile category/title group in the same column. No expanding blank spacer.
- Visit: address, hours and contact form clear groups. Email/telephone/map are
  explicit buttons. Footer uses brand, navigation, visit and contact columns on
  a secondary surface, then a copyright/back-to-top row. All links work.
- Motion: staged hero entrance, one viewport entrance per section, tab-panel
  transition, menu opening and button feedback. 20–24px travel and 500–600ms
  deceleration. Native IntersectionObserver/Web Animations is sufficient for
  section entrances; content is visible without JS. Reduced motion disables
  entrances/transforms/smooth scrolling. No continuous decoration or loading gate.
- Navigation: Next's documented `data-scroll-behavior="smooth"` HTML attribute
  lets route transitions begin at 0 while explicit hash navigation stays smooth.
  No global scroll reset, arbitrary timer or behavior hidden in the header.
- Copy: straightforward names and real descriptions. Remove “마포”/“Mapo” and
  “센터 한쪽” from public content, preserve the real street/floor/map destination.
  No invented dates, stock, prices, testimonials or service promises.
- Preserve bilingual routes, font subsets/licenses, local SVG sources, preview
  noindex, existing files and disabled deployment workflow. Public design only.
- Verify the owner's specific complaints visually, along with the complete
  route/locale/theme/viewport set. Old scores are not this revision's acceptance.

## Historical first-candidate contract (superseded where it conflicts)

Status: design candidate, not the owner's final visual approval.

## 0. Research log

- Owner brief: a real-space documentary, cinematic but understated, with the
  spacing and presentation of a gallery. Warmth comes from real people, materials
  and activity. Clearly explain the center and help people want to visit.
- Four content pillars: meetups, exhibitions, education and merchandise.
- Light is the default; dark mode and Korean/English routes are required.
- Primary craft guidance: `design-taste-frontend`, Impeccable `frontend-design`,
  `animate`, and the frontend router's interaction and accessibility guidance.
- Runway is a composition reference only: a substantial photographic frame,
  broad typography and deliberate space between stories. Its platform copy,
  brand palette, banner density and technology imagery are not center content.
- Lazyweb was queried for museum/gallery/cultural-venue desktop references.
  Research candidates include Museum of Architecture in Wroclaw. Use their
  restrained editorial hierarchy as reference, not their photographs.
- StyleGallery `page-grid` and `frame` were reviewed for section-owned layout,
  responsive composition and explicit media geometry.
- beui `shared-layout-bg` was read for a continuous selected-state transition.
  Adapt the interaction, not its dark slate palette or pill styling.
- The owner's `enzomanuelmangano/demos` reference is a React Native/Expo
  workspace under its own Software License Agreement, NOT MIT. The earlier
  license description was wrong (see handoff §4.5). Reuse no source code;
  independently implement quiet state transitions with existing web primitives.
  The original asset and motion research task IDs are `st_01a07fbc` and
  `st_01a07fbf`; their completed research is distinct from implementation status.
- Image generation was attempted twice, with and without explicit size/quality.
  Both failed with `400 Argument not supported: size`. Continue with verified
  center photographs and rendered browser evidence rather than invented assets.
- No GitHub Actions is permitted. Design and security checks run locally.

## 1. Audience and first job

First-time local and international visitors should understand what this center
is, see the space and its activities, and find a reason and practical way to
visit. Program and merchandise information supports that goal.

## 2. Visual language

Use an image-led editorial composition. A generous masthead and a cinematic
frame introduce the real place; later sections use different scales and
relationships rather than repeating equal cards.

The gallery character belongs in spacing, captions, image treatment and careful
typography. People and activity must remain visible. Avoid harsh condensed
headlines, sentimental slogans, fake metrics, badge clusters, default bento
grids, glass panels, gradients and decorative 3D coins.

Use existing factual center copy and program categories for the first preview.
Do not invent future events, dates, prices, inventory, testimonials or enrollment.
New campaign copy and final photography remain subject to owner review.

## 3. Color tokens

These first-candidate accent values are visually matched to the supplied small
logo, not claimed as exact pixel samples. Final vector/icon files will follow.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| canvas | `#fafaf8` | `#171917` | Main page |
| surface | `#f0f1ec` | `#222521` | Quiet secondary planes |
| ink | `#20211f` | `#f0f1eb` | Primary text |
| muted | `#62675f` | `#acb2a7` | Supporting text |
| line | `#d8dcd3` | `#3c4238` | Rules and boundaries |
| orange | `#ff6b0a` | `#ff8a40` | Brand punctuation |
| blue | `#6c9fd8` | `#8db8ea` | Wayfinding and selected details |
| blue-ink | `#32699f` | `#a4c8ed` | Accessible blue text |
| focus | `var(--blue-ink)` | `var(--blue-ink)` | Keyboard focus and progress |

Large bright color fields are not the main composition. Primary actions should
have strong contrast; do not put small white text on the orange token.

## 4. Typography

- Current display and body: Pretendard for Korean and English, following the
  owner's font direction. The whole visual design remains a candidate.
- Compare actual Korean and English at `/ko/design-system` and
  `/en/design-system`; Manrope/Noto are comparison-only alternatives. Record font
  licenses, local loading and recommendation in `docs/design/type-icons-2026-09-08.md`.
- Serve official Pretendard v1.3.9 dynamic Unicode subsets locally using native
  CSS font faces. Do not load the complete 2MB variable file on public pages.
  Comparison-only Manrope/Noto use self-hosted `next/font` build output.
- Korean uses `word-break: keep-all`; avoid stretched or condensed letterforms.
- Public masthead: `--text-masthead`, desktop
  `clamp(3.5rem, 8.2vw, 8rem)` and below 768px
  `clamp(2.375rem, 9.4vw, 4rem)`, weight 500, line-height 1.2.
  Keep the name and opening information visible on a 1280 by 800 laptop.
- Specimen display: `--text-display`, desktop
  `clamp(3.25rem, 7.4vw, 7.5rem)`, mobile `clamp(2.5rem, 9.5vw, 4rem)`.
- A nonbreaking space may join a Korean auxiliary phrase such as
  `볼 수 있어요` when natural language grouping would otherwise break. Keep
  copy and type size intact; do not use global nowrap on paragraphs.
- Section headings: fluid 32-64 px, weight 500, line-height 1.1-1.2.
- Body: 16-18 px, line-height 1.65-1.8.
- Navigation and captions: at least 13 px; no unreadable diagnostic-style text.

## 5. Layout and media geometry

- One document scroll owner. No fixed-height page shell, scroll hijacking or
  nested vertical scrolling regions.
- Main content maximum width around 1440 px. Desktop gutters 48-64 px; mobile
  gutters 20-24 px. Section gaps 88-144 px, reduced on mobile.
- Every region owns its columns. No global three-column card rule.
- Hero media is wide and substantial but does not hide the first action on a
  small laptop. Images have explicit aspect ratios or dimensions before loading.
- Space: one dominant image with a smaller supporting detail/caption.
- Programs: an editorial list with a related image/detail pane, not equal cards.
- Exhibitions: object/experience imagery with quieter captions and close detail.
- Merchandise: a photographic preview, without invented products or prices.
- Visit: practical location/hours/contact information, visible without a modal.
- Use static imports and responsive `next/image` sizes for verified local photos.
  Record actual source files and crop decisions before final visual approval.
- Image `sizes` must account for the painted cover image, including the crop.
  A landscape 16:9 source filling a 4:5 frame needs about 2.22 times the frame
  width; the portrait specimen requests 205vw on mobile and 75vw on desktop.
  The mobile 4:3 hero/about/goods frames request 125vw for their landscape
  sources. DPR1/2 decoded-pixel checks protect these choices from blurry crops.
- Small screens get a composed single-column reading order and their own image
  crops. Essential navigation, language and theme controls remain available.

### Verified existing asset shortlist

All paths below are relative to the repository root, outside `web/`.

| Asset | Dimensions | Role and crop |
| --- | --- | --- |
| `public/images/what-we-do/lounge.jpeg` | 5712×3213 | Hero; preserve artwork, couch and blue window |
| `public/images/what-we-do/community.jpg` | 2880×2160 | Community and learning; faces remain in frame |
| `public/images/highlights/events/bitcoin-protocol-course-3-2026-05-17.jpg` | 2880×2160 | Education alternative; avoid duplicate scene beside community |
| `public/images/what-we-do/experience.jpeg` | 1488×1488 | Actual wallet experience zone |
| `public/images/what-we-do/exhibition.jpeg` | 5652×3179 | Book exhibition, not hardware wallets |
| `public/images/what-we-do/gallery.jpeg` | 3989×2244 | Artwork and cultural objects |
| `public/images/what-we-do/retail.jpeg` | 4032×2268 | Goods area; visible labels are not current prices or inventory |

The existing hero video is
`https://bitcoin-center-seoul.s3.ap-northeast-2.amazonaws.com/BCS_480p.mov`.
Prior ffprobe evidence: 640×360, about 120 seconds, about 55 MB. It is not a
short high-resolution hero film. Use the verified still photograph for this
candidate; request a short new space film before adopting video. `main0`–`main3`
are illustration layers, and the earlier `main4`/`main5` and node/wallet paths
were missing. Photograph rights and participant permissions await owner review.

`public/logo.svg` is the old wordmark, not the supplied orange/blue tower-B mark.
Use a typographic name in this candidate until the final logo/icon file is
available; do not pass an old or invented logo off as the supplied identity.

## 6. Component and ownership plan

The server page owns factual content, metadata and section order. Client code is
limited to navigation disclosure, theme switching, selected program details,
media playback and the chosen motion treatment.

Shared primitives are semantic section frames, text/action styles and media
frames used in more than one place. Do not create a general page-builder system
or a wrapper for each line of markup.

A temporary `/[locale]/design-system` page should show typography, both themes,
button/link states, media crops, selected controls and responsive spacing before
composing the home page. This page is a local design specimen, not a public route
to advertise.

## 7. Motion and interaction

- One signature move: a gentle photographic shift or frame transition that
  supports moving through the space. Do not animate every section differently.
- Controls respond immediately. Use short, quiet transitions around 160-260 ms;
  larger image changes may use 400-600 ms with a consistent deceleration.
- Prefer transform and opacity; preserve readable server-rendered content.
- Native scrolling, standard keyboard behavior, visible focus and at least
  44 px touch targets for icon controls.
- Selected program state must work through pointer and keyboard, not hover only.
- Reduced motion removes automatic movement and autoplay; essential information
  and manual controls remain available.
- Autoplay video, if used, must be muted, pausable and stopped offscreen.
- No mandatory intro, artificial loading delay, decorative cursor, particle field
  or animation that blocks a visitor's next action.

## 8. Fidelity contract

- Preserve the composition's large photographic focal region, broad
  medium-weight type, gallery-like breathing room and clearly different section
  rhythms.
- Keep the logo-derived orange/blue palette as accents in both themes.
- Use real center photographs. Generated concept images, unrelated architecture
  and reference-site screenshots must not become center assets.
- Keep every control functional within this preview or link to a real existing
  destination. Do not present inactive booking/checkout controls as working.
- The preview remains noindex until an explicitly approved public release.
- Capture and review Korean/English, light/dark, desktop/mobile, menu/selected
  states and reduced motion. Report limitations rather than claiming a grade
  without observing the rendered page.

## 9. Local quality gates

Run diagnostics, type checking, lint, browser tests, build and dependency review.
Use React Doctor and inspect layout/paint/rendering behavior when code exists.
React Grab and React Scan are development-only tools and must not run in the
production build. No GitHub Actions, workflow generation, deployment or live
backend mutation is part of the first candidate.

## 10. Resume implementation contract (2026-09-08)

- Design read: a welcoming cultural space for first-time Korean and overseas
  visitors. Editorial photography, near-white canvas, orange/blue wayfinding.
  Taste dials: variance 7, motion 4, density 3. Existing research is reused;
  this is a resumed candidate, not a new research or style-approval round.
- Home hierarchy: masthead → lounge photo → center introduction → programs →
  exhibition/experience → activity record → goods → practical visit information.
  Six section routes use `about`, `programs`, `experience`, `journal`, `goods`,
  `visit` under each locale. These preview slugs do not rename legacy URLs.
- Shared pieces: `SiteHeader`/`SiteFooter` for wayfinding, `CenterPhoto` for
  static images with actual alt text/focal positions, `SectionFrame`/`MediaFrame`
  for semantic framing, and existing buttons/theme/menu/selection controls.
  Server components own copy and SEO. Client code only owns interactions.
- Header: a typographic center name until the supplied vector arrives; one-row
  desktop navigation, disclosure on narrow screens, always-visible locale/theme.
  Navigation has focus/hover/current states, Escape closes disclosure and returns
  focus, and all six destinations remain available with keyboard or touch.
- Hero type token `--text-masthead`: `clamp(3.5rem, 8.2vw, 8rem)`, medium weight.
  Use `--text-display` for locale titles. Hero photo ratio 21:9 on desktop and
  4:3 on mobile, with an intentional crop. `--ratio-square`: 1/1 for objects.
  Hero frame max height token `--hero-height`: 36rem. No overlays obscure art.
- Additional motion tokens: `--duration-image: 500ms`, `--duration-reveal: 650ms`,
  `--photo-scale: 1.025`. The photo's single arrival settles into its frame;
  image-link hovers signal an available destination. Reduced motion turns off
  these transforms and smooth scrolling. No hidden-until-JS content.
- Page composition: 90rem maximum, existing 4px spacing scale and fluid gutters.
  Home introduces each distinct area; detail pages use photographs with concise
  supporting text. No checkout/booking simulation and no invented event feed.
- SEO uses server title/description, canonical/hreflang and real local images
  for sharing. Preview remains noindex with robots blocking. Sitemap describes
  candidate URLs only, excludes design-system/dev tools, and needs release review.
- Accepted stage limits: final logo/favicon pending supplied files; no live
  programs/inventory; photo rights/operating details/new copy await owner review;
  short high-resolution video and entry/access photography need a new shoot.
- Accessibility: native scroll, semantic headings, contrast in both themes,
  44–48px controls, Korean keep-all wrapping, no horizontal page overflow,
  functional content when motion is reduced or JavaScript is unavailable.
- Directory ownership: app = routing/metadata; content = bilingual factual
  data/static assets; components/site = public layouts; controls/ui = reusable
  behavior and primitives; styles = shared tokens/controls/site composition.
  Do not introduce empty backend/service/repository folders during this stage.
- Icon source library: retain the complete licensed Heroicons/Tailwind and
  Bootstrap collections under `assets/icons/`, outside the public directory.
  Controls use the current Lucide outline family. When selecting a library SVG,
  preserve its native viewBox/fill/stroke and use shared size/color tokens.
  Provenance, pinned versions, licenses and checks live beside the originals.

## Final polish from rendered review
The English journal category uses88px to keep Education whole; mobile heading rows may wrap the related action to preserve meaningful title lines. The goods caption uses the same1/2 division and40px gutter as the journal. User's horizontal photograph album idea remains review-only and is not implemented.

## Owner review overrides — events-only, 2026-09-09
The supplied center branding and latest spacing/type tokens are implemented. Public content comes from the copied real SQLite event/highlight records. Home shows the three latest highlights as photo cards; detail photos appear below the title before the date and body, with no separate photo section label or trailing generic highlight label. The footer has no marquee and uses email, phone, X and Instagram icon links plus an icon-only back-to-top action. Navigation and contact links emphasize text color without underlines or filled active backgrounds; keyboard focus remains visible. Public pages stay bilingual, admin stays Korean-only. Earlier commerce and pending-branding notes above are historical.

Owner refinement: primary action fills are muted warm gray-green, with dark text in both themes. Footer contact has a visible 문의하기/Contact heading and four circular outlined icons. Detail galleries use one reading-width column with uncropped images, superseding the older two-column note. Administrators can choose a URL slug; numeric and old slug links redirect to the current canonical path.

Latest owner refinements: the footer uses a centered compact three-column grid, contact icons and a collaboration email link. Back-to-top floats at the lower right after scrolling and fades away at the top. Journal pagination uses a muted filled circle; the next listing/detail fades in without vertical entrance movement. Card hover lifts4px with a restrained image shadow; reduced motion disables transforms. Public notices reuse the same typography, layout and footer; the Korean-only administrator can publish or save privately. The address includes Mapo-gu.

Navigation correction, 2026-09-09: content links start native Next.js navigation immediately, keeping the outgoing page at its reading position while the destination loads. Next.js positions the new page on arrival; there is no pre-navigation scroll animation or timer. Retain the existing opacity fade, reduced-motion fallback, locale/SEO behavior, ordinary new-tab links and native back/forward scroll restoration. The floating back-to-top remains a separate explicit action.

## Owner refinement — fields and spacing, 2026-09-10

- Text, password, URL and textarea controls share a `FormControl` wrapper. Keep semantic inputs, labels, validation, autocomplete and textarea resizing; their visible appearance is owned by the site. The later custom-control contract below supersedes earlier native picker and checkbox appearance decisions.
- Focus draws a 2px `--focus` underline from the lower center toward both sides with `scaleX(0 → 1)`, using the existing 240ms control duration and ease-out curve. Blur retracts it. The neutral border stays stationary; there is no whole-field outline flash or layout movement. Pointer and keyboard focus receive the same visible indicator. Reduced motion displays the final line immediately. Forced colors uses the native full focus outline instead.
- One-line fields and ordinary buttons share the existing 48px minimum control height, 16px text, 1.5 line height, 8px corners and border-aware padding. Multiline buttons may grow for text zoom.
- Shared section padding decreases from 40–64px to 32–48px. Heading-to-content gaps are 24px. Remove larger-screen vertical padding inflation, reduce the hero-to-program gap, tighten journal introductions and the program catalog boundary, and use 32px/48px admin page insets with 24px below the title. Preserve body line height, photo sizes, accessible touch targets and responsive wrapping.
- Program tabs indicate selection by text color, without the former blue underline. The full-width header remains the navigation treatment for this increment; a floating bar is still a design consideration, not an approved replacement.

Standalone administrator sign-in refinement: center the login form horizontally within the page and center its page heading. Keep the existing form width, compact top spacing and left-aligned field labels; authenticated workspaces and inline session reauthentication keep their existing layout.

## Owner refinements — publishing and wayfinding, 2026-09-10

- Scale the supplied header wordmark proportionally to 32px on mobile and 40px from 768px, using the existing spacing tokens. Preserve its intrinsic aspect ratio, light/dark assets and accessible home link.
- Remove repeated visit CTA buttons from the home hero and all section bodies. Public Korean copy calls the reading space `서재`.
- Visit information uses three aligned definition groups: address, hours and contact. Use the existing canvas with top/bottom rules, 32px vertical insets and 32px column gaps instead of an oversized filled panel. Desktop uses three columns, tablet places the address over two columns, and mobile stacks the groups. Labels share caption styling; address and opening time share the title size. Contact targets remain 48px tall.
- Journal pagination shows every number when there are at most seven pages, otherwise first/last and neighboring pages with ellipses. A labeled native number field and submit action allow direct page entry, with the current/total page count visible. Reuse the shared 48px controls, focus underline and native Next.js form navigation; do not scroll the outgoing page before navigation. Invalid numbers use native validation and the existing server URL normalization. Reduced-motion behavior stays unchanged.
- Event, highlight and notice bodies support CommonMark headings, emphasis, lists, quotes, links, code and trusted local images. Render on the server with a maintained parser; headings start at h2, existing single line breaks survive, and code blocks scroll within the reading column. Raw HTML stays escaped; unsafe links and untrusted image paths are rejected. Cards and metadata use plain text extracted from the same Markdown grammar. Admin fields include concise Korean syntax help; no new editor mode or preview is introduced.
- Event, highlight and notice details use one centered reading column for the title, gallery, metadata and body. The back link follows the outer page's left edge, per the later owner correction. Keep the existing reading measure and uncropped image behavior; do not center-align paragraph text. Add up to ten administrator-authored hashtags of at most 30 characters each, as wrapping non-interactive text chips using the existing surface, caption, spacing and radius tokens. Store tags through additive SQLite columns with empty defaults; retain all existing content.
- Language selection follows explicit /ko or /en URLs, then the remembered language choice, then browser Accept-Language, then Korean. Keep the functional locale preference for one year. Country/IP location does not determine language; canonical/hreflang URLs remain explicit and stable, and admin content remains Korean.
- The shared Markdown editor has a 48px photo attachment button and supports dropping JPEG/PNG/WebP files onto the text field. Reuse the existing validated upload endpoint and limits. Insert uploaded image syntax at the writing position, preserve text typed during upload, and show busy/error feedback; block saving while attachments are pending. Inline photos stay between their surrounding paragraphs and are not automatically duplicated in the cover gallery. Images fit the centered reading column with their original proportions. Keep shared input focus and reduced-motion behavior, with no extra outer panel.
- The program catalog groups upcoming and past events by date in a server-rendered timeline. Within each date, compact rows prioritize time, title and location, with a small real event photo on the right. A calendar in the right desktop column marks dates with events; month controls explore the available date range and selecting a date smoothly moves focus to that group. Calendar sits above the list on narrow screens, uses native accessible controls and localized date labels, and respects reduced motion. Normalize legacy dotted dates without dropping records. The reference supplies this grouping/navigation pattern only; retain the center's current tokens and do not invent prices, availability or booking behavior.
- Visible form controls use site-owned components throughout. Date entry is a labeled text field with ISO-date validation and a calendar button opening the same custom Calendar used for event exploration. Calendar month navigation uses buttons, without operating-system select/date popups. Checkbox and radio marks have a shared custom appearance while preserving input semantics, native keyboard operation and form submission. Number fields hide platform spinners. Uploads use the shared button and a hidden file input; selecting files still invokes the browser's required file chooser.
- Date selection and deletion/discard confirmation share a styled modal Dialog: canvas surface, existing border/radius/shadow, 48px buttons, constrained viewport width and scrollable content. Opening and closing fade/scale using the existing 240ms control timing; reduced motion settles immediately. Focus stays in the modal, Escape cancels and closing restores focus. Destructive actions require explicit confirmation with initial focus on cancel. Browser refresh/tab-close protection remains browser-managed to preserve unsaved work. No unused dropdown abstraction is introduced where no select exists.
- Custom choice marks adapt the beui checkbox state mechanism (mark scales/fades into the checked state) using existing CSS timing rather than importing its component. Neutral border, focus underline and focus outline tokens remain consistent across controls; forced-colors mode retains a visible checked state and outline.
- Footer uses four desktop columns: visit, center navigation, shop/meetups and contact. The new column links directly to the owner-provided Saturday Block center merchandise and meetup registration pages; no commerce flow is added locally. Use existing text-link color feedback and arrow icons. At tablet widths use two balanced columns, stacking on mobile; retain consistent heading baselines, 48px targets and the existing spacing tokens.
- The four footer groups span the full footer container, aligned with both ends of its bottom divider. There is no narrower inner content cap; desktop columns distribute the extra width between groups.
- Native smooth scrolling applies to deliberate hash targets only. The back-to-top and calendar controls explicitly request smooth scrolling with an instant reduced-motion fallback. Ordinary route resets and input focusing use the browser default, preventing an unfinished smooth scroll from resuming after pagination changes the page.
- Journal cards keep ink-colored titles and muted reading links in both rest and hover states. The owner rejected the repeated blue text emphasis, including on hover. Existing lift, photo shadow and arrow movement provide feedback; keyboard focus remains visibly outlined.
- Center the page-jump number within the existing 48px field.
- Program events retain their date groups but use individual surface-colored cards, neutral borders, small resting shadows and the existing 4px hover lift. Light mode uses the shared gray-green surface; dark mode uses the dark surface and black shadows. Preserve compact mobile rows and reduced-motion behavior.
- Clicking a calendar's month/year heading opens a centered year field and a three-column grid of twelve months. Use the shared 48px controls and control-duration fade, with immediate reduced-motion states. Keep previous/next month arrows, enforce the available month range, and allow incomplete year drafts without changing the selected date. Escape closes this picker before an enclosing date dialog; browsing months does not dirty an admin form.
- The visit page replaces the address group's Google Maps button with the verified center Google Maps share iframe, directly below the address note. Desktop uses a wider address/map column and a narrower column stacking hours and contact, in a 3:2 ratio. On tablets the map spans both columns above hours/contact; mobile stacks all groups. Use the page locale for map language, a responsive 288–384px height within existing tokens, rounded corners and lazy loading. The footer omits the map button, following the owner's later cleanup request. Do not add an API key or geolocation; the parent CSP permits only Google's map embed endpoint for frames, including when visitors arrive through client navigation.

- Activity-record cards now share the program cards' surface, border, radius and shadow tokens. Keep the large-photo vertical anatomy on home and journal: the photo fills the card's top edge, copy has 20px desktop / 16px mobile padding, and reading actions align at the bottom of each row. Apply the existing hover lift and shadow to the complete card, preserving neutral text, keyboard focus and reduced motion.

## Owner refinement — collection and layout, 2026-09-10

- Public copy uses `도서` instead of `책`; the collection is `도서·작품` (`Books & art`). It has a bilingual `/collection` index and centered individual detail pages. Link from the existing exhibition plate and footer; the main navigation stays compact under 전시·체험.
- The collection is an image-first gallery: three columns on desktop, two on tablet, one on narrow screens. Shared surface, panel radius, line, shadow and spacing tokens frame every item. A consistent portrait display area contains the entire cover/artwork with neutral padding; no cropping or tinting. Below it, show category, title and author/artist. Each card opens its detail page with complete images and Markdown description. Reuse content-link navigation, hover/focus lift, and reduced-motion handling.
- Reuse SelectionTabs for 전체/도서/작품 filtering, with site-owned 48px targets and visible selected/focus states. Empty collections show a factual empty message, without invented holdings or placeholder artwork. Korean fallback is explicit when English content is missing.
- Collection filter labels are centered within their 80px-minimum, 48px-high controls. Selected labels retain action-ink on hover for readable contrast in both themes. The empty-state message spans the collection width, is centered between the filter divider and a matching full-width bottom divider, and does not inherit the short paragraph measure or add another top border. The existing 24px panel gap provides its upper spacing; match it below the message.
- The Korean admin uses existing sign-in/session controls, shared form fields, choice controls, image uploads, Markdown editor and confirmation dialogs. Register category, title, author/artist, description, images, display order and publication status, with optional English fields. Drafts are private by default and need a cover before publication. Persist in an additive SQLite table; reuse image validation and same-origin/admin checks. No catalog data or image rights are invented.
- Home introduces classes and meetups together with one real program photo, one combined factual description and one `행사 일정 보기` / `View event schedule` text link using ArrowRight. Remove the education/meetup tabs and duplicate actions. The program page places its actual date-grouped event list and calendar immediately after its existing heading and introduction, without the redundant photographic introduction. Preserve gallery spacing, responsive columns and reduced-motion-safe section entrances.
- Visit layout: a square Google map occupies the left column, with address, hours and contact stacked on the right. Use balanced equal columns and existing spacing. Labels use the existing subheading size and ink color rather than small muted captions. Narrow screens stack the square map and facts; no iframe overflow or duplicate map button.
- Journal's direct page input is 64px wide (space-16), retaining the shared 48px height and centered number. Its maximum page validation remains unchanged.
- Footer's shop/meetup link group is titled `참여하기` / `Get involved`. Activity-card reading actions are `자세히 보기` / `View details`; the home section-level journal link stays descriptive.
- Home sections and both desktop/mobile navigation place journal before exhibition/experience: programs → journal → experience. Keep existing URLs, section IDs, shared motion and content intact.
- The owner selected the public name `현장 스케치` (English `Highlights`), replacing `활동 기록` consistently in navigation, headings, empty states, pagination labels and return links. The established `/journal` URLs remain unchanged.
- Both exhibition actions use the same text-link primitive and ArrowRight icon: collection browsing and the internal wallet guide. Match target height, text, margin and arrow motion without the guide's former bordered-button treatment.
- Wallet guide step actions align as a group to the right edge of the panel content in every step, including wrapped mobile rows. Preserve the previous/next order and the shared button sizes, gaps and keyboard behavior. Hide the floating back-to-top on this guided route so it cannot cover step actions while scrolling; existing step-heading focus and restart remain available.
- Header operating status sits immediately before the language control: a space-2 dot and text, without another filled pill. States are `운영 중 / Open`, `밋업 중 / In session`, and `운영 종료 / Closed`; dot colors reuse success, orange and muted. Text stays ink/muted for contrast. Compact mobile labels can wrap at spaces inside a 64px target; all controls retain 48px height. Collapse desktop navigation before controls collide.
- Status is computed on the server in Asia/Seoul: open daily, including Sundays, from 12:00 until 20:00; Korean public holidays, substitute holidays and declared temporary holidays are closed. Published holiday data is supplied server-side by `@hyunbinseo/holidays-kr`; unknown calendar years or unavailable data must not claim open. The initial server render includes the actual status; clients refresh at the next time boundary, every minute while visible, and on visibility/focus. Visitor timezone and clock do not determine operating status.
- Registered meetup start/end times take precedence over ordinary opening hours on eligible operating dates, including before noon, after 20:00 and across midnight. An overnight meetup retains its starting date's eligibility; an explicit current-day closure still takes priority. Equal, missing or ambiguous time ranges do not imply a meetup. Admin time guidance explains the format and next-day end rule.
- The existing authenticated admin offers today's `자동 / 정상 운영 / 임시 휴무` exception. Normal operation enables ordinary hours and meetups on a holiday; it does not mean open for 24 hours. Temporary closure also suppresses meetups. Exceptions are stored by Seoul date so an overnight holiday exception survives midnight, while the following day's ordinary hours revert to automatic policy. No weekly Sunday closure or manual forced meetup state exists.
- Motion reference: https://beui.dev/r/animated-badge/raw (read 2026-09-10), adapting keyed label changes and reduced-motion gating only. State text fades in over duration-control; an open/event dot emits one scale/opacity ring over duration-reveal when the state changes. No continuous pulse or spatial label jump; reduced motion is static. Reuse CSS and existing primitives, with no new dependency.
