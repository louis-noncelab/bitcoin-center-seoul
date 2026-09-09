## Latest security increment — 2026-09-09
The owner authorized implementing SQLite/security recommendations and smoother field focus. Keep SQLite (better-sqlite3 13.0.3, SQLite 3.53.4), use ADMIN_PASSWORD_HASH with the same password converted by the private scrypt CLI, and require validated trusted-proxy IP handling for remote admin login. No plaintext ADMIN_PASSWORD in the application environment. The generated loopback review credential remains only a test fixture. Follow docs/security/operations.md and docs/security/2026-09-09-hardening.md. Root legacy source remains preserved and excluded from the new service's runtime; its audit findings are not considered fixed on a still-legacy production server. No production changes, deployment, push or environment-file inspection. Only coordinator commits.

## Latest owner additions — 2026-09-09
The owner also authorizes local notices publishing (Korean-only admin, bilingual public pages with Korean fallback), editable slugs, journal pagination and a local wallet learning guide. Continue to exclude commerce/payments/PostgreSQL and preserve SQLite/password compatibility.

## Current owner decision — 2026-09-09 events-only reset

The owner explicitly selected base commit `63a08b95cb54e06d9a00c89ae14d8d9eb1851284` and authorized restoring current public design changes while limiting functionality to event/highlight display and admin create/edit/delete with multiple image uploads. Keep Next.js/React/TypeScript and the existing SQLite schema/ADMIN_PASSWORD compatibility. No shop, checkout, cart, payments, booking, customer accounts, PostgreSQL migration, or unrelated administration in this increment. This supersedes older scope instructions below. Existing root legacy application and runtime/production data stay untouched. No push, deployment, GitHub Actions, real payments, refunds or operational email. Never inspect existing .env/.env.local; never output secret values. Only coordinator stages/commits.

Recovery point: `backup/center-web-before-events-only-20260909-175952`, commit `b1cc3f81190f06fb53da668c003421f479854543`. Independent verified bundle and public assets are at `/Users/max/noncelab/center/bitcoin-center-seoul-backups/20260909-175952`. This snapshot is WIP, not a release.

# New public frontend

- This is the approved Next.js/React 19 frontend. The root `src/`, Express server, SQLite database and upload paths remain the legacy application during design work.
- No GitHub Actions. Use the local package scripts for checks and an explicitly approved manual deployment later.
- Read `DESIGN.md` before UI changes. Its source and fidelity notes are the design contract for this first candidate.
- TypeScript is strict here. Do not inherit the legacy app's relaxed TypeScript settings.
- Keep server content and metadata separate from the small client components that need interaction. Korean and English content must both be present.
- Existing real photographs may be statically imported from the repository's `public/` directory. Do not use reference-site screenshots or invented venue photography as center assets.
- No live API, authentication, database, booking, payment or email operation belongs to this first design increment.
- Run diagnostics before build. Validate the rendered page, keyboard interactions, both locales, themes and reduced motion locally.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
