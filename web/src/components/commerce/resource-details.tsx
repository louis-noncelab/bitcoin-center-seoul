"use client";

import { useState } from "react";
import { ActionLink, Button } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { apiRequest, jsonRequest } from "@/lib/api-client";
import { centerContent } from "@/content/center";
import type { Locale } from "@/i18n/routing";
import { orderSchema } from "./contracts";
import { useResource } from "./use-resource";
import { RequestError } from "./request-error";
import { useDisplayRate, useDisplayUnit } from "./display-unit";
import { bitcoin, dateTime, fulfillmentLabels, krw } from "./format";
import { statusLabels } from "./status-labels";

function unpaidNew(payments: readonly { readonly status: string }[]) {
  return payments.some((item) => item.status === "NEW") && payments.every((item) => item.status === "NEW" || item.status === "FAILED");
}

function CancelUnpaid({ path, locale, onDone }: { readonly path: string; readonly locale: Locale; readonly onDone: () => void }) {
  const ko = locale === "ko";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { confirm, dialog } = useConfirmation();
  return <div className="form-stack">
    <RequestError error={error} locale={locale} returnTo={path.replace("/api", "")} />
    {done && <FormNotice kind="success">{ko ? "취소했습니다." : "Cancelled."}</FormNotice>}
    <Button variant="secondary" disabled={busy} onClick={() => {
      if (busy) return;
      void confirm({
        title: ko ? "결제 전 취소" : "Cancel unpaid",
        description: ko ? "결제 전 주문을 취소할까요? 확보된 재고는 다시 열립니다." : "Cancel this unpaid order? Reserved stock will be released.",
        confirmLabel: ko ? "주문 취소" : "Cancel order",
        cancelLabel: ko ? "돌아가기" : "Keep order",
      }).then((ok) => {
        if (!ok) return;
        setBusy(true); setError(null);
        void apiRequest(path, orderSchema, jsonRequest({}))
          .then(() => { setDone(true); onDone(); })
          .catch((failure: unknown) => setError(failure))
          .finally(() => setBusy(false));
      });
    }}>{busy ? (ko ? "취소 중…" : "Cancelling…") : (ko ? "결제 전 취소" : "Cancel unpaid")}</Button>
    {dialog}
  </div>;
}

function ResourceError({ error, locale, path, refresh }: { readonly error: unknown; readonly locale: Locale; readonly path: string; readonly refresh: () => void }) {
  return <div className="form-stack">
    <RequestError error={error} locale={locale} returnTo={`/${locale}${path}`} />
    <p className="muted">{locale === "ko" ? "주문한 브라우저에서 다시 열어 주세요. 확인이 어려우면 센터에 문의해 주세요." : "Open this page in the browser you used to place the order. Contact the center if you need help."}</p>
    <Button variant="secondary" onClick={refresh}>{locale === "ko" ? "다시 조회" : "Check again"}</Button>
  </div>;
}

export function OrderDetails({ id, locale }: { readonly id: string; readonly locale: Locale }) {
  const { data: order, error, refresh } = useResource(`/api/orders/${id}`, orderSchema);
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();
  if (!order) return error ? <ResourceError error={error} locale={locale} path={`/orders/${id}`} refresh={refresh} /> : <p className="commerce-loading" role="status">{ko ? "주문을 확인하는 중…" : "Loading your order…"}</p>;
  const payment = order.payments.find((item) => ["NEW", "CREATING", "PENDING", "PROCESSING"].includes(item.status));
  return <div className="commerce-resource form-stack">
    <div className="commerce-status-heading"><span className="caption">{ko ? "주문 상태" : "Order status"}</span><h2 aria-live="polite" aria-atomic="true">{statusLabels[locale][order.status]}</h2><p className="caption commerce-reference">{ko ? "주문 번호" : "Order reference"} {order.id}</p></div>
    {Boolean(error) && <ResourceError error={error} locale={locale} path={`/orders/${id}`} refresh={refresh} />}
    {order.status === "REVIEW" && <FormNotice kind="info">{ko ? "운영자가 결제와 주문 상태를 확인하고 있습니다. 추가 송금 전에 센터로 문의해 주세요." : "The center is checking your payment and order. Please contact us before sending another payment."}</FormNotice>}
    {order.refundStatus === "PENDING" && <FormNotice kind="info">{ko ? "주문이 취소되어 환불을 준비하고 있습니다. 환불 진행 상황은 센터로 문의해 주세요." : "Your order has been cancelled and a refund is pending. Contact the center for an update."}</FormNotice>}
    {order.refundStatus === "COMPLETED" && <FormNotice kind="info">{ko ? "센터에서 환불 완료를 확인했습니다." : "The center has recorded your refund as completed."}{order.refundedAt ? ` · ${dateTime(order.refundedAt, locale)}` : ""}</FormNotice>}
    <div className="commerce-resource-grid">
      <section className="commerce-panel form-stack"><h2>{ko ? "주문 상품" : "Items ordered"}</h2><ul className="commerce-items">{order.items.map((item, index) => <li key={index}><div><strong>{ko ? item.titleKo : item.titleEn}</strong><span className="muted">{ko ? item.optionLabelKo : item.optionLabelEn} · {item.quantity}{ko ? "개" : item.quantity === 1 ? " item" : " items"}</span></div><span>{bitcoin(item.amountSats, locale, unit, rate)}</span></li>)}</ul>
        <dl className="commerce-facts"><div><dt>{ko ? "배송비" : "Shipping"}</dt><dd>{bitcoin(order.shippingAmountSats, locale, unit, rate)}</dd></div><div className="commerce-total"><dt>{ko ? "총액" : "Total"}</dt><dd>{bitcoin(order.amountSats, locale, unit, rate)}</dd></div>{order.amountKrw ? <div><dt>{ko ? "결제 시점 원화" : "KRW at payment"}</dt><dd>{krw(order.amountKrw, locale)}</dd></div> : null}</dl>
        {order.status === "PENDING_PAYMENT" && payment && <ActionLink href={`/${locale}/payments/${payment.id}`}>{ko ? "결제 확인·계속하기" : "Review payment & continue"}</ActionLink>}
        {order.status === "PENDING_PAYMENT" && unpaidNew(order.payments) && <CancelUnpaid path={`/api/orders/${id}/cancel`} locale={locale} onDone={refresh} />}
        {order.holdExpiresAt && <p className="caption">{ko ? "주문 결제 기한" : "Payment due"}: {dateTime(order.holdExpiresAt, locale)}</p>}
      </section>
      <section className="commerce-panel form-stack"><h2>{fulfillmentLabels[locale][order.fulfillment]}</h2><p>{statusLabels[locale][order.fulfillmentStatus]}</p>
        <p>{order.customerName}<br />{order.customerEmail}{order.customerPhone && <><br />{order.customerPhone}</>}</p>
        {order.fulfillment === "PICKUP" ? <p>{centerContent[locale].visit.address.value}</p> : order.address && <address>{order.address.line1}<br />{order.address.line2 && <>{order.address.line2}<br /></>}{[order.address.city, order.address.region, order.address.postalCode, order.address.countryCode].filter(Boolean).join(", ")}</address>}
        {order.customerNotes ? <p><span className="caption">{ko ? "요청 사항" : "Order notes"}</span><br />{order.customerNotes}</p> : null}
        {order.trackingNumber && <p><span className="caption">{ko ? "배송 조회" : "Tracking"}</span><br />{[order.carrier, order.trackingNumber].filter(Boolean).join(" · ")}</p>}
      </section>
    </div>
    <div className="form-actions"><Button variant="secondary" onClick={refresh}>{ko ? "상태 새로고침" : "Refresh status"}</Button><ActionLink variant="quiet" href={centerContent[locale].visit.contact.email.href}>{ko ? "센터에 문의" : "Contact the center"}</ActionLink></div>
  </div>;
}
