"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { adminZoneRecord, type AdminZoneRecord } from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const zonesSchema = z.array(adminZoneRecord);
const okSchema = z.unknown();
const krw = (value: string) => `₩${new Intl.NumberFormat("ko").format(BigInt(value))}`;

export function ShippingAdmin() {
  const [zones, setZones] = useState<AdminZoneRecord[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [dirtyForms, setDirtyForms] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/shipping/zones", zonesSchema, { signal: abort.signal })
      .then((items) => { if (!abort.signal.aborted) { setZones(items); setAuthenticated(true); } })
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

  async function run(work: () => Promise<unknown>, done: string) {
    if (busy.current || expired) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try { await work(); setMessage(done); setRevision((value) => value + 1); return true; }
    catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  function markDirty(key: string) { setDirtyForms((current) => new Set(current).add(key)); }
  function saved(form: HTMLFormElement, key: string) {
    form.reset();
    setDirtyForms((current) => { const next = new Set(current); next.delete(key); return next; });
  }

  async function addZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const success = await run(() => adminRequest("/api/admin/shipping/zones", okSchema, jsonBody({
      nameKo: String(data.get("nameKo")).trim(),
      nameEn: String(data.get("nameEn")).trim(),
      active: true,
    })), "배송 지역을 추가했습니다.");
    if (success) saved(form, "zone");
  }

  async function addCountry(event: FormEvent<HTMLFormElement>, zoneId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const success = await run(() => adminRequest("/api/admin/shipping/countries", okSchema, jsonBody({
      code: String(data.get("code")).trim().toUpperCase(),
      zoneId,
      requiresPostalCode: data.has("requiresPostalCode"),
    })), "국가를 추가했습니다.");
    if (success) saved(form, `country:${zoneId}`);
  }

  async function addRate(event: FormEvent<HTMLFormElement>, zoneId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const success = await run(() => adminRequest("/api/admin/shipping/rates", okSchema, jsonBody({
      zoneId,
      maxWeightG: Number(data.get("maxWeightG")),
      amountKrw: String(data.get("amountKrw")).trim(),
    })), "무게 구간을 추가했습니다.");
    if (success) saved(form, `rate:${zoneId}`);
  }

  if (authenticated === null) {
    return error
      ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></>
      : <p role="status">로그인 확인 중…</p>;
  }
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;

  return <div className="events-admin-workspace">
    {dialog}
    <CommerceAdminNav current="/admin/shipping" disabled={pending} dirty={dirtyForms.size > 0} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 다시 로그인한 뒤 계속해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>

    <form className="events-form" onSubmit={(event) => void addZone(event)} onChange={() => markDirty("zone")}>
      <h2>배송 지역 추가</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <div className="events-field-grid">
          <label>지역 이름<FormControl><input name="nameKo" required maxLength={100} placeholder="국내" /></FormControl></label>
          <label>영어 이름<FormControl><input name="nameEn" required maxLength={100} placeholder="Domestic" /></FormControl></label>
        </div>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>지역 추가</Button></div>
    </form>

    <p className="muted">배송비는 주문 무게가 들어가는 가장 작은 구간의 금액으로 계산합니다. 어느 구간에도 들어가지 않으면 그 지역으로는 주문을 받지 않습니다.</p>

    {zones.map((zone) => <section className="events-form" key={zone.id}>
      <div className="events-admin-toolbar">
        <h2>{zone.nameKo} · {zone.nameEn}{zone.active ? "" : " (비활성)"}</h2>
        <Button variant="quiet" disabled={pending || expired} onClick={() => void (async () => {
          const accepted = await confirm({ title: "배송 지역 삭제", description: `${zone.nameKo} 지역을 삭제할까요? 연결된 국가와 요금을 먼저 삭제해야 합니다.`, confirmLabel: "삭제" });
          if (accepted) await run(() => adminRequest("/api/admin/shipping/zones", okSchema, jsonBody({ id: zone.id }, "DELETE")), "지역을 삭제했습니다.");
        })()}>지역 삭제</Button>
      </div>

      <h3>국가</h3>
      <ul className="events-admin-list">
        {zone.countries.map((country) => <li key={country.code}>
          <div><h3>{country.code}</h3><p className="muted">{country.requiresPostalCode ? "우편번호 필요" : "우편번호 없이 주문 가능"}</p></div>
          <div className="button-row"><Button variant="quiet" disabled={pending || expired} onClick={() => void run(() => adminRequest("/api/admin/shipping/countries", okSchema, jsonBody({ code: country.code }, "DELETE")), "국가를 삭제했습니다.")}>삭제</Button></div>
        </li>)}
        {!zone.countries.length && <li>등록된 국가가 없습니다.</li>}
      </ul>
      <form onSubmit={(event) => void addCountry(event, zone.id)} onChange={() => markDirty(`country:${zone.id}`)}>
        <fieldset className="events-editor-fields" disabled={pending}>
          <div className="events-field-grid">
            <label>ISO 국가 코드<FormControl><input name="code" required maxLength={2} minLength={2} placeholder="KR" autoCapitalize="characters" spellCheck={false} /></FormControl></label>
            <label className="events-checkbox"><ChoiceControl type="checkbox" name="requiresPostalCode" defaultChecked />우편번호 필요</label>
          </div>
        </fieldset>
        <div className="button-row"><Button type="submit" variant="secondary" disabled={pending || expired}>국가 추가</Button></div>
      </form>

      <h3>무게 구간</h3>
      <ul className="events-admin-list">
        {zone.rates.map((rate) => <li key={rate.id}>
          <div><h3>{new Intl.NumberFormat("ko").format(rate.maxWeightG)} g 이하</h3><p className="muted">{krw(rate.amountKrw)}</p></div>
          <div className="button-row"><Button variant="quiet" disabled={pending || expired} onClick={() => void run(() => adminRequest("/api/admin/shipping/rates", okSchema, jsonBody({ id: rate.id }, "DELETE")), "무게 구간을 삭제했습니다.")}>삭제</Button></div>
        </li>)}
        {!zone.rates.length && <li>등록된 구간이 없습니다. 구간이 없으면 이 지역으로 주문할 수 없습니다.</li>}
      </ul>
      <form onSubmit={(event) => void addRate(event, zone.id)} onChange={() => markDirty(`rate:${zone.id}`)}>
        <fieldset className="events-editor-fields" disabled={pending}>
          <div className="events-field-grid">
            <label>최대 무게 (g)<FormControl><input name="maxWeightG" type="number" required min={1} max={1000000} step={1} placeholder="2000" /></FormControl></label>
            <label>배송비 (원)<FormControl><input name="amountKrw" inputMode="numeric" required pattern="[0-9]+" placeholder="3500" /></FormControl></label>
          </div>
        </fieldset>
        <div className="button-row"><Button type="submit" variant="secondary" disabled={pending || expired}>구간 추가</Button></div>
      </form>
    </section>)}
    {!zones.length && <p className="muted">등록된 배송 지역이 없습니다. 현장 수령만 가능한 상태입니다.</p>}
  </div>;
}
