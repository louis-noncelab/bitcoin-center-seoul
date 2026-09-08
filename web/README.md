# Bitcoin Center Seoul public frontend

The first redesign increment is a local, bilingual visual preview. The existing
Vite/Express application remains at the repository root.

## Local development

Use Node 22 and npm. The root app and this directory have separate package files:

```bash
cd web
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
npm run dev
```

The local address is `http://127.0.0.1:3100`. Start the server before Playwright;
the test config intentionally does not start one. Stop dev before a production
build, then run `npm run start` for the same local port.

Preview routes:

- `/ko`, `/en`: home.
- `/{locale}/about`, `/programs`, `/experience`, `/journal`, `/goods`, `/visit`:
  six public areas (each path has a locale prefix).
- `/ko/design-system`, `/en/design-system`: font, icon, color and media comparison.
- The legacy wallet guide still links to `https://bitcoincenterseoul.com/walletExperence`.

```bash
npm run check
npm run test -- tests/home.spec.ts tests/routing.spec.ts  # dev server
npm run build
npm run audit
npm run doctor
```

For a production-mode visual check, stop dev, build and start, then run:

```bash
npm run test -- --workers=1 --grep-invert 'development tools bypass locale routing'
```

The routing suite's development-tool test intentionally expects the dev server.
Production tools must return 404; the browser audit records that separate check.
The documented run uses one worker because the installed Chrome/Playwright pair
left two browser fixtures waiting during a parallel run's shutdown. See the
validation report for the interrupted run and the final sequential result.
`next start` currently warns about the retained standalone build setting but
serves this local preview. The actual standalone launch belongs to release setup.

GitHub Actions is not used. No production deployment is part of this increment.

The preview does not process reservations, payments, authentication or email.
Its photographs come from the existing center assets. New photography and final
icon files can replace them after the owner selects the design direction.

The preview stays noindex, including production-mode local builds. Canonical,
hreflang, sharing metadata and sitemap encode candidate locale URLs on the
existing domain; they are not a claim that those paths are already deployed.
Review search policy and final URLs before the separately approved release.

## Directory boundaries

```text
src/
  app/                 # route entry points, locale document, metadata routes
    [locale]/          # ko/en home; [section] validates the six public slugs
    dev-tools/         # allowlisted tools, development only
  content/             # bilingual facts, static image imports, public route SEO
  components/
    site/              # public composition/photos; page-entry and viewport motion
    controls/          # small client islands: theme, navigation, program selection, controlled marquee
    design-system/     # review-only font comparison
    ui/                # shared semantic frames and button/link primitives
  i18n/                # locale routing, request setup and specimen messages
  styles/              # design tokens, primitives, controls, site composition
public/fonts/          # licensed Pretendard dynamic subsets, served locally
assets/icons/          # local Tailwind/Bootstrap source collections and licenses
tests/                 # routing, public surface and interaction checks
```

The root `src/`, `server.js`, `database.js`, `data/` and `public/images/` remain
the legacy system. Photographs are explicit static imports from root `public/`;
the new app does not mount the complete legacy public directory or uploads.
Add server/database modules only in the subsequent approved backend stage.

## Continuity and evidence

Current overall status: `../docs/checkpoints/2026-09-09-remaining-work.md`.
Latest public-design continuation: `../docs/handoff/2026-09-08-motion-footer-next.md`.
Original requests: `../docs/handoff/2026-09-08-codex.md` (historical, preserved).
Design contract: `DESIGN.md`; font/icon and asset notes: `../docs/design/`.
Local test screenshots and logs: `../docs/checkpoints/evidence/` (Git-ignored).
Human review reports: `../docs/checkpoints/reviews/` (eligible for Git).
Session exports and unused full font source: `../.local/` (Git-ignored).

Pretendard is the Korean and English heading/body default. Official v1.3.9
Unicode subsets load only the character groups a page needs, from this app's
own origin. Manrope and Noto Sans KR remain comparison-route alternatives.
