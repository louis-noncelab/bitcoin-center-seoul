"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import {
  adminOrderPage, adminOrderRecord, fulfillmentLabels, fulfillmentStatusLabels,
  nextFulfillment, orderStatusLabels, type AdminOrderRecord,
} from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { OrderFilters } from "./order-filters";
import { OrderPaymentControls } from "./order-payment-controls";
import { SlideRegion } from "@/components/ui/slide-region";
import "@/styles/slide-region.css";
import { AdminTabs } from "./admin-tabs";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const filters = [
  { value: "all", label: "전체" },
  { value: "PENDING_PAYMENT", label: "결제 대기" },
  { value: "PAID", label: "결제 완료" },
  { value: "REVIEW", label: "확인 중" },
  { value: "EXPIRED", label: "기한 만료" },
  { value: "CANCELLED", label: "취소됨" },
] as const;

const sats = (value: string) => `${new Intl.NumberFormat("ko").format(BigInt(value))} sats`;
const stamp = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));

function addressText(address: AdminOrderRecord["address"]) {
  if (!address) return "";
  return [address.postalCode, address.region, address.city, address.line1, address.line2, address.countryCode].filter(Boolean).join(" ");
}

export function OrdersAdmin() {
  const [query, setQuery] = useState(() => typeof window === "undefined" ? "" : window.location.search.slice(1));
  const params = new URLSearchParams(query ?? "");
  const filter = filters.find((item) => item.value === params.get("status"))?.value ?? "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shipping, setShipping] = useState<Record<string, { carrier: string; trackingNumber: string; expectedCarrier: string | null; expectedTrackingNumber: string | null }>>({});
  const [paymentDirty, setPaymentDirty] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();

  const requestKey = `${query}:${revision}`;
  const loading = loaded !== requestKey;
  const dirty = Object.values(paymentDirty).some(Boolean) || Object.values(shipping).some((draft) => Boolean(draft.carrier || draft.trackingNumber));
  const blocked = pending || loading;
  const navigation = useRef({ dirty, pending, query, confirm });
  useEffect(() => { navigation.current = { dirty, pending, query, confirm }; }, [dirty, pending, query, confirm]);
  useEffect(() => {
    const pop = async () => {
      const previous = navigation.current;
      const accepted = !previous.pending && (!previous.dirty || await previous.confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 주문 변경사항은 사라집니다.", confirmLabel: "버리기" }));
      if (!accepted) { window.history.pushState(null, "", `${window.location.pathname}?${previous.query ?? ""}`); return; }
      setShipping({}); setPaymentDirty({}); setOpenId(null); setQuery(window.location.search.slice(1));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  async function changeQuery(patch: Record<string, string>, paginate = false) {
    if (blocked) return;
    if (dirty && !await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 주문 변경사항은 사라집니다.", confirmLabel: "버리기" })) return;
    const next = new URLSearchParams(query ?? "");
    if (!paginate) next.delete("page");
    for (const [key, value] of Object.entries(patch)) { if (value && value !== "all") next.set(key, value); else next.delete(key); }
    setShipping({}); setPaymentDirty({}); setOpenId(null); setError("");
    window.history.pushState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
    setQuery(next.toString());
  }

  useEffect(() => {
    const abort = new AbortController();
    const requestQuery = new URLSearchParams(query);
    requestQuery.set("pageSize", "50"); requestQuery.delete("format");
    adminRequest(`/api/admin/orders?${requestQuery}`, adminOrderPage, { signal: abort.signal })
      .then((page) => {
        if (abort.signal.aborted) return;
        setOrders(page.items); setTotal(page.total); setAuthenticated(true); setError("");
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      }).finally(() => { if (!abort.signal.aborted) setLoaded(requestKey); });
    return () => abort.abort();
  }, [query, requestKey]);

  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }

  function updateShipping(order: AdminOrderRecord, patch: { carrier?: string; trackingNumber?: string }) {
    setShipping((current) => ({ ...current, [order.id]: { carrier: order.carrier ?? "", trackingNumber: order.trackingNumber ?? "", expectedCarrier: order.carrier, expectedTrackingNumber: order.trackingNumber, ...current[order.id], ...patch } }));
  }

  async function advance(order: AdminOrderRecord, status: NonNullable<ReturnType<typeof nextFulfillment>>) {
    if (busy.current || expired || loading) return;
    const carrier = shipping[order.id]?.carrier.trim() ?? "";
    const trackingNumber = shipping[order.id]?.trackingNumber.trim() ?? "";
    // The server refuses SHIPPED without both values, so ask for them in place first.
    if (status === "SHIPPED" && (!carrier || !trackingNumber)) {
      setOpenId(order.id);
      setError("발송으로 변경하려면 택배사와 송장 번호를 입력해 주세요.");
      return;
    }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/orders/${order.id}/fulfillment`, adminOrderRecord,
        jsonBody({ status, ...(status === "SHIPPED" ? { carrier, trackingNumber } : {}) }, "POST"));
      setMessage(`${fulfillmentStatusLabels[status]}(으)로 변경했습니다.`);
      setShipping((current) => { const next = { ...current }; delete next[order.id]; return next; });
      setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function saveTracking(order: AdminOrderRecord) {
    if (busy.current || expired || loading) return;
    const draft = shipping[order.id];
    if (!draft?.carrier.trim() || !draft.trackingNumber.trim()) { setError("택배사와 송장 번호를 입력해 주세요."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/orders/${order.id}/tracking`, adminOrderRecord, jsonBody(draft, "POST"));
      setShipping((current) => { const next = { ...current }; delete next[order.id]; return next; });
      setMessage("송장 정보를 수정했습니다."); setRevision((value) => value + 1);
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
    <CommerceAdminNav current="/admin/orders" disabled={pending} dirty={dirty} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 다시 로그인한 뒤 계속해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    <div className="events-admin-toolbar">
      <h2>주문 목록<span className="muted"> · {total}건</span></h2>
      <a className="button" data-variant="secondary" aria-disabled={blocked || undefined} onClick={(event) => { if (blocked) event.preventDefault(); }} href={`/api/admin/orders?${query ?? ""}&format=csv`}>CSV 내려받기</a>
    </div>
    <AdminTabs label="상태별 필터" items={filters} value={filter} onChange={(status) => void changeQuery({ status })} variant="quiet" disabled={blocked} />
    <OrderFilters key={`filters:${query}`} query={query ?? ""} disabled={blocked} onChange={(patch) => void changeQuery(patch)} />
    {loading && <p role="status">주문을 불러오는 중…</p>}
    <ul key={`orders:${query}`} className="events-admin-list" aria-busy={loading}>
      {orders.map((order) => {
        const step = nextFulfillment(order);
        const open = openId === order.id;
        const trackingEditable = order.status === "PAID" && order.refundStatus === "NONE" && order.fulfillment !== "PICKUP" && ["SHIPPED", "DELIVERED"].includes(order.fulfillmentStatus);
        return <li key={order.id}>
          <div>
            <h3>{order.customerName}<span className="muted"> · {sats(order.amountSats)}</span></h3>
            <p className="muted">
              {orderStatusLabels[order.status]} · {fulfillmentLabels[order.fulfillment]} · {fulfillmentStatusLabels[order.fulfillmentStatus]} · {stamp(order.createdAt)}
            </p>
            <SlideRegion open={open}><div className="events-editor-fields">
              <p className="muted">주문 번호 {order.id}</p>
              <p>{order.customerEmail}{order.customerPhone && ` · ${order.customerPhone}`}</p>
              {order.address && <p className="muted">{addressText(order.address)}</p>}
              <ul>{order.items.map((item) => <li key={item.id}>{item.titleKo} · {item.optionLabelKo || item.sku} × {item.quantity} · {sats(item.amountSats)}</li>)}</ul>
              <p className="muted">배송비 {sats(order.shippingAmountSats)}{order.amountKrw ? ` · 주문 시점 ₩${new Intl.NumberFormat("ko").format(BigInt(order.amountKrw))}` : ""}</p>
              {order.trackingNumber && <p className="muted">{order.carrier} · {order.trackingNumber}</p>}
              {order.customerNotes && <p>요청 사항: {order.customerNotes}</p>}
              <p className="muted">결제 {order.payments.map((payment) => `${payment.mode}/${payment.status}`).join(", ") || "없음"}</p>
              {(step === "SHIPPED" || trackingEditable) && <div className="events-field-grid">
                <label>택배사<FormControl><input disabled={blocked || expired} value={shipping[order.id]?.carrier ?? order.carrier ?? ""} maxLength={100} onChange={(event) => updateShipping(order, { carrier: event.target.value })} /></FormControl></label>
                <label>송장 번호<FormControl><input disabled={blocked || expired} value={shipping[order.id]?.trackingNumber ?? order.trackingNumber ?? ""} maxLength={150} onChange={(event) => updateShipping(order, { trackingNumber: event.target.value })} /></FormControl></label>
              </div>}
              {trackingEditable && <Button variant="secondary" disabled={blocked || expired || !shipping[order.id]} onClick={() => void saveTracking(order)}>송장 수정 저장</Button>}
              <OrderPaymentControls order={order} open={open} disabled={blocked || expired} onPendingChange={(value) => { busy.current = value; setPending(value); }} onError={handleError} onUpdated={() => setRevision((value) => value + 1)} onDirtyChange={(value) => setPaymentDirty((current) => current[order.id] === value ? current : { ...current, [order.id]: value })} />
            </div></SlideRegion>
          </div>
          <div className="button-row">
            <Button variant="quiet" disabled={blocked} onClick={() => setOpenId(open ? null : order.id)} aria-expanded={open}>{open ? "접기" : "자세히"}</Button>
            {order.confirmationCode && <a className="button" data-variant="secondary" href={`/ko/orders/confirm/${order.confirmationCode}`} target="_blank" rel="noopener noreferrer">{order.items.some((item) => item.sku.startsWith("MEETUP-")) ? "예약 확인" : "주문 확인"}</a>}
            {order.items.some((item) => item.sku.startsWith("MEETUP-")) && <Link href="/admin/meetups/checkin" locale="ko" className="button" data-variant="quiet">체크인</Link>}
            {step && <Button variant="secondary" disabled={blocked || expired} onClick={() => void advance(order, step)}>{fulfillmentStatusLabels[step]}로 변경</Button>}
          </div>
        </li>;
      })}
      {!orders.length && <li>{filter === "all" ? "주문이 없습니다." : "해당 상태의 주문이 없습니다."}</li>}
    </ul>
    <nav className="button-row" aria-label="주문 페이지">
      <Button variant="secondary" disabled={blocked || page <= 1} onClick={() => void changeQuery({ page: String(page - 1) }, true)}>이전 페이지</Button>
      <span>{page} / {Math.max(1, Math.ceil(total / 50))}</span>
      <Button variant="secondary" disabled={blocked || page >= Math.ceil(total / 50)} onClick={() => void changeQuery({ page: String(page + 1) }, true)}>다음 페이지</Button>
    </nav>
  </div>;
}
