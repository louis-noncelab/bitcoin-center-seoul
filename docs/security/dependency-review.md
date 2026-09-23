# Dependency security review — 2026-09-23

The web mail transport uses Nodemailer 10.0.10, pinned with its lockfile. This
replaces the vulnerable 7.0.13 line. Node 24 satisfies its Node >=20 requirement.
The upstream bundled TypeScript declarations replace the local declaration shim.
`tests/smtp-transport.mjs` composes the application's bilingual multipart message
without network access; the queue tests cover claim/retry/deduplication separately.

References: [upstream release notes](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md),
[raw message advisory](https://github.com/advisories/GHSA-p6gq-j5cr-w38f),
[address parser advisory](https://github.com/advisories/GHSA-2x7j-588g-ccc2).

## Remaining transitive low advisory

`npm audit` reports `bolt11 -> secp256k1 -> elliptic` for
[GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84).
The current upstream elliptic release (6.6.1) is still in the affected range.
The suggested automatic fix downgrades bolt11 from 1.4.1 to 1.0.0; it is not a
security-preserving upgrade and is not applied.

The production application decodes/verifies public BOLT11 invoices; it does not
hold a private signing key or sign an invoice. The only `bolt11.sign` call is in
`review-transport.ts`, which rejects non-REVIEW payments and non-review/test app
modes and uses an explicitly public fixture key. The invoice parser's signature,
amount, network and settlement-proof checks must remain intact. Thus the
private-key side-channel concern does not expose a production signing secret in
this application's usage. This is a bounded risk assessment, not a claim that
the upstream package is patched or that arbitrary library use is safe.

Reassess on a patched upstream parser release, or before introducing production
signing. Replacing the parser requires the invoice/signature/metadata/amount/
network/expiry and settlement regression suites; do not remove validation or
install an old parser merely to make the audit count zero.
