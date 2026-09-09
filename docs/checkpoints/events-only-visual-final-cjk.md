# Events-only final visual/CJK QA — latest-review

Independent read-only pass against the owner-frozen `latest-review` capture set on 2026-09-09. The set contains all 196 required screenshots: 160 public (8 routes × 2 locales × 2 themes × 5 widths: 375/768/1280/1440/1920) and 36 admin (6 states × 2 themes × 3 widths: 375/768/1280). I inspected the grouped contact sheets and opened the narrow Korean/public and admin captures at original detail, then checked the desktop and dark/light groups for the same layout and typography conditions.

## manualQa

### surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| PUB-KO-ALL | CJK-1, VIS-1 | Public Korean routes, light/dark, 375/768/1280/1440/1920 | `node scripts/events-capture.mjs latest-review`; inspect `ko-{light,dark}-{375,768,1280,1440,1920}-{home,about,programs,experience,journal,visit}` plus `programs-25` and `journal-40` | PASS | A1, A2, A3 |
| PUB-EN-ALL | VIS-1 | Public English routes, light/dark, 375/768/1280/1440/1920 | `node scripts/events-capture.mjs latest-review`; inspect every `en-*` capture in latest-review | PASS | A1, A2, A3 |
| ADMIN-ALL | CJK-2, VIS-2 | Admin login/list/editor states, light/dark, 375/768/1280 | `node scripts/events-capture.mjs latest-review`; inspect every `admin-*` capture in latest-review | PASS | A1, A2, A3 |

The 196 scenarios above are the complete filename enumeration in artifact A1; no route, locale, theme, state, or viewport was sampled or inferred. Across all captures, headings, body copy, metadata, controls, cards, images, footer regions, and admin fields remain inside their surfaces with readable baselines. Korean phrases do not produce particle/ending or connective or auxiliary or parenthetical orphan lines; no tofu, dropped glyphs, clipped text, or detached labels were observed. The latest footer back-to-top icon is visible at the intended edge without a border/label, while the captured layout retains the full-width footer and contact icon row.

### adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-CJK-375 | CJK-1 | narrow viewport semantic wrapping | Korean display/body phrases wrap naturally without one-character, particle, ending, connective, or parenthetical orphans; no baseline clipping | PASS | A1, A2 |
| ADV-CJK-768 | CJK-1 | tablet reflow | Two-column/feature layouts reflow without semantic CJK splits, overlap, or clipped controls | PASS | A1, A2 |
| ADV-CJK-WIDE | CJK-1 | wide viewport alignment | 1280/1440/1920 layouts retain readable type, aligned grids, and complete Korean/English content | PASS | A1, A2 |
| ADV-THEME | VIS-1 | light/dark contrast and compositing | Both themes preserve text/image visibility, borders, and complete PNG compositing | PASS | A1, A2 |
| ADV-ADMIN-FORM | CJK-2 | long bilingual form content | Korean and English labels/values remain aligned; textarea scrolling is contained by the field and does not clip the form shell | PASS | A1, A2 |
| ADV-ADMIN-LIST | VIS-2 | dense list state | Long event/highlight titles and actions remain separated, readable, and within the viewport at all admin widths | PASS | A1, A2 |
| ADV-FOOTER | VIS-1 | borderless contact/back-to-top controls | Contact links and back-to-top control remain discoverable and aligned after the owner’s borderless icon change | PASS | A1, A2 |

### artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A1 | screenshot-set | Complete owner-frozen latest-review set, 196 PNGs covering every public/admin route, locale, theme, state, and required width | `docs/checkpoints/evidence/events-only/latest-review/` |
| A2 | contact-sheets | QA-generated grouped sheets used to inspect all 196 captures: Korean mobile/tablet/desktop, English, and admin | `/tmp/latest-cjk-sheets/ko-mobile.png`, `/tmp/latest-cjk-sheets/ko-tablet.png`, `/tmp/latest-cjk-sheets/ko-desktop.png`, `/tmp/latest-cjk-sheets/en-all.png`, `/tmp/latest-cjk-sheets/admin-all.png` |
| A3 | audit-json | Owner capture validation: 196 HTTP 200 results, zero errors, zero overflow, zero axe violations | `docs/checkpoints/evidence/events-only/latest-review/audit.json` |
| A4 | source-manifest | Frozen 180-file source manifest and digest bound to latest-review | `docs/checkpoints/evidence/events-only/source-freeze.json` |

## Verdict

**PASS — high confidence.** No visual readability, clipping, overflow, or semantic Korean wrapping blocker was found in the complete latest-review set. No source or runtime files were changed by this QA pass.
