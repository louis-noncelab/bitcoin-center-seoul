"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";
import { SlideRegion } from "@/components/ui/slide-region";
import "@/styles/slide-region.css";
import { ActionLink, Button } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import type { Locale } from "@/i18n/routing";

export function PaymentInvoice({ invoice, checkoutUrl, locale }: { readonly invoice: string | null; readonly checkoutUrl: string | null; readonly locale: Locale }) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [requestOpen, setRequestOpen] = useState(false);
  const [trackedCopy, setTrackedCopy] = useState(copy);
  if (trackedCopy !== copy) {
    setTrackedCopy(copy);
    if (copy === "failed") setRequestOpen(true);
  }
  const ko = locale === "ko";
  const bolt11 = invoice && /^lnbc[0-9a-z]+$/i.test(invoice) ? invoice : null;
  useEffect(() => {
    if (!bolt11) return;
    let active = true;
    import("qrcode").then((QR) => QR.toDataURL(bolt11.toUpperCase(), { errorCorrectionLevel: "M", margin: 4, width: 360 }))
      .then((url) => { if (active) setQr(url); })
      .catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [bolt11]);
  return <div className="form-stack commerce-invoice">
    {bolt11 && <>
      <figure className="commerce-qr">{qr ? <Image src={qr} width={360} height={360} unoptimized alt={ko ? "라이트닝 결제 요청 QR 코드" : "Lightning payment request QR code"} /> : <div className="commerce-qr-loading">{qrError ? (ko ? "QR을 표시하지 못했습니다. 결제 요청을 복사해 주세요." : "QR unavailable. Copy the payment request below.") : (ko ? "결제 QR 생성 중…" : "Preparing payment QR…")}</div>}<figcaption>{ko ? "라이트닝 지갑으로 스캔하세요." : "Scan with a Lightning wallet."}</figcaption></figure>
      <div className="form-actions">
        <ActionLink href={`lightning:${bolt11}`}><ExternalLink className="icon" aria-hidden="true" />{ko ? "지갑에서 열기" : "Open wallet"}</ActionLink>
        <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(bolt11); setCopy("copied"); } catch { setCopy("failed"); } }}><Copy className="icon" aria-hidden="true" />{ko ? "결제 요청 복사" : "Copy payment request"}</Button>
      </div>
      {copy !== "idle" && <FormNotice kind={copy === "copied" ? "success" : "error"}>{copy === "copied" ? (ko ? "결제 요청을 복사했습니다." : "Payment request copied.") : (ko ? "복사하지 못했습니다. 아래 결제 요청을 직접 선택해 복사해 주세요." : "Copy failed. Select and copy the payment request below.")}</FormNotice>}
      <div className="commerce-disclosure">
        <button type="button" className="commerce-disclosure-toggle" aria-expanded={requestOpen} onClick={() => setRequestOpen((value) => !value)}>
          {ko ? "결제 요청 보기" : "View payment request"}
          <ChevronDown className="icon" aria-hidden="true" />
        </button>
        <SlideRegion open={requestOpen}>
          <label className="sr-only" htmlFor="bolt11">{ko ? "라이트닝 결제 요청" : "Lightning payment request"}</label>
          <textarea id="bolt11" className="commerce-bolt11" readOnly value={bolt11} onFocus={(event) => event.currentTarget.select()} />
        </SlideRegion>
      </div>
    </>}
    {checkoutUrl && /^https:\/\//.test(checkoutUrl) && <ActionLink href={checkoutUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="icon" aria-hidden="true" />{ko ? "결제 화면 열기" : "Open checkout"}<span className="sr-only">{ko ? " (새 창)" : " (new window)"}</span></ActionLink>}
  </div>;
}
