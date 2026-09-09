# Events-only refined CJK/layout QA

Read-only manual review on 2026-09-09 against the owner-frozen intent in `docs/superpowers/specs/2026-09-09-events-only-design.md`. No product, runtime, source DB, or environment files were changed.

## manualQa

### surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| PUB-REFINED-CJK | CJK-1, VIS-1 | Public notice list/detail, ko/en, light/dark, 375/768/1280/3440 browser captures | Existing browser capture set `2026-09-09T01-54-44-914Z-d9aa51` reviewed directly with `view_image` at high detail; all 102 PNGs enumerated by directory listing | FAIL | R1, R2 |
| ADMIN-REFINED-CJK | CJK-2, VIS-2 | Admin list/editor, ko/en, light/dark, 375/768/1280/3440 browser captures | Same existing browser capture directory reviewed directly; all 36 admin state/viewport variants present in the 102-file set | FAIL | R1, R2 |
| WALLET-GUIDE-REFINED | CJK-1, MOTION-1 | Wallet guide states, ko/en, light/dark, 375/1280; 112 state captures | `docs/checkpoints/evidence/events-only/guide-refined/audit.json` plus every 112 PNG filename enumerated and contact sheet reviewed; motion frames opened individually | PASS | R3, R4, R5 |

The required fresh complete public/admin set is not available for this refinement: the browser captures above are timestamped 10:54, while the reviewed footer source was modified at 19:32. They cannot support a current product PASS. The available browser set also visually shows a duplicated, clipped oversized footer wordmark on the dark 1280 public list/detail family, which conflicts with the explicit “마키 전체를 제거” requirement; this remains a product finding if reproduced by the fresh run.

### adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-CJK-375 | CJK-1 | Narrow mobile semantic wrapping | Korean headings/body/metadata and English parentheticals stay readable without orphan particles, connectives, one-character lines, clipping, tofu, or detached labels | FAIL | R1, R2 |
| ADV-CJK-768 | CJK-1 | Tablet reflow | Cards, detail content, footer columns, and editor controls reflow without overlap or semantic splits | FAIL | R1, R2 |
| ADV-CJK-WIDE | CJK-1, VIS-1 | Wide reading measure and alignment | 1280/3440 layouts preserve contained content, 80rem footer measure, equal three-column footer alignment, and complete bilingual copy | FAIL | R1, R2 |
| ADV-THEME | VIS-1 | Light/dark contrast and compositing | Text, controls, borders, photos, logos, and footer remain visible in both themes | FAIL | R1, R2 |
| ADV-ADMIN-FORM | CJK-2 | Long bilingual editor content | Korean-only admin labels and bilingual stored fields remain contained at mobile and desktop widths | FAIL | R1, R2 |
| ADV-ADMIN-LIST | VIS-2 | Dense admin list and pagination | Long titles/actions remain separated; current page uses gray circular treatment without blue underline | FAIL | R1, R2 |
| ADV-FOOTER | VIS-1 | Footer/contact/back-to-top refinement | Footer has three equal columns, centered navigation, collaboration mailto, circular contact icons, and floating icon-only back-to-top after scroll | FAIL | R1, R2, R6 |
| ADV-REDUCED-MOTION | MOTION-1 | Reduced-motion preference | Wallet entrance and page/card transitions are suppressed while settled content remains visible | PASS | R4, R5 |

The browser and admin adversarial cases are rejected as incomplete because their captures predate the latest source and no fresh complete replacement is present. They are not marked not_applicable because the refinement directly triggers each class.

### artifactRefs

| id | kind | description | path |
|---|---|---|---|
| R1 | screenshot-set | Existing browser captures: 102 PNGs covering available public/admin list/detail/editor/popup states across ko/en, themes, and 375/768/1280/3440 widths; stale for latest source | `.omo/evidence/notices-2026-09-09/browser/2026-09-09T01-54-44-914Z-d9aa51/` |
| R2 | visual-inspection | Direct high-detail inspection and generated `/tmp` contact-sheet review of all 102 browser images; includes visible duplicated/clipped oversized footer wordmark on dark public wide capture | `/tmp/qa-public.jpg` |
| R3 | audit-json | Wallet guide refined audit: 112 states, status 200, no recorded overflow/errors/violations | `docs/checkpoints/evidence/events-only/guide-refined/audit.json` |
| R4 | screenshot-set | Wallet guide refined: 112 PNGs across ko/en, light/dark, 375/1280, model and phase states | `docs/checkpoints/evidence/events-only/guide-refined/` |
| R5 | motion-evidence | Wallet guide before/mid/settled/reduced-motion frames and audit | `docs/checkpoints/evidence/events-only/guide-refined/motion/` |
| R6 | motion-evidence | Refined activity-card rest/mid/settled frames | `docs/checkpoints/evidence/events-only/refined-motion/` |

## Verdict

**REVISE — evidence blocked.** Wallet-guide CJK/motion evidence passes. Public/admin CJK and layout cannot pass until a fresh complete capture set is produced after the latest source/build; reproduce and resolve the duplicated/clipped footer wordmark before approval.
