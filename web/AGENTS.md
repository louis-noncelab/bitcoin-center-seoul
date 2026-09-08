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
