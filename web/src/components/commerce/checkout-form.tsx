"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { FormField, FormNotice } from "@/components/ui/form-field";
import { Button } from "@/components/ui/primitives";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api-client";
import { centerContent } from "@/content/center";
import type { Locale } from "@/i18n/routing";
import { quoteRequestBody, sharedFulfillments } from "./cart";
import { clearCart } from "./cart-store";
import { createdSchema, quoteSchema, type Countries, type Fulfillment, type Product, type Quote } from "./contracts";
import { ContactFields } from "./contact-fields";
import { ShippingFields, type ShippingDraft } from "./shipping-fields";
import { CheckoutSummary } from "./checkout-summary";
import { RequestError } from "./request-error";
import { constraintError, FieldError, fieldError } from "./field-error";
import { useDisplayUnit } from "./display-unit";
import { bitcoin, fulfillmentLabels, submissionHeaders } from "./format";

const emptyDraft: ShippingDraft = { line1: "", line2: "", city: "", region: "", postalCode: "" };

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
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submission, setSubmission] = useState<ReturnType<typeof submissionHeaders> | null>(null);
  const [shippingDraft, setShippingDraft] = useState<ShippingDraft>(emptyDraft);
  const busy = useRef(false);
  const country = fulfillment === "DOMESTIC" ? "KR" : internationalCountry;
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const shippingAvailable = fulfillment === "PICKUP" || countries.some((item) => fulfillment === "DOMESTIC" ? item.code === "KR" : item.code !== "KR");
  const itemsKey = items.map((item) => `${item.variantId}:${item.quantity}`).join(",");
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
  // Switching away from a shipped fulfillment must not carry the typed address along.
  const [appliedFulfillment, setAppliedFulfillment] = useState(fulfillment);
  if (appliedFulfillment !== fulfillment) {
    setAppliedFulfillment(fulfillment);
    if (fulfillment === "PICKUP") setShippingDraft(emptyDraft);
  }
  const summaryItems = items.map((item) => {
    const variant = item.product.variants.find((entry) => entry.id === item.variantId);
    return { product: item.product, quantity: item.quantity, option: variant ? (ko ? variant.optionLabelKo : variant.optionLabelEn) : "" };
  });
  const notesError = fieldError(error, "notes", locale);

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
        if (!quote) {
          const nextQuote = await apiRequest("/api/orders/quote", quoteSchema, jsonRequest(quoteRequestBody(items, fulfillment, country, couponCode)));
          setQuote(nextQuote);
          return;
        }
        const headers = submission ?? submissionHeaders();
        if (!submission) setSubmission(headers);
        const result = await apiRequest("/api/orders", createdSchema, { ...jsonRequest({
          quoteId: quote.id,
          customer: { name: data.get("name"), email: data.get("email"), phone: data.get("phone") },
          locale,
          ...(notes ? { notes } : {}),
          ...(fulfillment === "PICKUP" ? {} : { address: { countryCode: country, postalCode: data.get("postalCode"), region: data.get("region"), city: data.get("city"), line1: data.get("line1"), line2: data.get("line2") } }),
        }), headers });
        if (fromCart) clearCart();
        router.push(`/orders/${result.id}`);
      } catch (failure) {
        setError(failure);
        if (failure instanceof ApiError && ["QUOTE_EXPIRED", "QUOTE_STALE"].includes(failure.code)) { setQuote(null); setSubmission(null); }
      } finally { busy.current = false; setPending(false); }
    }}>
      <fieldset className="commerce-fieldset form-stack" disabled={pending}>
        <ContactFields error={error} locale={locale} shipping={fulfillment !== "PICKUP"} />
        <fieldset className="commerce-fieldset form-stack">
          <legend>{ko ? "수령 방법" : "Delivery method"}</legend>
          {!allowed.length && <FormNotice>{ko ? "선택한 상품을 함께 받을 수 있는 수령 방법이 없습니다. 장바구니에서 상품을 나눠 주문해 주세요." : "These items cannot share a delivery method. Remove items from the cart and order them separately."}</FormNotice>}
          <div className="commerce-choices">{(["PICKUP", "DOMESTIC", "INTERNATIONAL"] as const).map((value) => <label key={value} className="commerce-choice" data-selected={fulfillment === value}>
            <input className="choice-input" type="radio" name="fulfillment" value={value} checked={fulfillment === value} disabled={!allowed.includes(value)} onChange={() => { setFulfillment(value); invalidateQuote(); }} />
            <span>{fulfillmentLabels[locale][value]}{!allowed.includes(value) && <small>{ko ? "이 주문은 이용 불가" : "Unavailable for this order"}</small>}</span>
          </label>)}</div>
        </fieldset>
        {fulfillment === "PICKUP" && <p className="commerce-pickup">{centerContent[locale].visit.address.value}</p>}
        <ShippingFields error={error} locale={locale} fulfillment={fulfillment} country={country} countries={countries} draft={shippingDraft} onCountry={(value) => { setInternationalCountry(value); invalidateQuote(); }} />
        <FormField id="coupon-code" label={ko ? "쿠폰 코드" : "Coupon code"}>
          <input id="coupon-code" name="couponCode" value={couponCode} maxLength={40} autoComplete="off" onChange={(event) => { setCouponCode(event.target.value); invalidateQuote(); }} />
        </FormField>
        <FormField id="order-notes" label={ko ? "요청 사항 (선택)" : "Order notes (optional)"} hint={ko ? "배송·수령 관련 요청을 500자까지 남길 수 있습니다. 견적 금액은 바뀌지 않습니다." : "Optional delivery or pickup notes, up to 500 characters. Notes do not change the quoted total."}>
          <textarea id="order-notes" name="notes" maxLength={500} rows={3} autoComplete="off" aria-invalid={Boolean(notesError)} aria-describedby={`order-notes-hint${notesError ? " order-notes-error" : ""}`} />
          <FieldError id="order-notes" error={notesError} />
        </FormField>
      </fieldset>
      <RequestError error={error} locale={locale} returnTo={returnTo} />
      {quote && <FormNotice kind="info">{ko ? "배송비를 포함한 총액을 확인했습니다. 아래 버튼을 누르면 이 금액으로 주문합니다." : "Review the total including shipping. Continue below to place your order at this amount."}</FormNotice>}
      <div className="form-actions">
        <Button type="submit" disabled={pending || !allowed.length || !shippingAvailable}>{pending ? (ko ? "처리 중…" : "Processing…") : quote ? (ko ? `${bitcoin(quote.amountSats, locale, unit)} 주문하기` : `Place order · ${bitcoin(quote.amountSats, locale, unit)}`) : (ko ? "배송비·총액 확인" : "Calculate shipping & total")}</Button>
        {quote && <Button variant="secondary" disabled={pending} onClick={invalidateQuote}>{ko ? "견적 다시 받기" : "Refresh quote"}</Button>}
      </div>
    </form>
    <CheckoutSummary locale={locale} items={summaryItems} quote={quote} />
  </div>;
}
