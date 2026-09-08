# Routing foundation checkpoint

## Scope

- Owns the Next.js document root, locale request setup, locale proxy, and local development-tool route only.
- The existing Manrope and Noto Sans KR imports remain unchanged; font selection belongs to the pending visual comparison.

## Root cause and fix

- Before this change, `web/src/app/layout.tsx` supplied a document root above `web/src/app/[locale]/layout.tsx`. The locale layout therefore emitted a second `html` and `body`, and Next 16 generated `web/.next/dev/types/root-params.d.ts` with `No root params detected.`
- The bootstrap-only root layout and null root page are removed. `[locale]/layout.tsx` is now the root layout, owns the sole document, reads `locale` through `next/root-params`, and sets `html[lang]` from that value.
- `request.ts` keeps its installed `next-intl` 4.14 request-config API while resolving the locale through Next 16 root params instead of deprecated `requestLocale`.
- The proxy sends locale-shaped but unsupported prefixes (for example `/fr`) to 404 before `next-intl` can convert them to `/ko/fr`. `/` still uses the configured `next-intl` redirect to `/ko`.
- `/dev-tools/*` is excluded from the locale proxy. The existing route remains Node-only and returns 404 unless `NODE_ENV` is exactly `development`; the client scripts also render only in development.

## Checks

- Pre-change evidence: generated Next root-params declaration stated `No root params detected.`
- After the fix, Next generated `declare module 'next/root-params' { export function locale(): Promise<string> }`.
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run typecheck` passed.
- The owned-file ESLint command passed: `npx eslint 'src/app/[locale]/layout.tsx' src/i18n/request.ts src/proxy.ts src/components/development-tools.tsx 'src/app/dev-tools/[tool]/route.ts' tests/routing.spec.ts`.
- `npx playwright test tests/routing.spec.ts` passed all three tests against the parent-owned development server on port 3100. The suite exercised the `/` to `/ko` redirect, direct `/fr` 404, and a real Chromium navigation to `/dev-tools/react-scan`.
- The development asset returned `200`, `Content-Type: text/javascript; charset=utf-8`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`.

## Limitation

- `npm run lint` remains blocked by one pre-existing warning in `web/postcss.config.mjs` (`import/no-anonymous-default-export`), which is outside this scope. There are no owned-file lint errors or warnings.
- The development-tool test is intentionally a development-server test. Production isolation is enforced by the route handler's exact environment guard and needs the parent production-build validation.
