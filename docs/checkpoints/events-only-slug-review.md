# Events-only URL-slug code review

Date: 2026-09-09

## Scope

Read-only review of the URL-slug increment against the owner clarification in `docs/superpowers/specs/2026-09-09-events-only-design.md:30`. Reviewed the current working-tree diff and the slug path from shared contract through SQLite persistence, public rendering, metadata/sitemap, public links, and the admin editor. No environment file, runtime credential file, runtime database, staging area, or deployment was touched.

## Confirmed behavior

- `web/src/lib/events-contract.ts:5-8` accepts only a normalized, 100-character-or-shorter lowercase alphanumeric/hyphen slug with at least one letter; omitted/empty slugs retain numeric paths.
- `web/src/server/events/db.ts:70-78` adds only the `content_slugs` support table and its current-slug index. It leaves existing event/highlight rows and their IDs untouched.
- `web/src/server/events/index.ts:68-105,135-223` changes a slug inside the same SQLite transaction as its content update, preserves prior aliases, refuses aliases owned by another live record, and resolves numeric, current, and prior names to the record. Public highlight resolution continues to filter inactive rows at `119-132`.
- `web/src/app/[locale]/programs/[id]/page.tsx:18-34` and `web/src/app/[locale]/journal/[id]/page.tsx:18-34` calculate metadata from the canonical identifier and issue a locale-preserving 308 redirect for numeric and prior-slug paths. `web/src/app/sitemap.ts:7-28` and `web/src/components/site/events-public.tsx:85,112` publish only the current canonical URL.
- `web/src/components/events-admin/editor-fields.tsx:24-27` and `web/src/components/events-admin/record-editor.tsx:26-34` expose and submit the administrator-selected slug. The explicit `aria-label` matches the visible Korean field name used by the admin browser test. The existing admin ID routes remain numeric.

## Skill-perspective check

Ran the required `omo:programming` review, including its TypeScript reference, and the `omo:remove-ai-slops` review.

- Programming: no new untyped escape hatch, type suppression, or duplicated validation boundary was found in the slug path. Zod parses the external value once; the SQLite adapter receives the typed `EventInput`/`HighlightInput` value.
- Remove-ai-slops: no deletion-only, tautological, prompt/prose, or implementation-constant-mirroring test was found. The new tests exercise observable aliases, conflicts, rollback, inactive visibility, redirects, metadata, sitemap entries, and legacy rows. The support table and resolver are required to preserve aliases and prevent takeover; no unnecessary production extraction, parsing, or normalization was added.

Neither skill perspective finds a violation in this increment.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

None.

## Verification

- `npm run lint` passed.
- `npx tsc -p tsconfig.json --noEmit` passed.
- `git diff --check` passed.
- With the repository-supported Node `v22.23.2`, `npx playwright test --config=playwright.events.config.ts tests/events-api.spec.ts --grep 'normalizes slugs|preserves slug aliases'` passed: 2/2. The initial attempt under Node 25 failed before test code executed because the installed `better-sqlite3` binary targets Node 22; this is the documented Node-version mismatch, not a slug behavior failure.
- The coordinator owns the pending rebuilt admin-browser rerun. Its preceding runtime pass reported the slug API/public cases passing and two admin locator failures; this review inspected the source-level accessible-name correction but does not represent that pending rerun as independently verified evidence.

## Review status

**codeQualityStatus:** CLEAR

**recommendation:** APPROVE

**blockers:** None.

Coordinator follow-up: rebuilt browser/API suite passed21/21, including administrator slug entry and edits after the accessible-name fix. This is coordinator runtime evidence, not an additional independent reviewer claim.
