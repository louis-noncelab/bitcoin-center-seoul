# Public content and media handoff — 2026-09-08

Status: draft public copy and verified local media selection. The owner should
review operating facts and approve photo rights before this material is
published.

## Delivered contract

- `web/src/content/center.ts` exports `centerContent`, keyed by the existing
  `Locale` type (`ko | en`). Each locale includes navigation, hero, about,
  programs, experience, journal, goods and visit content.
- `web/src/content/media.ts` exports `centerMedia`. Every entry contains a
  static image import, localized alternative text, focal positions and suggested
  landscape and portrait aspect ratios.
- The existing wallet destination remains
  `https://bitcoincenterseoul.com/walletExperence`. The spelling is part of the
  published URL.
- The original production website is `https://bitcoincenterseoul.com`.

## Factual sources and review points

| Content | Repository source | Owner review before publishing |
| --- | --- | --- |
| Address, Google Maps link, 12:00–20:00 hours, holiday and private-rental caveats | `src/components/HeroSection.tsx` | Confirm the hours and rental availability still match daily operations. |
| Hongik University Station Exit 6, email and phone | `src/components/AboutSection.tsx` | Confirm the station exit, walking time, inbox and phone are still monitored. |
| Exhibition, hardware-wallet experience, education, community, lounge, gallery and retail | `src/components/ServicesSection.tsx` plus the photographs below | Confirm which activities are available without advance notice. |
| Meetup and course names | `src/components/MeetupsModal.tsx`, `src/components/EducationCoursesModal.tsx` | The new copy names categories only. Recurrence, fees, duration and enrollment claims were omitted because they may change. |
| Existing activity records | Tracked filenames under `public/images/highlights/events/` and the visually reviewed protocol-course photo | Journal labels have no dates. Confirm final captions against the activity archive before publishing detail pages. |
| Production domain | `DEPLOY.md` | Confirm the canonical host during the SEO/release review. |
| Existing wallet route | `src/App.tsx`, `src/components/ServicesSection.tsx` | Preserve or redirect this exact published path when the legacy experience moves. |

The visitor copy does not state future events, dates, prices, inventory,
capacity, enrollment status or a staff promise. The goods section describes the
photographed area without treating visible labels as current product data.

## Media manifest

All seven files are tracked originals under the repository root. They are
imported directly from `web/src/content/media.ts`; root `public/` is not assumed
to be the Next app's public directory.

| Media key and source | Dimensions | Visible subject | Crop and focal advice |
| --- | ---: | --- | --- |
| `lounge` — `public/images/what-we-do/lounge.jpeg` | 5712×3213 | Reception counter, coffee equipment, brown sofa, book rack, artworks and window seating | Use as the main still. A 21:9 desktop crop can keep the sofa and window; shift a 4:5 mobile crop toward the sofa and rack. Keep important text outside the image. |
| `community` — `public/images/what-we-do/community.jpg` | 2880×2160 | Full classroom, seated audience and presenter at right | Keep 4:3 when possible. A tighter crop must retain both presenter and audience. Do not place beside `education`; the images show the same session and room arrangement. |
| `education` — `public/images/highlights/events/bitcoin-protocol-course-3-2026-05-17.jpg` | 2880×2160 | Closer view of the protocol class, presenter, audience and numbered book display | Use as the education alternative, anchored slightly right. Prefer 4:3; a portrait crop should retain the presenter and front rows. |
| `experience` — `public/images/what-we-do/experience.jpeg` | 1488×1488 | Hardware wallets and a phone on white stands, with test-use instructions | Keep square. A wider crop can lose devices at either edge, so check all breakpoints. |
| `exhibition` — `public/images/what-we-do/exhibition.jpeg` | 5652×3179 | Numbered Bitcoin book display and a whitepaper poster | This is a book display, not a hardware-wallet image. A centered 4:5 crop around the wooden shelves removes the suitcase at right. |
| `gallery` — `public/images/what-we-do/gallery.jpeg` | 3989×2244 | Three Bitcoin-related illustrations and prints with shelf objects | Keep the full 16:9 or a restrained 3:2 crop so all three works remain visible. Reflections and wall marks become prominent under a tight crop. |
| `retail` — `public/images/what-we-do/retail.jpeg` | 4032×2268 | White shelving with Bitcoin-related objects, tools and visible labels | Use 16:9 for the full assortment or a centered 4:3 card. Do not reproduce visible price labels as current prices. |

The photographs strongly match the center interior and existing production
usage. Photographer ownership, participant releases and permission to publish
faces were not established. Resolve those rights before a public release;
`community` and `education` require particular care because participants are
recognizable.

## Excluded and pending assets

- `public/images/main0.png` through `main3.png` are illustration layers, not
  venue photographs. `main4.png` and `main5.png` do not exist.
- `public/images/what-we-do/education.png` and `coworking.png` use graphics over
  faces and were excluded from the understated documentary selection.
- The existing hero video is 640×360, about 120 seconds and roughly 55 MB. It is
  a weak fit for a large cinematic background, and its missing local poster
  would also need correction.
- The requested orange/blue B-and-tower logo file is still pending. None of the
  old logo files should be presented as that supplied mark or used to claim
  exact brand colors.

## Additional shoot needs

1. Exterior frontage, street entrance, sign and the route to the second floor.
2. Quiet candid conversation and hands-on wallet use, with explicit participant
   permission and no seed words, PINs, addresses or other wallet secrets visible.
3. Controlled-light close-ups of wallet devices, books and goods without glare
   or readable price labels that can go stale.
4. Glare-free artwork photographs and a short higher-resolution interior video
   if motion remains part of the final hero.
5. The original supplied logo as SVG or a transparent high-resolution PNG.
