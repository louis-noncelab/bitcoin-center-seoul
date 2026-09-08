# BCS English home follow-up — regenerated frames

**Original-blocker result:** PASS

**Overall recommendation:** REQUEST_CHANGES until the footer repair has fresh
captures and the final manifest is regenerated.

## Evidence inspected

I opened each of the six PNGs separately with `view_image`:

| Frame | SHA-256 |
| --- | --- |
| `en-home-light-375.png` | `38bf8415852b9b500ac33487efd9877e74fba1c1c74cdd0ef699274321c8d910` |
| `en-home-dark-375.png` | `c9fc5222bb567b281e3edeba5ea90c38715a83066e0f59270581cf66269b06c0` |
| `en-home-light-768.png` | `55fad725513497ad03169fed623240055869cec4c510bbdc953d974ecf41ef69` |
| `en-home-dark-768.png` | `85a7f4f8736fc3582f07a8aa71150e8741db2018cabc4c29abf92057d13bddfa` |
| `en-home-light-1280.png` | `e76c54cf4b76685f20530114b5d4eed931d7f3bb4717e5e85fe3e48ec3a6976c` |
| `en-home-dark-1280.png` | `7bf73bed818fe9fec2997151e76251d23b899f9c4ff131f1a033603828c38cff` |

They are valid RGB PNGs: 375×4881, 768×3297, and 1280×3985 for each theme.
Their write times run from 20:41:49 through 20:42:04 KST.

The current Git HEAD is `fd7c472d856a257a77bf66766163b3f245a8757f`.
Relevant current source hashes are:

| Source | SHA-256 | Capture relationship |
| --- | --- | --- |
| `web/src/styles/site.css` | `9e025299fdc0a4cdf393461806ffa108ade353ab40d5eb5b117be5db5e3bd3d8` | 20:39 KST; present before these captures |
| `web/src/styles/site-sections.css` | `898c9c00d2671ec9618e1382898258d1fe339c06f9355628c46ed850ce976531` | 20:39 KST; present before these captures |
| `web/src/components/site/home.tsx` | `ff33829d924a3b55793d76905729fd7c03d5eee52501707d67b75ec0881d3754` | 20:39 KST; present before these captures |
| `web/src/components/site/site-footer.tsx` | `a864c5fa8238bfa0477c1813f0c6d898bb7e075ebea049b175d59e459e9e0da5` | 20:39 KST; present before these captures |
| `web/src/styles/footer.css` | `e6287b64cf2379b814ea3053dc9502e269198cc3f2b23312adee612c95159128` | modified at 20:48 KST, after these captures |

`final/source-manifest.json` is stale: it still identifies build
`NzQQpR_UFZ019chp0Cnef` and the preceding source fingerprint rather than the
reported `SCErnVblQFcknPRkL-fPQ` build. The following static verdict is therefore
bound to the six image hashes above, not to the stale manifest or to the newer
footer source.

## Targeted verification

- **Journal category: fixed.** `Education` stays intact at 768 and 1280 in both
  themes. The relevant grid track is now `var(--space-22)` at
  `web/src/styles/site-sections.css:43-47`, restoring a readable fixed category
  column.
- **Mobile exhibition heading: fixed.** At 375, both themes now read
  `Exhibitions and` / `wallet demos`; the lone `and` is gone. The source enables
  small-screen wrapping at `web/src/styles/site.css:80-81`.
- **Home body composition: pass in the captured state.** The goods caption band
  aligns with its information/action row, all cards and CTAs retain useful
  whitespace, and no new English clipping or unnatural wrap appears in hero,
  programs, exhibitions, journal rows, or goods at 375, 768, or 1280.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

1. **[product, captured] The 768px footer Explore navigation breaks
   “Exhibition & Experience” into `Exhibition` / `&` / `Experienc` / `e` in
   both `en-home-{light,dark}-768.png`.** This is an avoidable English word
   break in a prominent navigation group. The current, post-capture source has
   the correct apparent remedy—one navigation column from 768 through 1023px
   at `web/src/styles/footer.css:86-95`—but it has not been rendered in this
   evidence set.

2. **[evidence] The six frames are stale relative to the current footer CSS and
   are not recorded by the final source manifest.** A final fidelity review
   cannot approve a source/capture pair that does not identify the same build.

### LOW

None.

## Required before approval

1. Rebuild after the footer repair and regenerate the final source manifest.
2. Freshly capture all six English home theme/viewport frames and verify the
   tablet footer’s complete labels. The footer marquee’s runtime behavior is
   deliberately outside this static review and remains root-owned.
