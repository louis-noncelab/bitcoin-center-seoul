# Editorial direction — 2026-09-08

Direction proposal, not final visual approval. Based on the four supplied manual screenshots and `revision-2026-09-08/final/public-site/ko-home-light-1280.png`. Interaction observations below are recommendations; still images cannot establish motion quality.

## Decision

Make this read like the front door of a cultural venue: a substantial name, a recognizable room, clear activities, and practical visiting information. The current page is orderly but interchangeable. Almost every section starts with a heading, explanatory sentence and pill; the repeated about/goods composition makes the middle feel longer than its information warrants. The footer repeats the preceding visit panel without creating a strong ending.

Keep SaturdayBlock's regular alignment and grouped information. Its actual `components/Footer.tsx` supplies a useful four-column desktop hierarchy; its mobile footer demonstrates compression. Do not inherit its miniature text. `BrandCoverHero.tsx` demonstrates image-state continuity; `BlockGridHero.tsx`'s ambient canvas is unrelated to finding or understanding this center.

## Hero: name and room together

Use the existing 80rem container, 48px desktop gutters and a 24px gap. At desktop, build one aligned 5/7 split: the name, introduction and actions on the left; the lounge photograph in a substantial 4:3 frame on the right. Both begin on the same top edge. The current broad image under a narrow title becomes a single composed frontispiece.

Set the Korean name deliberately on two lines: “비트코인 / 센터 서울”. Keep English line breaks natural within the same grid. Replace the orange full stop with purposeful orange on the primary visit action; keep accessible blue for selected navigation and links. No decorative eyebrow is necessary: the introduction already names education, meetups, exhibitions and wallet experience.

Put station access and operating hours in a ruled, full-width information rail immediately below. Preserve useful text rather than adding status dots or an unverified “open now”. On mobile: name → introduction → visit action and program text link → 4:3 photo → facts. Keep the action visible before the photograph. Fold the repeated short home about preview into this introduction; retain the complete about route and navigation link.

## Type and spacing

Keep Pretendard. Document one masthead token, 48px mobile to 84px desktop, weight 600, line-height 1.08; allow English to wrap rather than compressing the font. Section headings: 30/40px, 600. Item titles: 22/26px, 500. Body: 17–18px, line-height 1.65. Navigation, captions and categories: 15–16px. Retain Korean keep-all and comfortable paragraph widths.

Use 24px inside related groups, 48–64px between major sections, and 16px from photograph to caption. Preserve 12px media corners. Reserve solid, 48px actions for visiting and genuine external actions. Routine “보기” links become visibly underlined text plus an arrow with a 44px hit area.

## Three section anatomies

1. **Programs: a working selector.** Give the two category names substantial, 26px text tabs above one shared panel, with a moving underline instead of a pill container. Below, image spans seven columns; description and the real event link span five. Align the description to the image top, not the vertical middle. Category selection visibly changes the photograph and relevant information. Mobile keeps both choices visible and stacks photo before detail. Preserve all existing keyboard behavior.

2. **Exhibition and goods: documentary plates.** Keep the two equal 4:3 exhibition/wallet photographs; their captions carry the section's explanation, so remove redundant introductory copy. Each caption has a clear name, one factual sentence and only its relevant action. Give goods one landscape photograph with its heading, explanation and route link in a compact caption band underneath. This creates image-first passages without another left-copy/right-photo section. Never make a photograph look clickable unless it has a destination.

3. **Journal: a readable index.** Keep the three factual entries and ruled rows. Increase titles to 24–26px desktop; category has an 88px column, title has the flexible column, arrow has a fixed end column. Use 80–88px row height and make the whole row one link. Mobile places category above title within the same column. Add no invented dates or mismatched thumbnails.

## Ending

Merge the duplicated home visit panel into a stronger shared footer. Start with the center name at 48px desktop/32px mobile, then put address, hours and the map action before navigation. Desktop keeps four columns: brand, visit, navigation, contact. Mobile shows visit facts first, two-column navigation next, and email/telephone as readable links. Keep the copyright/back-to-top row compact. Maintain the existing light/dark surfaces; no unrelated dark promotional block.

## Motion signature and risks

Use one photographic settling gesture: hero image scale 1.035 → 1 over 600ms while the title moves 20px over 500ms. For program selection, the underline responds immediately; the incoming image travels 24px in the selection direction over 450ms while description crossfades over 180ms. Repeated input cancels the previous animation. Other sections receive one short grouped entrance, not independent word animations. Links respond in 160ms. Reduced motion makes state changes immediate; content remains visible without JavaScript.

Preserve every bilingual route, actual photograph, theme, focus state, touch target, genuine destination and SEO boundary. Check English wrapping and both themes at 375/768/1280px. Photo temperatures visibly vary: select compatible existing images first; avoid one global filter that damages skin, artwork or the blue window. Typography and composition must carry the upgrade even when motion is disabled.
