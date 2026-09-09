# Events-only local review implementation plan

Goal: restore the owner-selected first redesign commit, retain subsequent public visual work, and provide real event/highlight publishing with multiple images.
Architecture: Next.js public and admin routes use a small SQLite content module compatible with legacy tables. ADMIN_PASSWORD verifies login; an opaque HttpOnly cookie authenticates subsequent admin calls. Runtime settings and data remain outside Git.

## Constraints
- Base 63a08b95cb54e06d9a00c89ae14d8d9eb1851284; recovery b1cc3f81190f06fb53da668c003421f479854543.
- Keep Korean/English, light/dark, latest logo/type/spacing/header/footer and reduced-motion-safe animation.
- Only events/highlights CRUD and image galleries; no commerce, memberships or booking. Preserve root legacy application and published /walletExperence URL.
- Never read existing .env/.env.local. ADMIN_PASSWORD is runtime-only, no insecure fallback. No remote mutation or deployment. npm/Node22, existing ESLint/Playwright conventions.

## Task 1: Recovery (complete)
All 483 Git-visible changed/new/deleted files backed up in branch and independently restored bundle; 163 public/design asset files separately archived and hash checked. Confirmed production-source snapshot 14 events, 40 highlights, 48 image hashes. Owner confirmed exact reset commit; branch reset performed. Ignored runtime data preserved.

## Task 2: Content backend (complete)
Own web/src/server/events/, web/src/lib/events-contract.ts, web/src/app/api/, web/src/app/images/, web/scripts/events-* and web/tests/events-api.spec.ts. Use existing legacy schema with additive gallery relation only; preserve IDs and original fields. Public/admin API contract described in backend brief. Test unauthenticated mutations, origin, invalid payload, password compatibility, CRUD, multiple images, malicious uploads, active highlight visibility and idempotent local snapshot import. Tests must target generated local review data only.

## Task 3: Public design and content (complete)
Own existing public components/styles/content, public locale pages, new event/highlight detail pages, metadata, brand assets. Extract latest pure visual changes from backup, exclude commerce dependencies and links. Render real events at /programs and highlights at /journal, image galleries on detail pages; preserve center/about/experience/visit content. Remove /goods from public scope. Preserve light/dark, ko/en and keyboard/reduced motion.

## Task 4: Admin and integration (complete)
Coordinator owns /[locale]/admin pages and admin components/styles; password-only login, tabs for events/highlights, list/create/edit/delete and multi-file image selection/reorder/remove. Errors preserve form content. API contract uses legacy field names with images:string[]. Update package/lock, review launcher, documentation and environment sample keys.

## Task 5: Verification (complete)
Run typecheck, lint, production build and dependency audit. Run real HTTP CRUD/auth/upload tests and Playwright public/admin scenarios against loopback review instance. Capture public/detail/admin pages in ko/en, light/dark, mobile/tablet/desktop; independent visual/code reviewers inspect fresh artifacts. Record exact limitations and create local checkpoint commit only after verification.

Owner clarification: administration is Korean-only, including /en/admin; only public pages and stored public content require ko/en. CRUD means events/highlights, not administrator accounts.

## Owner refinement: editable URL slugs and softer actions (complete)
Add administrator URL slug input for events/highlights, additive SQLite slug aliases with conflict checks, canonical public routes/metadata/sitemap and redirects from numeric/former addresses. Keep numeric API IDs. Use muted warm gray-green primary actions in both themes; footer contact title and circular outlined social icons. Rebuild and verify real edit/redirect flows, then fresh visual evidence.

## Owner refinement: local wallet experience guide (complete)
Port the existing six-model bilingual test-bitcoin guide into the current design at /[locale]/experience/wallet. Preserve the legacy /walletExperence entry through local redirects. Update guide links and sitemap, test OS/model/step navigation and keyboard/reduced-motion behavior with real local QR assets. No real wallet/payment operations.

## Owner refinement: notices and content transitions (complete)
Add administrator notice draft/publish/edit/delete with separate additive SQLite tables and public listing/detail, reuse existing authentication and layout. Shared ContentLink handles smooth pagination/card navigation and opacity-only arrival; verify CSS duration units after production minification. Address includes Mapo-gu. Final checks/captures cover new notice states as well as existing public/admin/guide surfaces.

Final milestone: production build/TypeScript and ESLint pass;34feature plus27public tests pass;408screens+42motionframes verified; both independentfinalreviews pass exactfreeze8892db6865be554f131734f03d03604b01bfd2bbbe40376668cbecb6b7d4aa10. Owner subsequent DB/security/reference request remains review-only; no DBengine/authentication/design changes from that review are included.
