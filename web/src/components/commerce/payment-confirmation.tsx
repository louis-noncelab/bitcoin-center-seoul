"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { apiRequest } from "@/lib/api-client";
import type { Locale } from "@/i18n/routing";
import { bitcoin } from "./format";
import { useDisplayRate, useDisplayUnit } from "./display-unit";

const schema = z.object({
  code: z.string(),
  status: z.enum(["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED", "REVIEW"]),
  customerName: z.string(),
  fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]),
  fulfillmentStatus: z.string(),
  addressText: z.string().nullable(),
  items: z.array(z.object({ titleKo: z.string(), titleEn: z.string(), quantity: z.number(), amountSats: z.string() })),
  sessions: z.array(z.object({ titleKo: z.string(), titleEn: z.string(), url: z.string(), note: z.string(), noteEn: z.string() })).default([]),
  amountSats: z.string(),
  createdAt: z.string(),
});

const orderStatus = {
  ko: { PENDING_PAYMENT: "결제 대기", PAID: "결제 확인", EXPIRED: "결제 만료", CANCELLED: "주문 취소", REVIEW: "확인 필요" },
  en: { PENDING_PAYMENT: "Awaiting payment", PAID: "Payment confirmed", EXPIRED: "Payment expired", CANCELLED: "Cancelled", REVIEW: "Needs review" },
} as const;

export function PaymentConfirmation({ code, locale }: { readonly code: string; readonly locale: Locale }) {
  const [data, setData] = useState<z.infer<typeof schema> | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/orders/confirm/${code}`, schema, { signal: controller.signal })
      .then((result) => setData(result))
      .catch(() => { if (!controller.signal.aborted) setError(ko ? "확인 정보를 불러오지 못했습니다." : "Could not load this confirmation."); });
    return () => controller.abort();
  }, [code, ko]);

  useEffect(() => {
    const url = window.location.href;
    let active = true;
    import("qrcode").then((QR) => QR.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 320 }))
      .then((image) => { if (active) setQr(image); })
      .catch(() => { if (active) setQr(null); });
    return () => { active = false; };
  }, []);

  if (!data && !error) return <p className="commerce-payment-wait" role="status"><ButtonSpinner />{ko ? "결제 확인을 불러오는 중…" : "Loading confirmation…"}</p>;
  if (error || !data) return <p className="events-error" role="alert">{error}</p>;
  const labels = orderStatus[ko ? "ko" : "en"];
  return <div className="form-stack">
    <div className="commerce-status-heading">
      {data.status !== "PAID" && <h2 aria-live="polite">{labels[data.status]}</h2>}
      <p className="commerce-payment-amount">{bitcoin(data.amountSats, locale, unit, rate)}</p>
      <p className="muted">{data.customerName}</p>
    </div>
    {data.status === "PENDING_PAYMENT" && <p className="commerce-payment-wait" role="status"><ButtonSpinner />{ko ? "입금을 확인하는 중입니다." : "Waiting for the payment."}</p>}
    <figure className="commerce-qr">
      {qr ? <Image src={qr} width={320} height={320} unoptimized alt={ko ? "결제 확인 QR 코드" : "Payment confirmation QR code"} /> : <div className="commerce-qr-loading">{ko ? "확인 QR을 만드는 중…" : "Preparing confirmation QR…"}</div>}
      <figcaption className="muted">{ko ? "이 QR은 결제 확인 페이지입니다. 센터에서 보여 주세요." : "This QR opens the payment confirmation. Show it at the center."}</figcaption>
    </figure>
    <ul className="commerce-items">
      {data.items.map((item) => <li key={`${item.titleKo}-${item.quantity}`}><div><strong>{ko ? item.titleKo : item.titleEn}</strong><span className="muted">{ko ? `${item.quantity}개` : `Qty ${item.quantity}`}</span></div><span>{bitcoin(item.amountSats, locale, unit, rate)}</span></li>)}
    </ul>
    <p>{data.fulfillment === "PICKUP" ? (ko ? "센터에서 수령합니다." : "Pickup at the center.") : (ko ? "배송" : "Delivery")}{data.addressText ? ` · ${data.addressText}` : ""}</p>
    {data.status === "PAID" && data.sessions.map((session) => <div key={session.url} className="form-stack">
      <a className="button" href={session.url} target="_blank" rel="noopener noreferrer">{ko ? "온라인 참여" : "Join online"}</a>
      {(ko ? session.note : session.noteEn || session.note) && <p className="muted">{ko ? session.note : session.noteEn || session.note}</p>}
    </div>)}
  </div>;
}
