"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionLink, Button } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import { centerContent } from "@/content/center";
import type { Locale } from "@/i18n/routing";
import { paymentSchema, type Payment } from "./contracts";
import { useDisplayUnit } from "./display-unit";
import { bitcoin, dateTime } from "./format";
import { RequestError } from "./request-error";
import { PaymentInvoice } from "./payment-invoice";
import { statusLabels } from "./status-labels";

export function PaymentView({ id, locale, returnPath }: { readonly id: string; readonly locale: Locale; readonly returnPath: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reading = false;
    async function read() {
      if (reading || busy.current || document.visibilityState === "hidden") return;
      reading = true;
      try {
        const result = await apiRequest(`/api/payments/${id}/status`, paymentSchema, { signal: controller.signal });
        if (controller.signal.aborted || busy.current) return;
        setPayment(result); setError(null); setClock(Date.now());
        if (["CREATING", "PENDING", "PROCESSING"].includes(result.status)) timer = setTimeout(() => { void read(); }, 5000);
      } catch (failure) { if (!controller.signal.aborted) setError(failure); }
      finally { reading = false; }
    }
    const visible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void read(); } };
    void read();
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [id, revision]);
  useEffect(() => {
    if (!payment) return;
    const remaining = new Date(payment.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(remaining + 10, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [payment]);
  useEffect(() => {
    if (!payment || payment.provider !== "ZAPRITE" || payment.mode !== "LIVE" || payment.status !== "PENDING") return;
    if (!payment.checkoutUrl || !/^https:\/\//.test(payment.checkoutUrl)) return;
    window.location.assign(payment.checkoutUrl);
  }, [payment]);
  const expired = payment ? new Date(payment.expiresAt).getTime() <= clock : false;
  const payable = payment?.status === "PENDING" && payment.mode === "LIVE" && !payment.review && !payment.creationUnknown && !expired;
  return <div className="commerce-payment form-stack">
    {Boolean(error) && <RequestError error={error} locale={locale} returnTo={`/${locale}/payments/${id}`} />}
    {payment ? <>
      <div className="commerce-status-heading"><span className="caption commerce-payment-label"><Image src="/brand/bitcoin.svg" width={24} height={24} alt="" />{ko ? "비트코인 결제" : "Bitcoin payment"}</span><h2 aria-live="polite" aria-atomic="true">{statusLabels[locale][payment.status]}</h2><p className="commerce-payment-amount">{bitcoin(payment.amountSats, locale, unit)}</p></div>
      {payment.mode === "REVIEW" && <FormNotice kind="info"><strong>{ko ? "로컬 검토 모드 — 실제 비트코인을 보내지\u00a0마세요." : "Local review mode — do not send real Bitcoin."}</strong><p>{ko ? "결제 상태는 검토용 제공자에서 확인합니다." : "Payment status is provided by the review service."}</p></FormNotice>}
      {payment.status === "PAID" && <FormNotice kind="success">{ko ? "결제가 확인되었습니다. 주문·신청 화면에서 수령 또는 참가 상태를 확인해 주세요." : "Payment has been confirmed. Check your order or booking for delivery or attendance status."}</FormNotice>}
      {payment.status === "PROCESSING" && <FormNotice kind="info">{ko ? "전송이 감지되어 확인 중입니다. 같은 금액을 다시 보내지\u00a0마세요." : "Your payment was detected and is being confirmed. Do not send it again."}</FormNotice>}
      {(payment.status === "REVIEW" || payment.creationUnknown) && <FormNotice kind="info">{ko ? "결제 결과를 운영자가 확인해야 합니다. 추가 송금이나 새 결제를 진행하기 전에 센터로 문의해 주세요." : "This payment needs review. Contact the center before sending more Bitcoin or starting another payment."}</FormNotice>}
      {(payment.status === "EXPIRED" || expired && payment.status === "PENDING") && <FormNotice kind="info">{ko ? "결제 기한이 지났습니다. 기존 요청으로 송금하지 말고 현재 상태를 다시 확인해 주세요." : "The payment deadline has passed. Do not pay the old request. Check the current status below."}</FormNotice>}
      {payment.status === "FAILED" && <FormNotice>{ko ? "결제 요청을 만들지 못했습니다. 주문 상태를 확인하고 센터로 문의해 주세요." : "The payment request could not be created. Check your order and contact the center."}</FormNotice>}
      {payment.status === "NEW" && !payment.creationUnknown && <Button disabled={creating} onClick={async () => {
        if (busy.current) return;
        busy.current = true; setCreating(true); setError(null);
        try {
          const result = await apiRequest(`/api/payments/${id}/invoice`, paymentSchema, { method: "POST" });
          if (mounted.current) { setPayment(result); setClock(Date.now()); }
          if (result.provider === "ZAPRITE" && result.mode === "LIVE" && result.checkoutUrl && /^https:\/\//.test(result.checkoutUrl)) {
            window.location.assign(result.checkoutUrl);
            return;
          }
        } catch (failure) { if (mounted.current) setError(failure); }
        finally { busy.current = false; if (mounted.current) { setCreating(false); setRevision((value) => value + 1); } }
      }}>{creating ? (ko ? "결제 요청 생성 중…" : "Creating payment request…") : payment.provider === "ZAPRITE" ? (ko ? "결제하기" : "Pay now") : (ko ? "결제 요청 만들기" : "Create payment request")}</Button>}
      {payable && <PaymentInvoice key={payment.id} invoice={payment.paymentRequest} checkoutUrl={payment.checkoutUrl} locale={locale} />}
      <dl className="commerce-facts"><div><dt>{ko ? "결제 기한" : "Expires"}</dt><dd>{dateTime(payment.expiresAt, locale)} (KST)</dd></div><div><dt>{ko ? "결제 번호" : "Payment reference"}</dt><dd className="commerce-reference">{payment.id}</dd></div></dl>
    </> : !error && <p className="commerce-loading" role="status">{ko ? "결제 상태 확인 중…" : "Checking payment status…"}</p>}
    <div className="form-actions"><Button variant="secondary" disabled={creating} onClick={() => setRevision((value) => value + 1)}>{ko ? "상태 다시 확인" : "Check status"}</Button><ActionLink href={returnPath} variant="secondary">{ko ? "주문·신청 확인" : "View order / booking"}</ActionLink><ActionLink href={centerContent[locale].visit.contact.email.href} variant="quiet">{ko ? "센터에 문의" : "Contact the center"}</ActionLink></div>
  </div>;
}
