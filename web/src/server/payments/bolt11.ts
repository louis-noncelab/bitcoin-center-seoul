import { createHash } from "node:crypto";
import bolt11 from "bolt11";
import { digestHexSchema, PaymentError } from "./types";

const singleTags = ["payment_hash", "purpose_commit_hash", "expire_time", "payee_node_key", "description"] as const;

export function validateBolt11(pr: string, expected: { readonly amountSats: bigint; readonly review: boolean; readonly metadata?: string; readonly future?: boolean }) {
  let decoded;
  try { decoded = bolt11.decode(pr); }
  catch { throw new PaymentError("INVALID_BOLT11_SIGNATURE"); }
  for (const name of singleTags) {
    if (decoded.tags.filter((tag) => tag.tagName === name).length > 1) throw new PaymentError("BOLT11_DUPLICATE_TAG");
  }
  const hashes = decoded.tags.filter((tag) => tag.tagName === "payment_hash");
  if (!decoded.complete || !decoded.payeeNodeKey || !decoded.signature || hashes.length !== 1
    || decoded.millisatoshis !== (expected.amountSats * 1000n).toString()
    || decoded.network?.bech32 !== (expected.review ? "tb" : "bc") || !decoded.timeExpireDate
    || !decoded.timestamp || decoded.timestamp > Date.now() / 1000 + 60) throw new PaymentError("BOLT11_QUOTE_MISMATCH");
  const paymentHash = digestHexSchema.parse(hashes[0]?.data);
  if (expected.metadata !== undefined) {
    // LUD-06 lets a payer server commit to the metadata with tag `h`, or describe the payment in
    // plain text with tag `d`. Observed in production: blink.sv sends `h`, oksu.su sends `d`.
    const descriptionHash = decoded.tagsObject.purpose_commit_hash;
    const description = decoded.tagsObject.description;
    const metadataHash = createHash("sha256").update(expected.metadata, "utf8").digest("hex");
    const matches = descriptionHash !== undefined
      ? descriptionHash === metadataHash && description === undefined
      : typeof description === "string";
    if (!matches) throw new PaymentError("BOLT11_METADATA_MISMATCH");
  }
  const expiresAt = new Date(decoded.timeExpireDate * 1000);
  if (expected.future && expiresAt.getTime() <= Date.now() + 30_000) throw new PaymentError("BOLT11_EXPIRED");
  return { paymentHash, expiresAt };
}
