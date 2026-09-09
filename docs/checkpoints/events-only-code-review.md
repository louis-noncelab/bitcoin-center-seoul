# Events-only code review

Date: 2026-09-09

## Scope and method

Read-only review of the events-only SQLite backend, public/admin API routes, image handling, local snapshot importer, and their focused Playwright tests. I did not read `.env` or `.env.local`, mutate a runtime database, run a server, or inspect a deployment. The working tree and source snapshot are authoritative.

The `remove-ai-slops` and `programming` skill perspectives were consulted, including the TypeScript reference. The scoped code has no `any`, type-suppression directive, unsafe type assertion, prompt/prose assertion, or deletion-only test. The tests use real HTTP, SQLite, and Sharp boundaries where those behaviors matter; they are not implementation-constant mirrors. `web/tests/events-api.spec.ts` is in the 200–250 pure-LOC warning band (246) but remains a coherent serialized API contract suite; split it before adding further scenarios.

## Findings

### HIGH — resolved during this review: configured SQLite cannot silently become empty

`web/src/server/events/index.ts` no longer returns an empty public list when `BCS_EVENTS_DB` is absent. `web/src/server/events/db.ts:90-115` now requires an existing regular file and opens it with `fileMustExist`; missing or invalid configured paths return a controlled 503 rather than creating a blank SQLite database. `web/tests/events-api.spec.ts:19-68` exercises the unset and missing-path cases in an isolated process.

This preserves the required existing SQLite/legacy-ID model and prevents a configuration typo from presenting an empty event site.

### HIGH — resolved during this review: existing legacy tables receive only the required additions

The first fail-closed implementation opened an existing legacy database without creating `content_images`, `admin_sessions`, and `admin_login_attempts`, so gallery reads and login would fail despite the compatible legacy rows. `web/src/server/events/db.ts:25-75` now verifies legacy columns first and adds only those three support tables for both an imported review database and an existing configured database. The exact legacy-schema fixture at `web/tests/events-api.spec.ts:19-68` preserves a seeded original row byte-for-byte while exercising listing, login, and the three additive tables.

### MEDIUM — resolved during this review: imported image manifest is bound to snapshot records

`web/scripts/events-import.ts:61-83,151-154` now rejects duplicate manifest paths and requires its exact image-path set to equal the non-empty image paths in the hash-verified 14-event/40-highlight snapshot. The current source has 48 expected paths, 48 unique manifest paths, and no missing or extra path.

Before this correction, a malformed local manifest could contain a repeated valid entry while a referenced photo was omitted, producing public image 404s after import.

### WATCH — intentional global login throttle can be used to delay admin access

`web/src/server/events/auth.ts:10-14,89-106` uses one global five-failure/15-minute bucket. A party able to send requests with the expected Origin header can consume that bucket and delay every administrator. This is an explicit single-password, single-EC2 trade-off and should not be changed to trust arbitrary forwarded headers. Keep the limitation documented and revisit it only with a deployment-confirmed trusted proxy/client identity boundary.

### WATCH — importer preserves edits but does not distinguish them from ID conflicts in output

`web/scripts/events-import.ts:105-137` intentionally uses `INSERT OR IGNORE`, which preserves an existing locally edited row with the same legacy numeric ID. The output reports inserted counts only, so an unexpected conflicting row and a normal repeat import are both represented as fewer imported rows. This does not overwrite data and is appropriate for the current local-only importer. If the command is used beyond its empty-review-DB workflow, add explicit inserted/skipped counts (and ideally classify exact snapshot matches separately) without changing the preservation behavior.

## Confirmed controls

- Mutating admin routes require both the HttpOnly session and exact `APP_ORIGIN`; public reads do not expose inactive highlights.
- Passwords are never returned or stored in browser storage; sessions are random, password-bound HMAC hashes with `HttpOnly`, `SameSite=Strict`, and HTTPS-only `Secure` cookies.
- JSON and multipart bodies are bounded. Uploaded media requires an allowed MIME claim and successful Sharp decoding, is pixel-limited and normalized to randomized WebP filenames. Paths are schema-validated and realpath-contained before attachment or serving.
- Existing legacy `events`/`highlights` fields and IDs are retained; only gallery/session/attempt support tables are additive. The importer is constrained to `web/.local` and does not target production.

## Review status

**codeQualityStatus:** WATCH
**recommendation:** APPROVE for the authorized local review build after the coordinator's runtime/browser verification.
**blockers:** None in the reviewed source after the resolved findings above. The global-throttle and importer-reporting items are documented release considerations, not reasons to broaden this increment.

No runtime-pass claim is made by this review; test, build, browser, and visual evidence belong to the coordinator's verification pass.
