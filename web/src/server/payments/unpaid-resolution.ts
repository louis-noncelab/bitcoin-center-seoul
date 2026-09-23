import "server-only";
import type { Payment } from "@/generated/prisma/client";
import { HttpError } from "@/server/http";
import { validateBolt11 } from "./bolt11";
import { PaymentError } from "./types";

export function assertLnurlUnpaidResolution(payment: Payment, hasProviderEvidence: boolean): void {
  if (payment.provider !== "LNURL" || (!payment.externalId && !payment.paymentRequest)) return;
  const unresolved = () => new HttpError(409, "LNURL_RECONCILIATION_REQUIRED", "제공자에서 미입금과 진행 중인 HTLC가 없음을 확인하고 증빙을 기록해 주세요.");
  if (!payment.paymentRequest || !payment.paymentHash || !hasProviderEvidence) throw unresolved();
  let invoice;
  try {
    invoice = validateBolt11(payment.paymentRequest, { amountSats: payment.amountSats, review: payment.mode === "REVIEW" });
  } catch (error) {
    if (error instanceof PaymentError) throw unresolved();
    throw error;
  }
  if (invoice.paymentHash !== payment.paymentHash) throw unresolved();
  // A local checkout timeout does not revoke a provider invoice or an in-flight HTLC.
  if (invoice.expiresAt.getTime() > Date.now()) {
    throw new HttpError(409, "LNURL_INVOICE_STILL_PAYABLE", "제공자가 서명한 인보이스의 결제 기한이 남아 있습니다. 만료 후 제공자 내역을 다시 확인해 주세요.");
  }
}
