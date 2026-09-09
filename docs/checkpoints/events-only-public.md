# Events-only public checkpoint

Date: 2026-09-09

## Restored public design

- Official light/dark horizontal wordmarks and application icons from recovery commit `b1cc3f81190f06fb53da668c003421f479854543`.
- Pretendard typography, supplied orange/sky identity, large-screen content measure, centered navigation with active text and underline, locale path/query/hash continuity, light/dark transition, reading progress and reduced-motion-safe page motion.
- Documentary home hero and center photography, program selector, exhibition/experience content, real visit details, factual footer marquee and direct email/telephone/map links.

## Events-only behavior

- `/[locale]/programs` renders legacy event records as upcoming and past groups.
- `/[locale]/journal` and the home preview render active legacy highlights.
- `/[locale]/programs/[id]` and `/[locale]/journal/[id]` render bilingual metadata, descriptions, safe HTTP(S) source links and ordered responsive image galleries.
- Public database reads occur after Next `connection()`. Sitemap detail URLs use the same public record queries.
- Shop, goods, cart, checkout, payment, booking, accounts, notices, inquiry forms and unrelated community administration are absent from public navigation and content.

## Boundaries and remaining verification

- The public surface does not register participants, collect customer data, send email or handle payment. An existing event link only opens its original external page.
- Missing translations fall back to the Korean legacy value; no event or highlight content is fabricated.
- Local review remains blocked from indexing. Production launch, remote changes and runtime data mutation are outside this checkpoint.

## Verification at source freeze

- Focused ESLint for the public events components and browser spec passed; `git diff --check` passed.
- The coordinator's full type and lint review passed after integration with the event backend.
- The focused browser spec creates real event/highlight rows through the admin API, checks numeric detail routes, safe external links, locale continuity and the absence of commerce destinations, then removes its records.
- The first production-browser regression run passed 88 of 116 checks and exposed two public defects: English header overflow below 1280px and a mobile disclosure painted behind page content. The remaining failure was an obsolete development-only route expectation.
- After the two-declaration stacking/containing-block fix, the final compiled-CSS run printed 45/45 passes across every prior failure plus the complete motion, navigation feedback, scroll/history and skip-link suites. Playwright then retained one child worker with no browser process; it was interrupted after 5.4 minutes and reported `45 passed`, so the batch process exited 130 despite zero failed assertions.
- SEO passed against API-derived event/highlight IDs and every generated locale alternate. Removed goods and design-system routes return 404. The coordinator's independent capture matrix reported 160/160 public frames with no page errors, overflow or accessibility failures.
- The adapted image-quality suite was linted but was not included in this final browser batch.

## Subsequent owner adjustments

- Visit email/phone are native borderless icon/text links, retaining a 48px target and visible keyboard focus.
- About copy now says “홀에서는 강의와 밋업이 열립니다.” and uses “hall” in the matching English sentence.
- Active navigation no longer has a filled blue background. Its text, underline, pending feedback and keyboard focus remain; unused background-indicator measurement code was removed.

## Final owner adjustments
Recent three highlight photo cards replace the home record list. Detail images precede metadata/body, with original proportions constrained to reading width/viewport height; separate Photos heading, separator and generic trailing highlight meta label are removed. Footer X/Instagram icon links are real external anchors with accessible names and noopener/noreferrer. Marquee is removed entirely at owner request, including its component/styles and obsolete motion-only test; no-JavaScript public rendering coverage remains. Navigation feedback now wraps visible link text, preserving pending-state color/animation without an underline.
