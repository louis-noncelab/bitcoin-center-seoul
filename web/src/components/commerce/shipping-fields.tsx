import { MenuSelect } from "@/components/ui/menu-select";
import { FieldError, fieldError } from "./field-error";
import { FormField, FormNotice } from "@/components/ui/form-field";
import type { Locale } from "@/i18n/routing";
import type { Countries, Fulfillment } from "./contracts";

export function ShippingFields({ locale, fulfillment, country, countries, onCountry, error }: {
  readonly locale: Locale; readonly fulfillment: Fulfillment; readonly country: string;
  readonly error?: unknown; readonly countries: Countries; readonly onCountry: (value: string) => void;
}) {
  const ko = locale === "ko";
  const requiredPostal = fulfillment === "DOMESTIC" || countries.find((item) => item.code === country)?.requiresPostalCode;
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const destinations = countries.filter((item) => fulfillment === "DOMESTIC" ? item.code === "KR" : item.code !== "KR");
  const countryError = fieldError(error, "countryCode", locale);
  const line1Error = fieldError(error, "address.line1", locale);
  const line2Error = fieldError(error, "address.line2", locale);
  const cityError = fieldError(error, "address.city", locale);
  const regionError = fieldError(error, "address.region", locale);
  const postalError = fieldError(error, "address.postalCode", locale);
  return <fieldset className="commerce-fieldset form-stack" disabled={fulfillment === "PICKUP"}>
    <legend>{ko ? "배송지" : "Shipping address"}</legend>
    {destinations.length === 0 && <FormNotice kind="info">{ko ? "이 수령 방법으로 이용할 수 있는 배송지가 아직 없습니다. 다른 수령 방법을 선택하거나 센터에 문의해 주세요." : "No destinations are currently available for this delivery method. Choose another method or contact the center."}</FormNotice>}
    <FormField id="shipping-country" label={ko ? "국가" : "Country"}>
      <MenuSelect id="shipping-country" autoComplete="shipping country" value={country} required aria-invalid={Boolean(countryError)} aria-describedby={countryError ? "shipping-country-error" : undefined} onChange={(event) => onCountry(event.target.value)}>
        <option value="">{ko ? "국가 선택" : "Select a country"}</option>
        {destinations.map((item) => <option key={item.code} value={item.code}>{regionNames.of(item.code) ?? item.code}</option>)}
      </MenuSelect>
      <FieldError id="shipping-country" error={countryError} />
    </FormField>
    <FormField id="shipping-line1" label={ko ? "주소" : "Street address"}>
      <input aria-invalid={Boolean(line1Error)} aria-describedby={line1Error ? "shipping-line1-error" : undefined} id="shipping-line1" name="line1" autoComplete="shipping address-line1" maxLength={200} required />
      <FieldError id="shipping-line1" error={line1Error} />
    </FormField>
    <FormField id="shipping-line2" label={ko ? "상세주소 (선택)" : "Apartment, suite, etc. (optional)"}>
      <input aria-invalid={Boolean(line2Error)} aria-describedby={line2Error ? "shipping-line2-error" : undefined} id="shipping-line2" name="line2" autoComplete="shipping address-line2" maxLength={200} />
      <FieldError id="shipping-line2" error={line2Error} />
    </FormField>
    <div className="form-row">
      <FormField id="shipping-city" label={ko ? "시·군·구" : "City"}>
        <input aria-invalid={Boolean(cityError)} aria-describedby={cityError ? "shipping-city-error" : undefined} id="shipping-city" name="city" autoComplete="shipping address-level2" maxLength={100} required />
        <FieldError id="shipping-city" error={cityError} />
      </FormField>
      <FormField id="shipping-region" label={ko ? "시·도 / 주 (선택)" : "State / province (optional)"}>
        <input aria-invalid={Boolean(regionError)} aria-describedby={regionError ? "shipping-region-error" : undefined} id="shipping-region" name="region" autoComplete="shipping address-level1" maxLength={100} />
        <FieldError id="shipping-region" error={regionError} />
      </FormField>
    </div>
    <FormField id="shipping-postal" label={ko ? `우편번호${requiredPostal ? "" : " (선택)"}` : `Postal code${requiredPostal ? "" : " (optional)"}`}>
      <input aria-invalid={Boolean(postalError)} aria-describedby={postalError ? "shipping-postal-error" : undefined} id="shipping-postal" name="postalCode" autoComplete="shipping postal-code" inputMode={fulfillment === "DOMESTIC" ? "numeric" : "text"} {...(fulfillment === "DOMESTIC" ? { pattern: "[0-9]{5}", maxLength: 5 } : { maxLength: 20 })} required={Boolean(requiredPostal)} />
      <FieldError id="shipping-postal" error={postalError} />
    </FormField>
  </fieldset>;
}
