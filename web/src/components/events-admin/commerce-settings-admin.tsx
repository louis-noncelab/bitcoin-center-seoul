"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { commerceSettingsRecord, type CommerceSettingsRecord } from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const priceSources = [
  { value: "UPBIT", label: "업비트 KRW-BTC" },
  { value: "BITHUMB", label: "빗썸 BTC_KRW" },
  { value: "FIXED", label: "고정 환율" },
] as const;

export function CommerceSettingsAdmin() {
  const [settings, setSettings] = useState<CommerceSettingsRecord | null>(null);
  const [source, setSource] = useState<CommerceSettingsRecord["btcPriceSource"]>("UPBIT");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/settings", commerceSettingsRecord, { signal: abort.signal })
      .then((value) => {
        if (abort.signal.aborted) return;
        setSettings(value); setSource(value.btcPriceSource); setAuthenticated(true);
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);

  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired) return;
    const form = new FormData(event.currentTarget);
    const input = {
      paymentProvider: String(form.get("paymentProvider")),
      btcPriceSource: String(form.get("btcPriceSource")),
      fixedKrwPerBtc: String(form.get("fixedKrwPerBtc") ?? "").trim(),
      productDisplayUnit: String(form.get("productDisplayUnit")),
      guestPurchaseAllowed: form.has("guestPurchaseAllowed"),
      maintenanceMode: form.has("maintenanceMode"),
    };
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const saved = await adminRequest("/api/admin/settings", commerceSettingsRecord, jsonBody(input, "PATCH"));
      setSettings(saved); setSource(saved.btcPriceSource); setMessage("저장했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  if (authenticated === null) {
    return error
      ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></>
      : <p role="status">로그인 확인 중…</p>;
  }
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;
  if (!settings) return <p role="status">설정을 불러오는 중…</p>;

  return <div className="events-admin-workspace">
    <CommerceAdminNav current="/admin/settings" disabled={pending} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 입력한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    <form className="events-form" onSubmit={(event) => void save(event)}>
      <h2>결제·환율 설정</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <label>결제 제공자<FormControl>
          <select name="paymentProvider" defaultValue={settings.paymentProvider}>
            <option value="ZAPRITE">Zaprite 체크아웃{settings.configured.ZAPRITE ? "" : " (환경변수 미설정)"}</option>
            <option value="LNURL">라이트닝 주소 LUD-21{settings.configured.LNURL ? "" : " (환경변수 미설정)"}</option>
          </select>
        </FormControl></label>
        <p className="muted">환경변수가 설정되지 않은 제공자는 저장할 수 없습니다. 라이트닝 주소는 테스트망이 없어 샌드박스에서 쓸 수 없습니다.</p>

        <fieldset className="collection-kind"><legend>비트코인 시세 출처</legend><div className="button-row">
          {priceSources.map((option) => <label className="events-checkbox" key={option.value}>
            <ChoiceControl type="radio" name="btcPriceSource" value={option.value} checked={source === option.value} onChange={() => setSource(option.value)} />
            {option.label}
          </label>)}
        </div></fieldset>
        <p className="muted">1순위 거래소가 응답하지 않으면 나머지 거래소로 한 번 더 시도합니다. 둘 다 실패하면 주문을 받지 않습니다. 시세는 60초 이내 값만 사용합니다.</p>

        <div hidden={source !== "FIXED"}><fieldset className="events-editor-fields" disabled={source !== "FIXED"}>
          <label>고정 환율 (KRW / BTC)<FormControl>
            <input name="fixedKrwPerBtc" inputMode="decimal" defaultValue={settings.fixedKrwPerBtc} placeholder="150000000" aria-describedby="fixed-rate-help" />
          </FormControl></label>
          <p id="fixed-rate-help" className="muted">거래소 시세 대신 이 값으로 환산합니다. 소수점 10자리까지 입력할 수 있습니다.</p>
        </fieldset></div>

        <label>상품 가격 표시 단위<FormControl>
          <select name="productDisplayUnit" defaultValue={settings.productDisplayUnit}>
            <option value="SATS">사토시</option>
            <option value="BTC">BTC</option>
          </select>
        </FormControl></label>

        <label className="events-checkbox"><ChoiceControl type="checkbox" name="guestPurchaseAllowed" defaultChecked={settings.guestPurchaseAllowed} />비회원 주문 허용</label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} />점검 모드</label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>{pending ? "저장 중…" : "저장"}</Button></div>
    </form>
  </div>;
}
