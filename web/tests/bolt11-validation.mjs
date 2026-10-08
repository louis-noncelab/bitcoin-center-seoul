import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import bolt11 from "@atomiqlabs/bolt11";
import { validateBolt11 } from "../src/server/payments/bolt11.ts";
import { reviewInvoice } from "../src/server/payments/review-transport.ts";
import { PaymentError } from "../src/server/payments/types.ts";

const require = createRequire(import.meta.url);
const bech32 = createRequire(require.resolve("@atomiqlabs/bolt11"))("bech32");
// Public test key only; these fixtures never leave the process.
const key = "11".repeat(32);
const hash = "22".repeat(32);
const pubkey = "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa";
const expected = { amountSats: 10n, review: false, future: true };
function invoice({ amountSats = 10n, timestamp = Math.floor(Date.now() / 1000), extra = [] } = {}) {
  return bolt11.sign(bolt11.encode({
    millisatoshis: (amountSats * 1000n).toString(), timestamp,
    tags: [
      { tagName: "payment_hash", data: hash },
      { tagName: "description", data: "TEST ONLY" },
      { tagName: "payee_node_key", data: pubkey },
      { tagName: "expire_time", data: 3600 },
      ...extra,
    ],
  }), key).paymentRequest;
}
function rewrite(pr, change) {
  const { prefix, words } = bech32.decode(pr, Number.MAX_SAFE_INTEGER);
  change(words);
  return bech32.encode(prefix, words, Number.MAX_SAFE_INTEGER);
}
const rejects = (pr, code) => assert.throws(
  () => validateBolt11(pr, expected),
  (error) => error instanceof PaymentError && error.code === code,
);

test("signed invoices preserve exact amounts beyond Number-safe millisatoshis", () => {
  const amountSats = 9_007_199_254_741n;
  assert.equal(validateBolt11(invoice({ amountSats }), { ...expected, amountSats }).paymentHash, hash);
  assert.throws(() => validateBolt11(invoice({ amountSats }), { ...expected, amountSats: amountSats + 1n }),
    (error) => error instanceof PaymentError && error.code === "BOLT11_QUOTE_MISMATCH");
  assert.equal(validateBolt11(invoice().toUpperCase(), expected).paymentHash, hash);
});

test("checksum, invalid signature scalars and recovery flags are rejected", () => {
  const pr = invoice();
  rejects(pr.slice(0, -1) + (pr.endsWith("q") ? "p" : "q"), "INVALID_BOLT11_SIGNATURE");
  rejects(rewrite(pr, (words) => words.splice(-104, 104, ...bech32.toWords(Buffer.alloc(65)))), "INVALID_BOLT11_SIGNATURE");
  rejects(rewrite(pr, (words) => {
    const signature = Buffer.from(bech32.fromWords(words.slice(-104)));
    signature[64] = 4;
    words.splice(-104, 104, ...bech32.toWords(signature));
  }), "INVALID_BOLT11_SIGNATURE");
});

test("changing a checksummed payload cannot satisfy its signed payee key", () => {
  rejects(rewrite(invoice(), (words) => { words[10] ^= 1; }), "INVALID_BOLT11_SIGNATURE");
});

test("duplicate payment hashes and ambiguous description, expiry and payee tags are rejected", () => {
  rejects(invoice({ extra: [{ tagName: "payment_hash", data: hash }] }), "INVALID_BOLT11_SIGNATURE");
  for (const [tagName, data] of [["description", "duplicate"], ["expire_time", 7200], ["payee_node_key", pubkey]]) {
    rejects(invoice({ extra: [{ tagName, data }] }), "BOLT11_DUPLICATE_TAG");
  }
});

test("expired and future-dated invoices cannot become payable quotes", () => {
  const now = Math.floor(Date.now() / 1000);
  rejects(invoice({ timestamp: now - 7200 }), "BOLT11_EXPIRED");
  rejects(invoice({ timestamp: now + 120 }), "BOLT11_QUOTE_MISMATCH");
});

test("REVIEW fixtures sign valid testnet invoices bound to metadata and amount", () => {
  const fixture = reviewInvoice({
    creationKey: "dependency-audit-test", amountSats: 10n,
    createdAt: new Date(), expiresAt: new Date(Date.now() + 300_000),
  });
  assert.equal(validateBolt11(fixture.pr, { ...expected, review: true, metadata: fixture.metadata }).paymentHash, fixture.hash);
  rejects(fixture.pr, "BOLT11_QUOTE_MISMATCH");
});
