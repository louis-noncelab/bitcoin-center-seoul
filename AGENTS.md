## Latest owner additions — 2026-09-09
The owner also authorizes notices draft/publish/edit/delete, editable URL slugs, journal pagination and the local wallet learning guide. Public pages stay bilingual; administration stays Korean-only. SQLite/password compatibility and the no-deployment boundaries still apply.

## Current owner decision — 2026-09-09 events-only reset

The owner explicitly selected base commit `63a08b95cb54e06d9a00c89ae14d8d9eb1851284` and authorized restoring current public design changes while limiting functionality to event/highlight display and admin create/edit/delete with multiple image uploads. Keep Next.js/React/TypeScript and the existing SQLite schema/ADMIN_PASSWORD compatibility. No shop, checkout, cart, payments, booking, customer accounts, PostgreSQL migration, or unrelated administration in this increment. This supersedes older scope instructions below. Existing root legacy application and runtime/production data stay untouched. No push, deployment, GitHub Actions, real payments, refunds or operational email. Never inspect existing .env/.env.local; never output secret values. Only coordinator stages/commits.

Recovery point: `backup/center-web-before-events-only-20260909-175952`, commit `b1cc3f81190f06fb53da668c003421f479854543`. Independent verified bundle and public assets are at `/Users/max/noncelab/center/bitcoin-center-seoul-backups/20260909-175952`. This snapshot is WIP, not a release.

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-09-07
**Commit:** 0a19953
**Branch:** main

## REDESIGN EXECUTION — 2026-09-08

- Work on `redesign/center-web`. The approved target stack is Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.
- Build the new public frontend in `web/` first, isolated from the existing Vite/Express application. Design approval precedes backend implementation and SQLite migration.
- **Do not enable, run, or depend on GitHub Actions.** Preserve the historical automatic deployment file as `.github/workflows/deploy.yml.disabled`; the owner explicitly requested disabling it, not deleting it.
- Run type, lint, browser, dependency, and security checks locally. Repeat authentication/session/authorization checks when those boundaries change. Production deployment remains a separate, explicitly approved manual operation.
- Design: cinematic but understated, gallery-like and welcoming, using real center photography. Light is the default with a dark switch; use the supplied logo's orange and blue identity. Keep Korean/English pages and restrained, reduced-motion-safe interaction.
- Do not copy the reference project's multi-brand scope, Vercel-specific security defaults, or unresolved security issues into the center.

## OVERVIEW
Public site for Bitcoin Center Seoul (Mapo): Lovable-scaffolded Vite + React 18 + shadcn/Tailwind SPA, plus an Express + better-sqlite3 backend (`server.js`, `database.js`) that serves `/api/*`, `public/`, and the built `dist/`. Runs under PM2 on one EC2 box behind nginx.

## STRUCTURE
```
bitcoin-center-seoul/
├── server.js               # Express :3000 - /api/admin/login, /api/images (upload), /api/events*, /api/highlights*, static, SPA fallback
├── database.js             # better-sqlite3 -> data/events.db (gitignored, auto-created); additive PRAGMA migrations
├── events.db               # STALE tracked copy from 73b423c; runtime never reads it
├── ecosystem.config.cjs    # PM2 (live). ecosystem.config.js = dead duplicate with hardcoded cwd
├── deploy.sh               # runs ON the EC2 box: reset to origin/main, npm install, build, pm2 restart
├── upload-to-ec2.sh        # local rsync --delete to EC2 (destructive, see ANTI-PATTERNS); setup-ec2-git.sh = first clone
├── .github/workflows/deploy.yml.disabled  # original workflow retained, not an active GitHub Actions file
├── public/                 # certificate/*.pdf, images/ (server writes uploads here too)
├── prompt.txt              # orphan Korean event copy, unreferenced
└── src/
    ├── App.tsx             # providers + 6-route table
    ├── pages/              # Index, WalletExperience, AdminAuth/Events/Highlights, NotFound, Certificate (unrouted)
    ├── components/         # landing sections, modals, ui/ (shadcn) -> src/components/AGENTS.md
    ├── contexts/LanguageContext.tsx   # ko|en, default ko, not persisted
    ├── hooks/              # use-toast.ts (source of truth), use-mobile.tsx
    └── lib/                # utils.ts cn(); admin.ts = admin session + adminFetch() + uploadImage()
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add a route | `src/App.tsx` | above the `*` catch-all; `/walletExperence` (sic) is the live URL |
| Landing page order | `src/pages/Index.tsx` | Hero, Activities(`#events`), EventHighlights, Services(`#services`), Community, Footer |
| Nav labels vs section ids | `src/components/Navigation.tsx:12-18` | index-mapped: "Events"->`#events`, "Activities"->`#services` |
| Events CRUD | `src/pages/AdminEvents.tsx` + `server.js` `/api/events*` | `date` is text `YYYY-MM-DD`; `/upcoming` = `date >= UTC today` |
| Highlights CRUD | `src/pages/AdminHighlights.tsx` + `server.js` `/api/highlights*` | same shape as events plus `date` XOR `startDate`/`endDate` |
| Image upload | `src/components/ImageUploadField.tsx` -> `src/lib/admin.ts` `uploadImage()` -> `server.js` `POST /api/images` | multipart `file`; multer memory + sharp: EXIF rotate, 1600px webp + 480px `-thumb`, saved to `public/images/uploads/YYYY-MM/` (gitignored). No URL field anymore |
| Admin auth | `src/pages/AdminAuth.tsx` -> `src/lib/admin.ts` -> `server.js` `requireAdmin` | `POST /api/admin/login` checks `.env` `ADMIN_PASSWORD`; client keeps it as `sessionStorage.admin_token`, `adminFetch()` sends `x-admin-token`; 401 bounces to `/admin/auth?redirect=` |
| Schema / migrations | `database.js` | add columns via `addColumn()`; SQLite can't drop or retype |
| Highlight ordering | `server.js:13` `highlightOrder` | `COALESCE(endDate, startDate, REPLACE(date,'.','-')) DESC` |
| Design tokens | `src/index.css :root`, `tailwind.config.ts` | `bitcoin` / `bitcoin-dark` / `bitcoin-light` |
| Hardware-wallet demo flow | `src/pages/WalletExperience.tsx` | 984 lines; `step` x `phoneOS` x `WalletType` state |
| Deploy | `deploy.sh` (legacy manual script) | app dir `/var/www/bitcoin-center-seoul`; no GitHub Actions; explicit approval required |

## CODE MAP
Refs = import sites counted with rg (LSP unavailable: `node_modules` absent locally).

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `cn` | fn | `src/lib/utils.ts` | 45 | class merge, every ui/ file |
| `useLanguage` / `LanguageProvider` | hook/ctx | `src/contexts/LanguageContext.tsx` | 15 | ko/en switch read by every section |
| `Button` | comp | `src/components/ui/button.tsx` | 14 | CTAs use `bg-bitcoin hover:bg-bitcoin/90` |
| `Card*` / `Dialog*` | comp | `ui/card.tsx`, `ui/dialog.tsx` | 7 / 6 | |
| `useToast` / `toast` | hook | `src/hooks/use-toast.ts` | 4 | `ui/use-toast.ts` is a re-export shim |
| `EventScheduleModal` | comp | `src/components/EventScheduleModal.tsx` | 3 | Hero + both course modals; `localStorage.dontShowEventModalToday` |
| `db`, `initDatabase` | module | `database.js` | 1 | only `server.js` imports it |
| `highlightOrder` | const | `server.js:13` | 2 | shared ORDER BY for both highlight GETs |

## CONVENTIONS
- TypeScript strictness is OFF for app code (`strict`, `noImplicitAny`, `strictNullChecks` all false in `tsconfig.json` / `tsconfig.app.json`); only `tsconfig.node.json` (vite config) is strict. `tsc` will not catch null bugs.
- ESLint: `@typescript-eslint/no-unused-vars` off; no typecheck script.
- i18n: no locale files. Each component owns a `content = { ko: {...}, en: {...} }` object and reads `content[language]`; DB rows carry paired columns (`title`/`titleEn`, `description`/`descriptionEn`, ...). Korean is the default and the primary language of copy, comments, server errors, and script output.
- API: bare relative `fetch('/api/...')` for reads, `adminFetch()` for anything mutating; manual `useState`/`useEffect`. `QueryClientProvider` is mounted in `App.tsx` but nothing uses React Query.
- Server config comes from `.env` (`dotenv/config` in `server.js`); `.env.example` lists the keys. `.env` is gitignored and must exist on the EC2 box.
- Dev: Vite on `:8080` (`host: "::"`) proxies `/api` and `/images/uploads` -> `127.0.0.1:3000` (override with `API_PORT`), so `node server.js` must run alongside `npm run dev`.
- Package is ESM (`"type": "module"`); `server.js` / `database.js` use `import`. PM2 config must stay `.cjs`.
- Tokens: warm dark `:root` (bg `20 14.3% 4.1%`, card `24 9.8% 10%`, primary/ring orange `25 95% 53%`). The `.dark` block is stock slate and never activated (no theme provider) - edit `:root`.
- Custom keyframes live in `src/index.css @layer utilities` (`fade-in`, `hero-video-zoom-out` with reduced-motion guard), not in `tailwind.config.ts`.
- Static content (services, courses, meetups, wallet steps) is inline in components; there is no data/ or constants dir.
- Hash navigation: `Navigation` calls `navigate('/#id')` when off the home route; `Index.tsx` scrolls to the hash with a 100px offset after 100ms.

## ANTI-PATTERNS (THIS PROJECT)
- Never add a `<Route>` below `path="*"` (`src/App.tsx:29`).
- Never call a mutating endpoint with bare `fetch`; use `adminFetch` from `src/lib/admin.ts` so `x-admin-token` is sent (server answers 401 otherwise). GETs are still public; there is still no rate limiting, CORS config, or body validation.
- Never put the admin password back in the client. It lives in `.env` `ADMIN_PASSWORD`; without `.env` the server falls back to `LEGACY_ADMIN_PASSWORD` and logs a warning - delete that fallback once prod has `.env`.
- Never run `./upload-to-ec2.sh` against production: its `rsync --delete` excludes only `node_modules/.git/dist/.env/*.log`, so it deletes the server's `data/` (live DB) and `public/images/highlights/uploads/`. Deployment is manual and requires explicit approval; pushing a branch is not a deployment procedure.
- Never rename `/walletExperence` without a redirect; it is the published URL.
- Never commit `data/` or `*.db` (gitignored). Root `events.db` is a historical artifact, not the runtime DB.
- Never edit `ecosystem.config.js`; `.cjs` is the one PM2 loads.
- Never use `bun`; deploy uses `npm install` + `package-lock.json`, and `bun.lockb` is stale.
- Never rewrite `CREATE TABLE` in `database.js` to change columns; add through `addColumn()` (tables already exist in prod).
- Never drop the `en` (or `ko`) key when adding copy; both languages render from the same object.

## UNIQUE STYLES
- Page components are single large files holding auth gate + fetch + form + list (`Admin*` ~550 lines each).
- Dates are strings: `events.date` ISO (`2025-10-25`), `highlights.date` may be dotted (`2026.03.22`), `startDate`/`endDate` ISO; ordering relies on `REPLACE(date,'.','-')`.
- Uploads are named `${Date.now()}-${slug}-${hex6}.webp` (+ `-thumb.webp`) under `public/images/uploads/YYYY-MM/` and served straight from `public/`; originals are not kept. Older rows may still point at `/images/highlights/uploads/` or external `pbs.twimg.com` URLs.

## COMMANDS
```bash
npm install                      # needs Node 20-24 (better-sqlite3@12 engine range); Node 25 fails the native build
cp .env.example .env             # then set ADMIN_PASSWORD
node scripts/rehost-images.mjs <BASE_URL> <ADMIN_PASSWORD> --dry-run   # move external (X) image URLs into /images/uploads/
npm run dev                      # Vite :8080 (+ run `node server.js` for /api)
node server.js                   # API + static on :3000; HOST/PORT env; creates data/events.db
npm run build                    # -> dist/
npm run serve                    # build && node server.js (production-like)
npm run lint                     # eslint .
npx tsc -p tsconfig.app.json --noEmit   # no typecheck script exists
# No GitHub Actions. Review a manual deployment procedure before an approved release.
# Legacy manual script on EC2: cd /var/www/bitcoin-center-seoul && ./deploy.sh
```

## NOTES
- Keystone demo PIN in `src/pages/WalletExperience.tsx:336` is intentional in-center demo content.
- nginx on the box must carry `client_max_body_size 20m;` or uploads over 1MB die with 413 before reaching Express.
- `GET /api/highlight-images` (directory listing) is unused by the UI; `POST /api/highlight-images` was replaced by `POST /api/images`.
- `src/pages/Certificate.tsx` is a finished page (lists `public/certificate/BPEP-001-*.pdf`) with no route; `BPEP-002-*.pdf` files exist but aren't listed.
- `HeroSection` poster `/images/thumnail/IMG_6227.jpg` is not in git -> 404 unless the file exists on the server.
- `public/images/events/uploads/` (3 tracked files) is a leftover from an older upload path; current uploads go to `public/images/highlights/uploads/` (untracked, not ignored -> shows in `git status` on the server; survives `git reset --hard`).
- `DEPLOY.md` documents an older local-SSH `deploy.sh` (EC2_IP / KEY_PATH); today's `deploy.sh` runs on the box. `README.md` is the stock Lovable readme.
- `sqlite3` is in dependencies but unused (driver is `better-sqlite3`); `crypto-browserify` / `stream-browserify` / `buffer` vite aliases are unused by `src/`.
- `index.html` has `lang="en"` while the default UI is Korean; no `word-break: keep-all` anywhere, so long Korean strings wrap mid-word.
- `lovable-tagger` runs only in dev mode; `.dark` and `sidebar-*` tokens are template residue.

## Design Overrides
- Do NOT apply `~/.agents/MY-DESIGN-STYLE.md` in this repo. Owner (Max, since 2026-09-07) is choosing a new design direction from scratch; the global palette/typography/motion rules are suspended until a project style guide replaces this section.
- Fixed requirements so far: "museum-like" center-introduction landing, light AND dark mode, ko/en with real SEO, animation-heavy, admin pages restructured. One-page vs multi-page undecided.
