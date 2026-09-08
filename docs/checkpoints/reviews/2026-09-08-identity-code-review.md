# Identity and SEO code review — 2026-09-08

**Technical review result:** `CLEAR`  
**Recommendation:** `APPROVE`  
**Scope:** frozen identity, factual copy, and preview-SEO source review. This
is not visual acceptance or a replacement for the root-owned browser run.

## Binding

- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`
- Build: `xUZ_zPOFp3V5-Q5MXcLhJ`
- Source fingerprint: `fafeca3b19d9f1e2bd6f8a01f2cb374148eb55d7c9ab7e085bd9dec3d52a8f7d`
- Verified manifest: `docs/checkpoints/evidence/identity-2026-09-08/final/source-manifest.json`

Every scoped source hash matches the manifest:

| File | SHA-256 |
| --- | --- |
| `web/DESIGN.md` | `9dde5d5e1827df92d5ff201b93d80ec2396cf3fc04174b8a721a8ba52c61dd25` |
| `web/src/components/site/home.tsx` | `3e41a60551c592870b0a5bbc5a566a3f142869c907dcbbbca5c09560f33c894b` |
| `web/src/components/site/site-header.tsx` | `f6bc5f2f4c058bed5d4279a5902d4a8537bfdefd61fcc14ecda1d30a0563c71f` |
| `web/src/styles/tokens.css` | `4f7a7bb8340be3c9310de97a65cd0955259473fe31a587bc03f10b851ca479a5` |
| `web/src/styles/site.css` | `098fb9178888c7914e16a58821c2f15a04b1347e5ef33c0ed9a9a7cdfbb84dd2` |
| `web/src/styles/navigation.css` | `0cce9cfde2fc90d8890932052bf7114b5c3684c463ddc96f5379bcbf724aad1a` |
| `web/src/styles/footer.css` | `112e2eac03a19d96f3ea212880f2c798327846da071e44850c475799ea77fd48` |
| `web/src/styles/primitives.css` | `7b480fc6ce4e2135473bbac52d35c73c7f813ec41ae0c03daa701f4ea3805f4d` |
| `web/src/styles/motion.css` | `3bc27f2c6b861ee73dc97589c27eccccb6f7647f4ba4ce521c90127db1fe3345` |
| `web/src/content/center.ts` | `03cb04f46ac4e6fc82bab392fb3ad2b3d63cc1770f2392ca715c11b4288f7a3c` |
| `web/src/content/site.ts` | `48dbb0213edbe9c4614986bb5dc752ce16047bbfe8c1604ddae697c566774e5b` |
| `web/src/app/sitemap.ts` | `c8a50b1d0db469505bae2025dd6d29f12776d8b3d2a6e4c81317c7237bd45fa7` |
| `web/src/components/seo/organization-json-ld.tsx` | `d58875affcb5dd73512ba2d3aa71571c1ebf272719b9ab76608cf1bebe12bf33` |
| `web/src/app/[locale]/page.tsx` | `2cb6405f493a1b44c9d82ab48616f785a564b412b3bb9e224d6a0010f7287d91` |
| `web/tests/seo.spec.ts` | `15406f7f1d0c250f5341d854cafb16a5dd30a4ad17fa78e9be88acb385958cb7` |

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Source audit

- The home H1 contains two semantic spans separated by a real space and remains
  one accessible heading. Header text uses the same grouping with no decorative
  period. The city uses weight, not a blue color; native wrapping can occur
  before the city, while grouped words stay intact.
- The previous individual-title-line animation was replaced with one animation
  on the H1. Reduced-motion behavior remains governed by the enclosing media
  query. Blue remains on links, selected navigation, focus/feedback, and other
  interaction states; informational icons inherit their text color.
- The new masthead token clamps to the approved 48–72px desktop range and
  40–52px mobile range. The pre-change copies in
  `docs/checkpoints/evidence/identity-2026-09-08/root-before/` match the
  reviewed root delta.
- `pageMetadata()` derives localized titles, Open Graph site name, and social
  titles from the same localized content. The About special case removes the
  prior home/About title collision while retaining exactly one brand suffix.
  Locale canonical, reciprocal hreflang, preview noindex/nofollow, and sitemap
  `x-default → ko` remain coherent.
- `OrganizationJsonLd` is a server component mounted only on the home route.
  It uses existing localized hero, URL, email, and telephone facts; serializes
  them through `JSON.stringify` and escapes `<` before insertion into the JSON
  script. It neither invents organization claims nor creates an untrusted-input
  parsing path.
- The five plain-copy edits in `center.ts` match their documented factual,
  presentation-only scope. Contact values, links, route identifiers, and visit
  facts remain the values consumed by the footer and JSON-LD.

## Tests and skill perspectives

`web/tests/seo.spec.ts` exercises rendered locale metadata, parsed JSON-LD,
visible H1/footer contact agreement, and generated sitemap entries. The tests
assert machine-consumed SEO output and observable content contracts; they are
not prose/prompt pins, tautologies, deletion-only tests, or mirrors of internal
implementation constants.

The required `omo:programming` and `omo:remove-ai-slops` perspectives were
consulted and applied. The code introduces no type escape hatch, needless
validation or normalization, dead state, speculative abstraction, or unrelated
production complexity. The small server JSON-LD component is a real rendering
boundary, not a pass-through wrapper.

I performed no browser, build, test, deployment, backend, or external action
in this read-only review. Root's current integration browser run remains the
acceptance evidence for the frozen candidate.

## Blockers

None.
