# Events-only backend checkpoint

Date: 2026-09-09

## Delivered scope

- Added strict shared Zod contracts and DTO types for legacy events and highlights, including galleries of at most 12 unique images.
- Added a server-only SQLite data layer that creates fresh legacy-compatible tables for the local importer. Runtime access first validates an existing legacy schema, then adds only `content_images`, `admin_sessions`, and `admin_login_attempts` support tables.
- Added public event/highlight list and detail APIs, plus authenticated admin list/create/read/update/delete APIs.
- Added password login, session inspection, logout, opaque HttpOnly SameSite=Strict cookies, password-bound session hashes, a global bounded login throttle, and exact `APP_ORIGIN` checks on every mutation.
- Added bounded multipart upload handling, MIME and actual decoder validation, 10 MB per-file and 30 MB aggregate limits, sequential EXIF rotation and 1600 px WebP output, random filenames, existing-image checks, and traversal-safe image serving.
- Added a hash-gated local snapshot importer. It accepts real paths only under `web/.local`, copies verified images without overwriting existing files, rejects mismatched existing copies, and uses one SQLite transaction with `INSERT OR IGNORE` so repeat imports preserve edits.
- Normal runtime database access requires an existing configured SQLite file and never invokes the create-capable importer opener. Missing configuration and nonexistent paths fail with 503 instead of rendering empty content or creating a database.
- Before any importer write, the duplicate-free 48-path image manifest must exactly match the 48 distinct image paths referenced by the verified snapshot.
- Preserved legacy IDs and fields. API DTOs omit timestamps, expose `images`, set `image` to the first gallery image, and normalize legacy `www.` links to `https://` without modifying source rows.

## API contract

- Success: `{ "data": ... }`
- Failure: `{ "error": { "code": string, "message": string } }`
- Public: `GET /api/events`, `/api/events/:id`, `/api/highlights`, `/api/highlights/:id`
- Admin: `GET|POST /api/admin/events`, `GET|PUT|DELETE /api/admin/events/:id`, and matching highlight routes
- Auth: `POST /api/admin/login`, `GET /api/admin/session`, `POST /api/admin/logout`
- Media: `POST /api/admin/images`, `GET /images/:path*`

## Evidence captured

- Snapshot SHA-256 independently matched `1fb988fe27003823f27a1958f72b8b24ea37f18f22c162119c04c4d096a5cb3a`.
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run review -- import` returned `events=14 highlights=40 images=48`.
- Repeating the same import returned `events=0 highlights=0 images=0`, confirming row and file idempotency.
- Scoped ESLint over the backend, contracts, route handlers, importer, and API test exited 0 with no output after the final runtime changes.
- A Node 22 server-condition driver returned `contract-boundaries=ok password-bound-session-hash=ok` after checking impossible-date rejection, highlight date/period exclusivity, `javascript:` rejection, and password-dependent session hashes.
- Period regression tests first failed on complete ranges, then passed after correcting the shared predicate; the same check validates all 40 verified source highlights against the public record schema.
- The upload integration check passed with two Sharp-generated PNGs and still rejected disguised non-image bytes. The former hand-encoded 68-byte fixture was removed after Sharp confirmed it exposed PNG metadata but failed actual decode.
- The isolated runtime-access regression check passed: unset `BCS_EVENTS_DB` and a nonexistent configured file both returned 503, and the nonexistent path remained absent. An exact legacy-only schema fixture then initialized all three support tables, returned its event through the gallery-aware reader, accepted a password login, and retained the original event row byte-for-byte at the SQL-value level.
- The initial API test run failed at connection refusal on port 3102 before route implementation, providing the red phase. A separate Next development process held the review lock, so green HTTP execution was handed to the coordinator's isolated build/start pass.
- A full TypeScript invocation during concurrent integration reported only files outside this backend ownership at that point; coordinator build/type verification remains authoritative after integration.

## Operational boundaries

- Runtime requires absolute `BCS_EVENTS_DB` and `BCS_EVENTS_UPLOADS` paths, `APP_ORIGIN`, and `ADMIN_PASSWORD`. There is no fallback password or default database path.
- The importer additionally refuses targets outside `web/.local` and never reads `.env` or `.env.local`.
- Gallery removal does not delete image files because one file may be referenced by another record. Unreferenced-file cleanup can be added when storage growth becomes measurable.
- The global login bucket intentionally favors brute-force resistance for this single-password admin. A trusted-proxy-aware per-client bucket is only needed if concurrent administrators encounter contention.
- No root legacy server/database source, production data, remote service, deployment, GitHub Action, payment, refund, or email operation was changed or invoked.
