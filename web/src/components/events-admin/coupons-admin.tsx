"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { adminCouponRecord, couponKindLabels, type AdminCouponRecord } from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const couponsSchema = z.array(adminCouponRecord);
const kinds = ["PERCENT", "KRW", "SATS"] as const;
const day = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value));
// `datetime-local` has no zone, and the center operates in Seoul.
const toSeoulIso = (value: string) => `${value}:00+09:00`;

export function CouponsAdmin() {
  const [coupons, setCoupons] = useState<AdminCouponRecord[]>([]);
  const [kind, setKind] = useState<(typeof kinds)[number]>("PERCENT");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/coupons", couponsSchema, { signal: abort.signal })
      .then((items) => { if (!abort.signal.aborted) { setCoupons(items); setAuthenticated(true); } })
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

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const maxDiscount = String(data.get("maxDiscountAmount") ?? "").trim();
    const usageLimit = String(data.get("usageLimit") ?? "").trim();
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest("/api/admin/coupons", z.unknown(), jsonBody({
        code: String(data.get("code")).trim(),
        nameKo: String(data.get("nameKo")).trim(),
        nameEn: String(data.get("nameEn")).trim(),
        discountKind: kind,
        discountValue: String(data.get("discountValue")).trim(),
        minPurchaseAmount: String(data.get("minPurchaseAmount") ?? "0").trim() || "0",
        ...(maxDiscount ? { maxDiscountAmount: maxDiscount } : {}),
        ...(usageLimit ? { usageLimit: Number(usageLimit) } : {}),
        perUserLimit: Number(data.get("perUserLimit")),
        validFrom: toSeoulIso(String(data.get("validFrom"))),
        validUntil: toSeoulIso(String(data.get("validUntil"))),
        active: true,
      }));
      form.reset(); setDirty(false);
      setMessage("쿠폰을 만들었습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function deactivate(coupon: AdminCouponRecord) {
    if (busy.current || expired) return;
    const accepted = await confirm({
      title: "쿠폰 중지",
      description: `${coupon.code} 쿠폰을 중지할까요? 이미 적용된 주문은 그대로 유지됩니다.`,
      confirmLabel: "중지",
    });
    if (!accepted || busy.current) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/coupons/${coupon.id}`, z.unknown(), { method: "DELETE" });
      setMessage("중지했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  if (authenticated === null) {
    return error
      ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></>
      : <p role="status">로그인 확인 중…</p>;
  }
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;

  return <div className="events-admin-workspace">
    {dialog}
    <CommerceAdminNav current="/admin/coupons" disabled={pending} dirty={dirty} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 다시 로그인한 뒤 계속해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>

    <div className="events-admin-toolbar"><h2>쿠폰</h2></div>
    <ul className="events-admin-list">
      {coupons.map((coupon) => <li key={coupon.id}>
        <div>
          <h3>{coupon.code}<span className="muted"> · {coupon.nameKo}</span></h3>
          <p className="muted">
            {couponKindLabels[coupon.discountKind]} {new Intl.NumberFormat("ko").format(BigInt(coupon.discountValue))}
            {coupon.discountKind === "PERCENT" ? "%" : ""}
            {` · ${day(coupon.validFrom)} ~ ${day(coupon.validUntil)}`}
            {` · 사용 ${coupon.usageCount}${coupon.usageLimit ? `/${coupon.usageLimit}` : ""}`}
            {coupon.active ? "" : " · 중지됨"}
          </p>
        </div>
        <div className="button-row">
          {coupon.active && <Button variant="quiet" disabled={pending || expired} onClick={() => void deactivate(coupon)}>중지</Button>}
        </div>
      </li>)}
      {!coupons.length && <li>등록된 쿠폰이 없습니다.</li>}
    </ul>

    <form className="events-form" onChange={() => setDirty(true)} onSubmit={(event) => void create(event)}>
      <h2>쿠폰 만들기</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <div className="events-field-grid">
          <label>코드<FormControl><input name="code" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" autoCapitalize="characters" spellCheck={false} placeholder="OPENING10" /></FormControl></label>
          <label>이름<FormControl><input name="nameKo" required maxLength={80} placeholder="개관 기념" /></FormControl></label>
        </div>
        <label>영어 이름<FormControl><input name="nameEn" required maxLength={80} placeholder="Opening discount" /></FormControl></label>

        <fieldset className="collection-kind"><legend>할인 방식</legend><div className="button-row">
          {kinds.map((value) => <label className="events-checkbox" key={value}>
            <ChoiceControl type="radio" name="discountKind" value={value} checked={kind === value} onChange={() => setKind(value)} />
            {couponKindLabels[value]}
          </label>)}
        </div></fieldset>

        <div className="events-field-grid">
          <label>{kind === "PERCENT" ? "할인율 (1–100)" : kind === "KRW" ? "할인액 (원)" : "할인액 (사토시)"}<FormControl><input name="discountValue" required inputMode="numeric" pattern="[1-9][0-9]*" /></FormControl></label>
          <label>최소 주문액 (사토시)<FormControl><input name="minPurchaseAmount" inputMode="numeric" pattern="[0-9]*" defaultValue="0" /></FormControl></label>
        </div>
        <div className="events-field-grid">
          <label>최대 할인액 (사토시, 선택)<FormControl><input name="maxDiscountAmount" inputMode="numeric" pattern="[1-9][0-9]*" /></FormControl></label>
          <label>총 사용 횟수 (선택)<FormControl><input name="usageLimit" type="number" min={1} max={1000000} step={1} /></FormControl></label>
        </div>
        <label>1인당 사용 횟수<FormControl><input name="perUserLimit" type="number" required min={1} max={100} step={1} defaultValue={1} /></FormControl></label>
        <p className="muted">비회원 주문에서는 1인당 횟수를 주문 요청 단위로만 셀 수 있습니다. 총 사용 횟수를 함께 정해 주세요.</p>

        <div className="events-field-grid">
          <label>시작<FormControl><input name="validFrom" type="datetime-local" required /></FormControl></label>
          <label>종료<FormControl><input name="validUntil" type="datetime-local" required /></FormControl></label>
        </div>
        <p className="muted">시각은 한국 표준시로 저장됩니다.</p>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>쿠폰 만들기</Button></div>
    </form>
  </div>;
}
