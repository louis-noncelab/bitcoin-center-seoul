"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { MenuSelect } from "@/components/ui/menu-select";
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
  const [dirty, setDirty] = useState(false);
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
      lightningAddressId: String(form.get("lightningAddressId") ?? "") || null,
      notificationChannel: String(form.get("notificationChannel") || "GENERIC"),
      notificationWebhook: String(form.get("notificationWebhook") ?? "").trim(),
      clearNotificationWebhook: form.has("clearNotificationWebhook"),
      notificationEmail: String(form.get("notificationEmail") ?? "").trim(),
    };
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const saved = await adminRequest("/api/admin/settings", commerceSettingsRecord, jsonBody(input, "PATCH"));
      setDirty(false); setSettings(saved); setSource(saved.btcPriceSource); setMessage("저장했습니다.");
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
    <CommerceAdminNav current="/admin/settings" disabled={pending} dirty={dirty} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 입력한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    <form className="events-form" onChange={() => setDirty(true)} onSubmit={(event) => void save(event)}>
      <h2>결제·환율 설정</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <label>결제 제공자<FormControl>
          <MenuSelect name="paymentProvider" defaultValue={settings.paymentProvider}>
            <option value="ZAPRITE">Zaprite 체크아웃{settings.configured.ZAPRITE ? "" : " (환경변수 미설정)"}</option>
            <option value="LNURL">라이트닝 주소 LUD-21{settings.configured.LNURL ? "" : " (환경변수 미설정)"}</option>
          </MenuSelect>
        </FormControl></label>
        <p className="muted">Zaprite를 고르면 영수증과 주문 내역은 Zaprite가 처리합니다. 라이트닝 주소를 고르면 이 서버가 인보이스, 입금 확인, 재고, 고객 메일, 주문 알림을 처리합니다. 라이트닝 주소는 테스트망이 없어 샌드박스에서 선택할 수 없습니다.</p>
        <label>받을 라이트닝 주소<FormControl>
          <MenuSelect name="lightningAddressId" defaultValue={settings.lightningAddressId ?? ""}>
            <option value="">환경변수에 있는 주소</option>
            {settings.lightningAddresses.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.address}</option>)}
          </MenuSelect>
        </FormControl></label>
        <p className="muted">주소는 아래에서 여러 개 등록할 수 있습니다. 결제는 여기서 고른 주소 하나로 받습니다.</p>
        <label>주문 알림 웹훅<FormControl>
          <MenuSelect name="notificationChannel" defaultValue={settings.notificationChannel}>
            <option value="GENERIC">Discord·Mattermost 모두</option>
            <option value="DISCORD">Discord</option>
            <option value="MATTERMOST">Mattermost</option>
          </MenuSelect>
        </FormControl></label>
        <label>웹훅 주소<FormControl>
          <input name="notificationWebhook" type="url" autoComplete="off" placeholder={settings.notificationWebhookRegistered ? "등록됨. 바꾸려면 새 주소를 입력" : "https://"} aria-describedby="webhook-help" />
        </FormControl></label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" name="clearNotificationWebhook" />등록된 웹훅 주소 지우기</label>
        <p id="webhook-help" className="muted">주소만 암호화해서 저장합니다. 채널에 보이는 주문 알림 문장은 암호화하지 않습니다. 상품 주문과 밋업 예약이 접수되거나 결제되면 이 주소로 보냅니다.</p>
        <label>주문 알림 메일<FormControl>
          <input name="notificationEmail" type="email" required defaultValue={settings.notificationEmail} autoComplete="email" spellCheck={false} />
        </FormControl></label>
        <p className="muted">주문이 들어오거나 결제가 확인되면 이 주소로 관리자 메일을 보냅니다. 기록 모드에서는 메일 발송 화면에만 남고 나가지 않습니다. 금액은 위의 가격 표시 단위를 따릅니다.</p>

        <fieldset className="collection-kind"><legend>비트코인 시세 출처</legend><div className="button-row">
          {priceSources.map((option) => <label className="events-checkbox" key={option.value}>
            <ChoiceControl type="radio" name="btcPriceSource" value={option.value} checked={source === option.value} onChange={() => setSource(option.value)} />
            {option.label}
          </label>)}
        </div></fieldset>
        <p className="muted">1순위 거래소가 응답하지 않으면 나머지 거래소로 한 번 더 시도합니다. 둘 다 연결되지 않으면 마지막으로 받은 시세로 계산합니다. 한 번도 받은 적이 없으면 주문을 받지 않습니다. 실시간 시세는 60초 이내 값만 사용합니다.</p>

        <div hidden={source !== "FIXED"}><fieldset className="events-editor-fields" disabled={source !== "FIXED"}>
          <label>고정 환율 (KRW / BTC)<FormControl>
            <input name="fixedKrwPerBtc" inputMode="decimal" defaultValue={settings.fixedKrwPerBtc} placeholder="150000000" aria-describedby="fixed-rate-help" />
          </FormControl></label>
          <p id="fixed-rate-help" className="muted">거래소 시세 대신 이 값으로 환산합니다. 소수점 10자리까지 입력할 수 있습니다.</p>
        </fieldset></div>

        <label>상품 가격 표시 단위<FormControl>
          <MenuSelect name="productDisplayUnit" defaultValue={settings.productDisplayUnit}>
            <option value="KRW">원화</option>
            <option value="SATS">사토시</option>
            <option value="BTC">BTC</option>
          </MenuSelect>
        </FormControl></label>
        <p className="muted">상점·상품·장바구니에 보이는 가격 단위입니다. 원으로 매긴 상품을 사토시나 BTC로 보여 줄 때, 그리고 사토시로 매긴 상품을 원화로 보여 줄 때는 현재 시세를 사용합니다. 실제 결제 금액은 주문 견적으로 확정됩니다.</p>

        <label className="events-checkbox"><ChoiceControl type="checkbox" name="guestPurchaseAllowed" defaultChecked={settings.guestPurchaseAllowed} />비회원 주문 허용</label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} />점검 모드</label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>{pending ? "저장 중…" : "저장"}</Button></div>
    </form>
    <form className="events-form" onSubmit={(event) => {
      event.preventDefault();
      if (busy.current || expired) return;
      const form = new FormData(event.currentTarget);
      busy.current = true; setPending(true); setError("");
      void adminRequest("/api/admin/lightning-addresses", z.object({ id: z.string() }), jsonBody({
        label: String(form.get("label") ?? ""),
        address: String(form.get("address") ?? ""),
      }, "POST")).then(() => { setMessage("라이트닝 주소를 등록했습니다."); setRevision((value) => value + 1); })
        .catch((caught: unknown) => { if (caught instanceof AdminRequestError) setError(errorText(caught, "ko")); })
        .finally(() => { busy.current = false; setPending(false); });
    }}>
      <h2>라이트닝 주소 등록</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <label>이름<FormControl><input name="label" required maxLength={40} placeholder="센터 메인" /></FormControl></label>
        <label>주소<FormControl><input name="address" required placeholder="satb@oksu.su" autoComplete="off" spellCheck={false} /></FormControl></label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>주소 추가</Button></div>
      <ul>{settings.lightningAddresses.map((item) => <li key={item.id}>{item.label} · {item.address}
        <Button type="button" variant="secondary" disabled={pending} onClick={() => {
          void adminRequest(`/api/admin/lightning-addresses/${item.id}`, z.object({ deleted: z.boolean() }), jsonBody({}, "DELETE"))
            .then(() => setRevision((value) => value + 1))
            .catch((caught: unknown) => setError(errorText(caught, "ko")));
        }}>삭제</Button></li>)}</ul>
    </form>
  </div>;
}
