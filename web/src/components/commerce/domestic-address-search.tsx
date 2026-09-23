"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";

export type PostcodeAddress = {
  readonly postalCode: string;
  readonly region: string;
  readonly city: string;
  readonly line1: string;
};

type PostcodeResult = {
  readonly userSelectedType: "R" | "J";
  readonly roadAddress: string;
  readonly jibunAddress: string;
  readonly zonecode: string;
  readonly sido: string;
  readonly sigungu: string;
};

declare global {
  interface Window {
    kakao?: { Postcode: new (options: { oncomplete: (data: PostcodeResult) => void; onclose: () => void }) => { open: (options?: { popupKey: string }) => void } };
  }
}

const scriptUrl = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loading: Promise<void> | null = null;

function loadPostcode(): Promise<void> {
  if (window.kakao?.Postcode) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 10000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      loading = null;
      reject(new Error("Postcode service unavailable"));
    };
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.kakao?.Postcode) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

export function DomesticAddressSearch({ locale, onComplete, onFocusDetail }: {
  readonly locale: Locale; readonly onComplete: (address: PostcodeAddress) => void; readonly onFocusDetail: () => void;
}) {
  const ko = locale === "ko";
  const [state, setState] = useState<"loading" | "ready" | "failed" | "searching">("loading");
  const button = useRef<HTMLButtonElement>(null);
  const openTimeout = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadPostcode().then(() => { if (mounted.current) setState("ready"); }, () => { if (mounted.current) setState("failed"); });
    return () => { mounted.current = false; window.clearTimeout(openTimeout.current); };
  }, []);

  const open = () => {
    if (state === "failed") {
      setState("loading");
      loadPostcode().then(() => { if (mounted.current) setState("ready"); }, () => { if (mounted.current) setState("failed"); });
      return;
    }
    if (state !== "ready") return;
    if (!window.kakao?.Postcode) { setState("failed"); return; }
    try {
      let completed = false;
      new window.kakao.Postcode({
        oncomplete: (data) => {
          completed = true;
          window.clearTimeout(openTimeout.current);
          const full = (data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress).trim();
          const prefix = [data.sido, data.sigungu].filter(Boolean).join(" ");
          onComplete({ postalCode: data.zonecode, region: data.sigungu ? data.sido : "", city: data.sigungu || data.sido, line1: full.startsWith(`${prefix} `) ? full.slice(prefix.length).trim() : full });
          setState("ready");
          window.setTimeout(onFocusDetail, 0);
        },
        onclose: () => { window.clearTimeout(openTimeout.current); setState("ready"); if (!completed) button.current?.focus(); },
      }).open({ popupKey: "bcsCheckoutPostcode" });
      setState("searching");
      openTimeout.current = window.setTimeout(() => setState((current) => current === "searching" ? "ready" : current), 30000);
    } catch {
      setState("failed");
      button.current?.focus();
    }
  };

  return <div className="commerce-address-search">
    <button ref={button} type="button" onClick={open} disabled={state === "loading" || state === "searching"} aria-describedby="shipping-address-search-status">
      {state === "loading" ? (ko ? "주소 검색 준비 중…" : "Loading address search…") : state === "searching" ? (ko ? "주소 검색 중…" : "Searching…") : state === "ready" ? (ko ? "주소 검색" : "Find address") : (ko ? "주소 검색 다시 시도" : "Retry address search")}
    </button>
    <p id="shipping-address-search-status" className="field-hint" role="status">
      {state === "failed" ? (ko ? "주소 검색을 열 수 없습니다. 버튼으로 다시 시도하거나 주소를 직접 입력해 주세요." : "Address search is unavailable. Retry or enter the address manually.") : (ko ? "국내 배송 주소만 검색할 수 있습니다. 직접 입력할 수도 있습니다." : "Only Korean addresses can be searched. You can also type the address.")}
    </p>
  </div>;
}
