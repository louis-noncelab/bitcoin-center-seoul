"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { MenuSelect } from "@/components/ui/menu-select";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { commerceSettingsRecord, type CommerceSettingsRecord } from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const priceSources = [
  { value: "UPBIT", label: "업비트" },
  { value: "BITHUMB", label: "빗썸" },
  { value: "FIXED", label: "고정 환율" },
] as const;

export function CommerceSettingsAdmin() {
  const [settings, setSettings] = useState<CommerceSettingsRecord | null>(null);
  const [provider, setProvider] = useState<CommerceSettingsRecord["paymentProvider"]>("ZAPRITE");
  const [receiver, setReceiver] = useState("");
  const [source, setSource] = useState<CommerceSettingsRecord["btcPriceSource"]>("UPBIT");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [formVersion, setFormVersion] = useState(0);
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/settings", commerceSettingsRecord, { signal: abort.signal })
      .then((value) => {
        if (abort.signal.aborted) return;
        setSettings(value);
        setProvider(value.paymentProvider);
        setReceiver(value.lightningAddressId ?? "");
        setSource(value.btcPriceSource);
        setAuthenticated(true);
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
      expectedUpdatedAt: settings?.updatedAt ?? null,
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
      setSettings(saved);
      setProvider(saved.paymentProvider);
      setReceiver(saved.lightningAddressId ?? "");
      setSource(saved.btcPriceSource);
      setFormVersion((value) => value + 1);
      setDirty(false);
      setMessage(addressDirty ? "설정은 저장했습니다. 입력 중인 라이트닝 주소는 아직 등록되지 않았습니다." : "결제와 운영 설정을 저장했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const created = await adminRequest("/api/admin/lightning-addresses", z.object({ id: z.string() }), jsonBody({
        label: String(data.get("label") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
      }, "POST"));
      const latest = await adminRequest("/api/admin/settings", commerceSettingsRecord);
      setSettings((current) => current && ({
        ...current,
        lightningAddresses: latest.lightningAddresses,
        configured: latest.configured,
        defaultLightningAddressConfigured: latest.defaultLightningAddressConfigured,
      }));
      setReceiver(created.id);
      setDirty(true);
      form.reset();
      setAddressDirty(false);
      setMessage("주소를 등록하고 선택했습니다. 결제 설정을 저장해야 수신 주소로 적용됩니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function removeAddress(item: CommerceSettingsRecord["lightningAddresses"][number]) {
    if (busy.current || expired || settings?.lightningAddressId === item.id) return;
    const accepted = await confirm({
      title: "라이트닝 주소 삭제",
      description: "“" + item.label + "” 주소를 삭제할까요? 삭제한 주소는 복구할 수 없습니다.",
      confirmLabel: "삭제",
    });
    if (!accepted || busy.current || expired) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest("/api/admin/lightning-addresses/" + item.id, z.object({ deleted: z.boolean() }), jsonBody({}, "DELETE"));
      setSettings((current) => current && ({
        ...current,
        lightningAddresses: current.lightningAddresses.filter((address) => address.id !== item.id),
      }));
      if (receiver === item.id) { setReceiver(""); setDirty(true); }
      setMessage("주소를 삭제했습니다.");
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

  return <div className="events-admin-workspace admin-settings">
    {dialog}
    <CommerceAdminNav current="/admin/settings" disabled={pending} dirty={dirty || addressDirty} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 입력한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}
    <p role="status" aria-live="polite">{message}</p>
    <p className="admin-settings-intro">결제 받기부터 가격, 주문 알림, 판매 상태까지 순서대로 설정합니다.</p>

    <section className="admin-settings-card" aria-labelledby="payment-settings-title">
      <div className="admin-settings-heading">
        <span className="admin-settings-step">01</span>
        <div><h2 id="payment-settings-title">결제 받기</h2><p className="muted">고객이 사용할 결제 방식과 실제 수신 주소를 고릅니다.</p></div>
      </div>
      <fieldset className="admin-payment-choices" disabled={pending}>
        <legend>결제 방식</legend>
        <label className="admin-payment-choice" data-selected={provider === "ZAPRITE"}>
          <ChoiceControl type="radio" name="paymentProvider" form="commerce-settings-form" value="ZAPRITE" checked={provider === "ZAPRITE"} onChange={() => { setProvider("ZAPRITE"); setDirty(true); }} />
          <span><strong>Zaprite 체크아웃</strong><small>고객이 Zaprite 결제 화면에서 결제합니다.</small></span>
          <span className="admin-choice-status">{settings.configured.ZAPRITE ? "사용 가능" : "서버 연결 필요"}</span>
        </label>
        <label className="admin-payment-choice" data-selected={provider === "LNURL"}>
          <ChoiceControl type="radio" name="paymentProvider" form="commerce-settings-form" value="LNURL" checked={provider === "LNURL"} onChange={() => { setProvider("LNURL"); setDirty(true); }} />
          <span><strong>라이트닝 주소</strong><small>센터 주소로 직접 결제를 받습니다.</small></span>
          <span className="admin-choice-status">{settings.configured.LNURL ? "사용 가능" : "서버 연결 필요"}</span>
        </label>
      </fieldset>
      <div className="admin-receiver-workflow" hidden={provider !== "LNURL"}>
        <p className="admin-settings-note">라이트닝 주소 결제는 실제 비트코인 네트워크를 사용합니다. 테스트망 결제는 지원하지 않습니다.</p>
        <label>결제금을 받을 주소
          <FormControl><MenuSelect name="lightningAddressId" form="commerce-settings-form" value={receiver} onChange={(event) => { setReceiver(event.target.value); setDirty(true); }} disabled={pending}>
            <option value="" disabled={!settings.defaultLightningAddressConfigured}>서버에 설정된 기본 주소</option>
            {settings.lightningAddresses.map((item) => <option key={item.id} value={item.id}>{item.label}, {item.address}</option>)}
          </MenuSelect></FormControl>
        </label>
        {!settings.defaultLightningAddressConfigured && <p className="muted">서버 기본 주소가 없습니다. 등록된 주소를 선택하거나 새 주소를 추가해 주세요.</p>}
        <div className="admin-receiver-list">
          <h3>등록된 주소</h3>
          {settings.lightningAddresses.length ? <ul>{settings.lightningAddresses.map((item) => <li key={item.id}>
            <span><strong>{item.label}</strong><small>{item.address}</small></span>
            {settings.lightningAddressId === item.id ? <span className="admin-receiver-current">현재 수신</span> : <Button variant="quiet" disabled={pending || expired} onClick={() => void removeAddress(item)}>삭제</Button>}
          </li>)}</ul> : <p className="muted">{settings.defaultLightningAddressConfigured ? "등록된 주소가 없습니다. 아래에서 추가하거나 서버의 기본 주소를 사용할 수 있습니다." : "등록된 주소가 없습니다. 아래에서 결제 수신 주소를 추가해 주세요."}</p>}
        </div>
        <form className="admin-address-form" onChange={() => setAddressDirty(true)} onSubmit={(event) => void addAddress(event)}>
          <h3>새 주소 등록</h3>
          <fieldset className="events-editor-fields" disabled={pending}>
            <div className="events-field-grid">
              <label>구분할 이름<FormControl><input name="label" required maxLength={40} placeholder="센터 메인" /></FormControl></label>
              <label>라이트닝 주소<FormControl><input name="address" required autoComplete="off" spellCheck={false} placeholder="name@example.com" /></FormControl></label>
            </div>
          </fieldset>
          <Button type="submit" variant="secondary" disabled={pending || expired}>주소 추가하고 선택</Button>
          <p className="muted">주소 등록 후 아래의 ‘설정 저장’을 눌러야 결제 수신 주소가 바뀝니다.</p>
        </form>
      </div>
      {provider === "ZAPRITE" && <p className="admin-settings-note">Zaprite의 결제 연결은 서버에서 관리합니다. 수신 주소를 바꾸려면 라이트닝 주소 방식을 선택하세요.</p>}
    </section>

    <form id="commerce-settings-form" key={formVersion} className="admin-settings-form" onChange={() => setDirty(true)} onSubmit={(event) => void save(event)}>
      <section className="admin-settings-card" aria-labelledby="price-settings-title">
        <div className="admin-settings-heading">
          <span className="admin-settings-step">02</span>
          <div><h2 id="price-settings-title">가격과 환율</h2><p className="muted">원화 상품의 결제 금액과 상점의 표시 단위를 정합니다.</p></div>
        </div>
        <fieldset className="events-editor-fields" disabled={pending}>
          <fieldset className="collection-kind"><legend>비트코인 시세 출처</legend><div className="button-row">
            {priceSources.map((option) => <label className="events-checkbox" key={option.value}>
              <ChoiceControl type="radio" name="btcPriceSource" value={option.value} checked={source === option.value} onChange={() => setSource(option.value)} />
              {option.label}
            </label>)}
          </div></fieldset>
          <p className="muted">거래소 연결이 끊기면 다른 거래소와 최근 시세를 차례로 사용합니다. 시세가 없으면 주문을 받지 않습니다.</p>
          <div hidden={source !== "FIXED"}><fieldset className="events-editor-fields" disabled={source !== "FIXED"}>
            <label>고정 환율 (원 / BTC)<FormControl><input name="fixedKrwPerBtc" inputMode="decimal" defaultValue={settings.fixedKrwPerBtc} placeholder="150000000" /></FormControl></label>
            <p className="muted">거래소 시세 대신 입력한 값으로 환산합니다.</p>
          </fieldset></div>
          <label>상점 가격 표시 단위<FormControl><MenuSelect name="productDisplayUnit" defaultValue={settings.productDisplayUnit}>
            <option value="KRW">원화</option><option value="SATS">사토시</option><option value="BTC">BTC</option>
          </MenuSelect></FormControl></label>
          <p className="muted">상점 화면의 표시만 바뀝니다. 실제 결제 금액은 주문을 만들 때 확정됩니다.</p>
        </fieldset>
      </section>

      <section className="admin-settings-card" aria-labelledby="notification-settings-title">
        <div className="admin-settings-heading">
          <span className="admin-settings-step">03</span>
          <div><h2 id="notification-settings-title">주문 알림</h2><p className="muted">새 주문과 결제 완료 소식을 받을 곳을 정합니다.</p></div>
        </div>
        <fieldset className="events-editor-fields" disabled={pending}>
          <div className="events-field-grid">
            <label>알림 채널<FormControl><MenuSelect name="notificationChannel" defaultValue={settings.notificationChannel}>
              <option value="GENERIC">Discord 및 Mattermost 공통</option>
              <option value="DISCORD">Discord</option>
              <option value="MATTERMOST">Mattermost</option>
            </MenuSelect></FormControl></label>
            <label>주문 알림 이메일<FormControl><input name="notificationEmail" type="email" required defaultValue={settings.notificationEmail} autoComplete="email" spellCheck={false} /></FormControl></label>
          </div>
          <label>알림 웹훅 주소<FormControl><input name="notificationWebhook" type="url" autoComplete="off" placeholder={settings.notificationWebhookRegistered ? "등록된 주소가 있습니다. 변경하려면 새 주소를 입력하세요" : "https://"} aria-describedby="webhook-help" /></FormControl></label>
          {settings.notificationWebhookRegistered && <label className="events-checkbox"><ChoiceControl type="checkbox" name="clearNotificationWebhook" />기존 웹훅 주소 지우기</label>}
          <p id="webhook-help" className="muted">웹훅 주소는 암호화하여 보관합니다. 기록 모드에서는 이메일이 실제로 발송되지 않습니다.</p>
        </fieldset>
      </section>

      <section className="admin-settings-card" aria-labelledby="operation-settings-title">
        <div className="admin-settings-heading">
          <span className="admin-settings-step">04</span>
          <div><h2 id="operation-settings-title">판매 상태</h2><p className="muted">주문 접수와 점검 상태를 관리합니다.</p></div>
        </div>
        <fieldset className="events-editor-fields" disabled={pending}>
          <label className="events-checkbox"><ChoiceControl type="checkbox" name="guestPurchaseAllowed" defaultChecked={settings.guestPurchaseAllowed} />비회원 주문 허용</label>
          <label className="events-checkbox"><ChoiceControl type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} />점검 모드</label>
          <p className="muted">점검 모드를 켜면 새 주문 접수를 멈춥니다. 이미 접수된 주문은 유지됩니다.</p>
        </fieldset>
      </section>

      <div className="admin-settings-save" data-dirty={dirty}>
        <span role="status">{addressDirty ? "입력 중인 라이트닝 주소는 아직 등록되지 않았습니다." : dirty ? "저장하지 않은 변경사항이 있습니다." : "모든 변경사항이 저장되었습니다."}</span>
        <Button type="submit" disabled={pending || expired}>{pending ? "저장 중…" : "설정 저장"}</Button>
      </div>
    </form>
  </div>;
}
