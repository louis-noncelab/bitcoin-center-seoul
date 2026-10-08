# Dependency security review: 2026-10-01

The web mail transport uses Nodemailer 10.0.12, pinned with its lockfile. This
replaces the vulnerable 7.0.13 line. Node 24 satisfies its Node >=20 requirement.
The upstream bundled TypeScript declarations replace the local declaration shim.
`tests/smtp-transport.mjs` composes the application's bilingual multipart message
without network access; the queue tests cover claim/retry/deduplication separately.

References: [upstream release notes](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md),
[raw message advisory](https://github.com/advisories/GHSA-p6gq-j5cr-w38f),
[address parser advisory](https://github.com/advisories/GHSA-2x7j-588g-ccc2).

## Next.js and BOLT11 advisories resolved

Next.js, its bundle analyzer and ESLint configuration are pinned to 16.3.8.
This resolves the critical `next/og` advisory
[GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).
The release still needs the guarded internal-image response-socket backport;
the installer verifies the exact 16.3.8 CJS and ESM source/output hashes before
writing, and rejects version or source drift.

`@atomiqlabs/bolt11` 1.6.2 replaces `bolt11` 1.4.1 in validation and REVIEW
fixtures. Its reviewed source uses Noble signature recovery and bigint amounts;
the locked dependency tree no longer includes `secp256k1` or `elliptic`, removing
[GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84).
The published package was compared with the old parser and its
[pinned upstream source](https://github.com/atomiqlabs/bolt11/blob/ca077d2443972a38d338ad41e5329b867528b919/payreq.js).
The required REVIEW testnet network now includes WIF prefix 239. Production
still holds no invoice-signing key; REVIEW fixtures use the public test key.

Node 24 `npm ci` and full `npm audit` report zero vulnerabilities. Typecheck,
lint, production build and 138 commerce tests passed, including captured `d`/`h`
invoices, settlement and six new signature/amount/network/expiry regressions.
The existing metadata, duplicate-tag and settlement-proof checks remain intact.
The three image-optimizer tests also pass. These checks use isolated databases,
REVIEW payments and capture mail; no live payment or email is created.

Re-review the parser source and guarded Next patch on future upgrades, and before
introducing production signing. Keep validation and regression tests intact.
