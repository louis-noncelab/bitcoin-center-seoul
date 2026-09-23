"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { FormField, FormNotice } from "@/components/ui/form-field";
import { SlideRegion } from "@/components/ui/slide-region";
import "@/styles/slide-region.css";
import "@/styles/checkout-contact-address.css";
import { Button, ChoiceControl } from "@/components/ui/primitives";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api-client";
import { centerContent } from "@/content/center";
import type { Locale } from "@/i18n/routing";
import { quoteRequestBody, sharedFulfillments } from "./cart";
import { getCartItems, removePurchasedCartItems } from "./cart-store";
import { createdSchema, quoteSchema, type Countries, type Fulfillment, type Product, type Quote } from "./contracts";
import { ContactFields } from "./contact-fields";
import { ShippingFields } from "./shipping-fields";
import { CheckoutSummary } from "./checkout-summary";
import { RequestError } from "./request-error";
import { constraintError, FieldError, fieldError } from "./field-error";
import { fulfillmentLabels, submissionHeaders } from "./format";

export function CheckoutForm({ locale, items, countries, fromCart }: {
  readonly locale: Locale;
  readonly items: readonly { readonly variantId: string; readonly quantity: number; readonly product: Product }[];
  readonly countries: Countries;
  readonly fromCart: boolean;
}) {
  const router = useRouter();
  const allowedKey = sharedFulfillments(items.map((item) => item.product)).join(",");
  const allowed = (allowedKey ? allowedKey.split(",") : []) as Fulfillment[];
  const [fulfillment, setFulfillment] = useState<Fulfillment>(() => allowed[0] ?? "PICKUP");
  const [internationalCountry, setInternationalCountry] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [quoted, setQuote] = useState<{ readonly value: Quote; readonly itemsKey: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [trackedQuoteKey, setTrackedQuoteKey] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submission, setSubmission] = useState<ReturnType<typeof submissionHeaders> | null>(null);
  const busy = useRef(false);
  const country = fulfillment === "DOMESTIC" ? "KR" : internationalCountry;
  const ko = locale === "ko";
  const shippingAvailable = fulfillment === "PICKUP" || countries.some((item) => fulfillment === "DOMESTIC" ? item.code === "KR" : item.code !== "KR");
  const itemsKey = items.map((item) => `${item.variantId}:${item.quantity}`).join(",");
  const quote = quoted?.itemsKey === itemsKey ? quoted.value : null;
  const returnTo = fromCart ? `/${locale}/checkout` : `/${locale}/checkout?variant=${items[0]?.variantId ?? ""}&quantity=${items[0]?.quantity ?? 1}`;
  const invalidateQuote = () => { setQuote(null); setError(null); setSubmission(null); };
  const [quoteFor, setQuoteFor] = useState(itemsKey);
  if (quoteFor !== itemsKey) {
    setQuoteFor(itemsKey);
    setQuote(null);
    setSubmission(null);
  }
  if (allowed.length > 0 && !allowed.includes(fulfillment)) {
    setFulfillment(allowed[0] ?? "PICKUP");
    setQuote(null);
    setSubmission(null);
  }
  const summaryItems = items.map((item) => {
    const variant = item.product.variants.find((entry) => entry.id === item.variantId);
    return { product: item.product, quantity: item.quantity, option: variant ? (ko ? variant.optionLabelKo : variant.optionLabelEn) : "" };
  });
  const notesError = fieldError(error, "notes", locale);
  const reservation = items.every((item) => item.product.slug.startsWith("meetup-"));
  const [couponQuery, setCouponQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setCouponQuery(couponCode.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [couponCode]);
  const canQuote = allowed.length > 0 && shippingAvailable && !(fulfillment === "INTERNATIONAL" && country.length === 0);
  const requestKey = canQuote ? `${itemsKey}|${fulfillment}|${country}|${couponQuery}` : "";
  if (trackedQuoteKey !== requestKey) {
    setTrackedQuoteKey(requestKey);
    setQuoting(canQuote);
  }
  useEffect(() => {
    if (!canQuote) return;
    const controller = new AbortController();
    const key = itemsKey;
    let active = true;
    apiRequest("/api/orders/quote", quoteSchema, { ...jsonRequest(quoteRequestBody(items, fulfillment, country, couponQuery)), signal: controller.signal })
      .then((next) => { if (active) { setQuote({ value: next, itemsKey: key }); setQuoting(false); } })
      .catch((failure: unknown) => { if (active && !(failure instanceof DOMException && failure.name === "AbortError")) { setError(failure); setQuoting(false); } });
    return () => { active = false; controller.abort(); };
  }, [canQuote, fulfillment, country, couponQuery, itemsKey, items]);

  return <div className="commerce-checkout">
    <form className="form-stack" onInvalidCapture={(event) => { event.preventDefault(); setError(constraintError(event.currentTarget)); }} onChange={() => { setSubmission(null); }} onSubmit={async (event) => {
      event.preventDefault();
      if (busy.current) return;
      busy.current = true;
      setPending(true);
      setError(null);
      const data = new FormData(event.currentTarget);
      const notes = String(data.get("notes") ?? "").trim();
      try {
        if (!quote) return;
        const headers = submission ?? submissionHeaders();
        if (!submission) setSubmission(headers);
        const purchased = getCartItems().filter((line) => items.some((item) => item.variantId === line.variantId && item.quantity === line.quantity));
        const result = await apiRequest("/api/orders", createdSchema, { ...jsonRequest({
          quoteId: quote.id,
          customer: { name: data.get("name"), email: data.get("email"), phone: data.get("phone") },
          locale,
          ...(notes ? { notes } : {}),
          ...(fulfillment === "PICKUP" ? {} : { address: { countryCode: country, postalCode: data.get("postalCode"), region: data.get("region"), city: data.get("city"), line1: data.get("line1"), line2: data.get("line2") } }),
        }), headers });
        if (fromCart) removePurchasedCartItems(purchased);
        router.push(`/orders/${result.id}`);
      } catch (failure) {
        setError(failure);
        if (failure instanceof ApiError && ["QUOTE_EXPIRED", "QUOTE_STALE"].includes(failure.code)) { setQuote(null); setSubmission(null); }
      } finally { busy.current = false; setPending(false); }
    }}>
      <fieldset className="commerce-fieldset form-stack" disabled={pending}>
        <ContactFields error={error} locale={locale} shipping={!reservation && fulfillment !== "PICKUP"} />
        {reservation ? null : <fieldset className="commerce-fieldset form-stack">
          <legend>{ko ? "수령 방법" : "Delivery method"}</legend>
          {!allowed.length && <FormNotice>{ko ? "선택한 상품을 함께 받을 수 있는 수령 방법이 없습니다. 장바구니에서 상품을 나눠 주문해 주세요." : "These items cannot share a delivery method. Remove items from the cart and order them separately."}</FormNotice>}
          <div className="commerce-choices">{(["PICKUP", "DOMESTIC", "INTERNATIONAL"] as const).map((value) => <label key={value} className="commerce-choice" data-selected={fulfillment === value}>
            <ChoiceControl type="radio" name="fulfillment" value={value} checked={fulfillment === value} disabled={!allowed.includes(value)} onChange={() => { setFulfillment(value); invalidateQuote(); }} />
            <span>{fulfillmentLabels[locale][value]}{!allowed.includes(value) && <small>{ko ? "이 주문은 이용 불가" : "Unavailable for this order"}</small>}</span>
          </label>)}</div>
        </fieldset>}
        {reservation ? <p className="muted">{ko ? "참가비는 인원 수에 따라 바로 계산됩니다. 장소가 센터인 밋업은 현장에서 확인 페이지를 보여 주세요." : "The ticket total updates with the number of seats. Show the confirmation page at the center."}</p> : fulfillment === "PICKUP" && <p className="commerce-pickup">{centerContent[locale].visit.address.value}</p>}
        <SlideRegion open={!reservation && fulfillment !== "PICKUP"}>
          <ShippingFields key={fulfillment} error={error} locale={locale} fulfillment={fulfillment} country={country} countries={countries} onCountry={(value) => { setInternationalCountry(value); invalidateQuote(); }} />
        </SlideRegion>
        {reservation ? null : <FormField id="coupon-code" label={ko ? "쿠폰 코드" : "Coupon code"}>
          <input id="coupon-code" name="couponCode" value={couponCode} maxLength={40} autoComplete="off" onChange={(event) => { setCouponCode(event.target.value); invalidateQuote(); }} />
        </FormField>}
        <FormField id="order-notes" label={reservation ? (ko ? "전달 사항 (선택)" : "Note (optional)") : (ko ? "요청 사항 (선택)" : "Order notes (optional)")} hint={reservation ? (ko ? "입장에 필요한 말을 500자까지 남길 수 있습니다." : "Optional note for the host, up to 500 characters.") : (ko ? "배송·수령 관련 요청을 500자까지 남길 수 있습니다. 견적 금액은 바뀌지 않습니다." : "Optional delivery or pickup notes, up to 500 characters. Notes do not change the quoted total.")}>
          <textarea id="order-notes" name="notes" maxLength={500} rows={3} autoComplete="off" aria-invalid={Boolean(notesError)} aria-describedby={`order-notes-hint${notesError ? " order-notes-error" : ""}`} />
          <FieldError id="order-notes" error={notesError} />
        </FormField>
      </fieldset>
      <RequestError error={error} locale={locale} returnTo={returnTo} />
      <nav className="commerce-checkout-policies" aria-label={ko ? "주문 관련 정책" : "Order policies"}>
        <Link href="/terms-of-service" locale={locale} target="_blank" rel="noopener noreferrer">{ko ? "이용약관" : "Terms of service"}<span className="sr-only">{ko ? " (새 창)" : " (new window)"}</span></Link>
        <Link href="/privacy-policy" locale={locale} target="_blank" rel="noopener noreferrer">{ko ? "개인정보 처리방침" : "Privacy policy"}<span className="sr-only">{ko ? " (새 창)" : " (new window)"}</span></Link>
        <Link href="/refund-policy" locale={locale} target="_blank" rel="noopener noreferrer">{ko ? "환불 및 반품정책" : "Refund and return policy"}<span className="sr-only">{ko ? " (새 창)" : " (new window)"}</span></Link>
      </nav>
      <div className="form-actions">
        <Button type="submit" className="commerce-pay" disabled={pending || quoting || !quote || !allowed.length || !shippingAvailable}>{pending ? (ko ? "결제 화면으로 이동 중…" : "Opening payment…") : (ko ? "결제하기" : "Pay")}</Button>
      </div>
    </form>
    <CheckoutSummary locale={locale} items={summaryItems} quote={quote} quoting={quoting} reservation={reservation} fulfillment={fulfillment} />
  </div>;
}
