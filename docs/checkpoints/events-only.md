# Events-only local checkpoint — 2026-09-09

## Owner scope

Reset to `63a08b95cb54e06d9a00c89ae14d8d9eb1851284`, retain later public design work, and keep only event/highlight publishing with multiple images. Public pages remain Korean/English, light/dark. Administration is Korean-only on both locale paths. No commerce, customer accounts, payment, booking or administrator-account CRUD. Later owner refinements add editable URL slugs, a 12-record paginated journal, the local six-model bilingual wallet learning guide, administrator notice publishing and smooth content navigation.

## Recovery evidence

- Previous branch HEAD: `6e3c05a`.
- Complete Git-visible snapshot: `b1cc3f81190f06fb53da668c003421f479854543`, branch `backup/center-web-before-events-only-20260909-175952` (483 modified/deleted/new paths).
- Independent external backup: `/Users/max/noncelab/center/bitcoin-center-seoul-backups/20260909-175952/center-web.bundle`. Restored into `verified-restore.git`; full fsck and snapshot/tree equivalence passed.
- Separate public/design archive: 163 files, SHA-256 verified. The globally ignored old admin log source was additionally copied and hash-verified before removal from the reduced app.
- Existing runtime DBs, environment files and generated artifacts were kept outside the Git snapshot and preserved in place. No existing `.env` or `.env.local` was inspected.

## SQLite and content

Existing SQLite content tables, fields and numeric IDs remain authoritative. Only additive gallery, administrator-session/throttle, URL-slug and notice tables are added. Runtime `ADMIN_PASSWORD` uses the existing value without a hardcoded fallback; sessions are opaque HttpOnly cookies. SQLite itself does not require a database-server password. No PostgreSQL service or new production DB is needed.

The verified public-only source contains 14 events, 40 highlights and 48 images. Source JSON SHA-256: `1fb988fe27003823f27a1958f72b8b24ea37f18f22c162119c04c4d096a5cb3a`. Import targets only ignored local review storage, preserves existing edited rows, and is repeatable. Source data and image hashes remain unchanged. All 108 bilingual detail URLs returned 200; all 48 served image bytes match their source hashes.

## Verification ledger

Current integrated production build and strict TypeScript pass; ESLint passes. Events/API/admin/slug/pagination/notices/wallet suite:34 passed, exit0 (`events-final-pass.log`). Public navigation/motion/SEO suite:27 passed, exit0 (`public-final-pass.log`). Image optimizer patch tests:3 passed and unchanged dependency lockfile audit:0 vulnerabilities from the earlier verified increment. Runtime checks use Node22 and isolated loopback data.

Source/asset/config freeze: `8892db6865be554f131734f03d03604b01bfd2bbbe40376668cbecb6b7d4aa10` (251 files; `source-freeze-final-pass.json`). Current evidence under `docs/checkpoints/evidence/events-only/`: `complete-final-pass`256 screens, `guide-final-pass`112 screens+10 motion frames, `notices-final-retry`40 screens, `delivery-motion`16 frames, `card-arrival-final-pass`16 frames. Total408 resting/state screenshots and42 motion frames; all450 PNG signatures/dimensions verified. Public/admin/guide/notice audits report HTTP200,0 JavaScript errors,0 horizontal overflow and0 axe violations. Independent final reviews both PASS/APPROVE against this exact freeze: events-only-delivery-cjk.md and events-only-delivery-system.md. No blocking findings remain.

Shared content links smoothly return to the top before navigating, then journal/detail content fades without vertical movement. CSS duration parsing handles both milliseconds and minified seconds; an observed .38s/380ms mismatch was fixed and intermediate scroll frames are asserted. Prefetch is disabled for journal destinations and content links because this installed Next build otherwise retains page-one canonical metadata during query navigation; real client pagination canonical/hreflang/OpenGraph checks now pass. Floating back-to-top, keyboard focus, hidden-state tab order, card hover lift and reduced-motion behavior were exercised in Chrome. Older failing logs and stale visual reviews remain historical evidence, not current passes.

Notices use `/ko/admin/notices` and `/en/admin/notices` (Korean interface), with public `/ko/notices` and `/en/notices`. New notices start private, publishing is explicit, English fields are optional with Korean fallback, aliases survive slug changes, hidden notices return404 before redirects, and plain React text prevents HTML execution. CRUD/origin/auth/input/alias ownership checks pass. The capture fixture is removed in finally; it is not an operational notice. The first notice capture timed out waiting for the body-field locator; a fresh complete retry synchronized on the edit heading and verified all40states without product changes.

Slugs normalize lowercase ASCII letters/digits/hyphens; existing IDs are preserved and old numeric/slug paths redirect308 to current canonical URLs. Active visibility is checked before redirect. Database alias ownership and transactional collision409 behavior are tested; canonical, language alternates, OpenGraph and sitemap use the same current path. Journal SQL reads12 active records per page; invalid queries normalize to the base and out-of-range pages clamp before querying. Existing content retains numeric addresses until an administrator assigns its slug.

Wallet guide is `/ko/experience/wallet` and `/en/experience/wallet`, with local redirects from published `/walletExperence` aliases. All60 original model/locale/phase arrays and three decoded QR assets are retained. Public demo mnemonic/PIN/regtest address are labelled test-only. No wallet key collection or transaction execution occurs.

Earlier failures were retained as findings rather than reported as passes: complete highlight ranges were incorrectly rejected (shared validator fixed with regression coverage); the API PNG fixture was invalid (replaced by actual Sharp-generated pixels without weakening decoding); the first visual capture used the wrong theme storage key (round-1 is invalid as theme evidence and superseded). Runtime DB path typos and missing configuration now fail closed (verified503/no empty DB creation). Legacy-only schema initialization is separately verified, because a previously imported review DB can mask missing additive migrations. Additional fixed findings: accidental full gallery inside event-list cards removed; slug input accessible label corrected; wallet step tests await focus settling. Superseded captures and failed logs are preserved. Earlier parallel Playwright runs required teardown interruption after passed assertions; final direct single-worker suites exit0.

## Operational boundaries

No push, deployment, GitHub Actions, production writes, operational email or payment was performed. Root Vite/Express application and deployment scripts remain preserved. This build remains noindex. The existing public snapshot is a copy of public content, not a copy of administrator credentials or private operational records.

The single-password login has a global five-failure / 15-minute throttle. This bounds guessing without trusting spoofable proxy headers, but an attacker can temporarily deny new admin logins. Before an approved public release, restrict administrator access at the known nginx/network boundary or configure and test a trusted-proxy policy. Existing valid sessions continue working. Removing an image from a record does not delete potentially shared files; disk cleanup is a separate explicit maintenance action.

## Subsequent review request (no implementation authorized)
The owner requested review only of PostgreSQL migration value, stronger password handling/full security-audit scope, and bitcoinindonesia.xyz as a motion reference. Current implementation remains the local baseline. A read-only in-memory query reports bundled SQLite3.50.4; SQLite's official WAL documentation identifies this as predating the WAL-reset race fix (3.51.3+, or3.50.7 backport). The published trigger requires concurrent write/checkpoint activity from multiple connections; no corruption or exploitation was demonstrated here. A dependency/engine update is a follow-up review recommendation, not an implemented fix, and npm-audit0 does not cover this native-engine finding. Source: https://www.sqlite.org/wal.html
