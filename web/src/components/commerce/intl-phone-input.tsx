"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { fullPhone, phoneCountries, phoneEntry } from "./phone-number";

export function IntlPhoneInput({ locale, required, invalid, describedBy }: {
  readonly locale: Locale; readonly required: boolean; readonly invalid: boolean; readonly describedBy?: string;
}) {
  const ko = locale === "ko";
  const [country, setCountry] = useState("KR");
  const [national, setNational] = useState("");
  const unrecognizedCode = /^(?:\+|00)/.test(national.trim());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const options = useMemo(() => phoneCountries(locale), [locale]);
  const matches = useMemo(() => options.filter((item) => item.search.includes(query.trim().toLocaleLowerCase(locale))), [locale, options, query]);
  const selected = options.find((item) => item.code === country);
  const container = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const number = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open && matches[active]) document.getElementById(`${listId}-${matches[active].code}`)?.scrollIntoView({ block: "nearest" });
  }, [open, matches, active, listId]);

  useEffect(() => {
    number.current?.setCustomValidity(unrecognizedCode ? (ko ? "국가번호를 확인해 주세요." : "Check the country calling code.") : "");
  }, [unrecognizedCode, ko]);

  const choose = (code: string) => {
    setCountry(code);
    setOpen(false);
    setQuery("");
    setActive(0);
    number.current?.focus();
  };

  return <div className="commerce-phone" ref={container}>
    <input type="hidden" name="phone" value={fullPhone(country, national)} />
    <div className="commerce-phone-select">
      <button ref={selector} type="button" className="commerce-phone-trigger" aria-label={`${ko ? "전화 국가번호" : "Phone country code"}: ${selected?.name ?? country} ${selected?.dial ?? ""}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} onClick={() => setOpen((value) => !value)}>
        <span>{country} <strong>{selected?.dial ?? ""}</strong></span><ChevronDown className="icon" aria-hidden="true" />
      </button>
      {open && <div className="commerce-phone-menu" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); selector.current?.focus(); }
        if (event.key === "Tab") setOpen(false);
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, matches.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
        if (event.key === "Enter" && matches[active]) { event.preventDefault(); choose(matches[active].code); }
      }}>
        <input ref={search} type="search" autoComplete="off" aria-label={ko ? "국가 또는 국가번호 검색" : "Search country or calling code"} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={matches[active] ? `${listId}-${matches[active].code}` : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} />
        <div id={listId} role="listbox" aria-label={ko ? "전화 국가번호" : "Phone country codes"}>
          {matches.length ? matches.map((item, index) => <button key={item.code} type="button" tabIndex={-1} id={`${listId}-${item.code}`} role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={() => choose(item.code)}>{item.name}<span>{item.dial}</span></button>) : <p>{ko ? "일치하는 국가가 없습니다." : "No matching country."}</p>}
        </div>
      </div>}
    </div>
    <input ref={number} id="customer-phone" type="tel" autoComplete="tel-national" inputMode="tel" required={required} pattern={String.raw`(?:[ \(\)\.\-]*[0-9]){6,}[ \(\)\.\-]*`} maxLength={34} value={national} onChange={(event) => {
      const next = phoneEntry(event.target.value, country);
      setCountry(next.country);
      setNational(next.national);
    }} aria-invalid={invalid || unrecognizedCode} aria-describedby={[describedBy, unrecognizedCode ? "customer-phone-prefix-error" : ""].filter(Boolean).join(" ")} placeholder={ko ? "국가번호 제외한 전화번호" : "Number without country code"} />
    {unrecognizedCode && <p id="customer-phone-prefix-error" className="commerce-field-error">{ko ? "국가번호를 찾지 못했습니다. 국가를 선택하거나 번호를 확인해 주세요." : "Calling code not found. Choose a country or check the number."}</p>}
  </div>;
}
