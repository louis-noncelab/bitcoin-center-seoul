"use client";

import { useEffect, useRef, useState } from "react";
import { Button, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import {
  adminOrderPage, adminOrderRecord, fulfillmentLabels, fulfillmentStatusLabels,
  nextFulfillment, orderStatusLabels, type AdminOrderRecord,
} from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
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
type Filter = (typeof filters)[number]["value"];

const sats = (value: string) => `${new Intl.NumberFormat("ko").format(BigInt(value))} sats`;
const stamp = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));

function addressText(address: AdminOrderRecord["address"]) {
  if (!address) return "";
  return [address.postalCode, address.region, address.city, address.line1, address.line2, address.countryCode].filter(Boolean).join(" ");
}

export function OrdersAdmin() {
  const [filter, setFilter] = useState<Filter>("all");
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shipping, setShipping] = useState({ carrier: "", trackingNumber: "" });
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    const query = filter === "all" ? "" : `?status=${filter}`;
    adminRequest(`/api/admin/orders${query}`, adminOrderPage, { signal: abort.signal })
      .then((page) => {
        if (abort.signal.aborted) return;
        setOrders(page.items); setTotal(page.total); setAuthenticated(true);
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [filter, revision]);

  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }

  async function advance(order: AdminOrderRecord, status: NonNullable<ReturnType<typeof nextFulfillment>>) {
    if (busy.current || expired) return;
    const carrier = shipping.carrier.trim();
    const trackingNumber = shipping.trackingNumber.trim();
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
      setShipping({ carrier: "", trackingNumber: "" });
      setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function cancel(order: AdminOrderRecord) {
    if (busy.current || expired) return;
    const accepted = await confirm({
      title: "결제 전 주문 취소",
      description: `주문 ${order.id}을(를) 취소할까요? 확보된 재고는 다시 열립니다. 입금이 확인되지 않은 주문만 취소할 수 있습니다.`,
      confirmLabel: "주문 취소",
    });
    if (!accepted || busy.current) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/orders/${order.id}/cancel`, adminOrderRecord, jsonBody({}, "POST"));
      setMessage("취소했습니다."); setRevision((value) => value + 1);
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
    <CommerceAdminNav current="/admin/orders" disabled={pending} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 다시 로그인한 뒤 계속해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    <div className="events-admin-toolbar">
      <h2>주문 목록<span className="muted"> · {total}건</span></h2>
      <a className="button" data-variant="secondary" href={`/api/admin/orders?format=csv${filter === "all" ? "" : `&status=${filter}`}`}>CSV 내려받기</a>
    </div>
    <AdminTabs label="상태별 필터" items={filters} value={filter} onChange={setFilter} variant="quiet" disabled={pending} />
    <ul key={filter} className="events-admin-list">
      {orders.map((order) => {
        const step = nextFulfillment(order);
        const open = openId === order.id;
        return <li key={order.id}>
          <div>
            <h3>{order.customerName}<span className="muted"> · {sats(order.amountSats)}</span></h3>
            <p className="muted">
              {orderStatusLabels[order.status]} · {fulfillmentLabels[order.fulfillment]} · {fulfillmentStatusLabels[order.fulfillmentStatus]} · {stamp(order.createdAt)}
            </p>
            {open && <div className="events-editor-fields">
              <p className="muted">주문 번호 {order.id}</p>
              <p>{order.customerEmail}{order.customerPhone && ` · ${order.customerPhone}`}</p>
              {order.address && <p className="muted">{addressText(order.address)}</p>}
              <ul>{order.items.map((item) => <li key={item.id}>{item.titleKo} · {item.optionLabelKo || item.sku} × {item.quantity} — {sats(item.amountSats)}</li>)}</ul>
              <p className="muted">배송비 {sats(order.shippingAmountSats)}{order.amountKrw ? ` · 주문 시점 ₩${new Intl.NumberFormat("ko").format(BigInt(order.amountKrw))}` : ""}</p>
              {order.trackingNumber && <p className="muted">{order.carrier} · {order.trackingNumber}</p>}
              {order.customerNotes && <p>요청 사항: {order.customerNotes}</p>}
              <p className="muted">결제 {order.payments.map((payment) => `${payment.mode}/${payment.status}`).join(", ") || "없음"}</p>
              {step === "SHIPPED" && <div className="events-field-grid">
                <label>택배사<FormControl><input value={shipping.carrier} maxLength={100} onChange={(event) => setShipping((current) => ({ ...current, carrier: event.target.value }))} /></FormControl></label>
                <label>송장 번호<FormControl><input value={shipping.trackingNumber} maxLength={150} onChange={(event) => setShipping((current) => ({ ...current, trackingNumber: event.target.value }))} /></FormControl></label>
              </div>}
            </div>}
          </div>
          <div className="button-row">
            <Button variant="quiet" disabled={pending} onClick={() => setOpenId(open ? null : order.id)} aria-expanded={open}>{open ? "접기" : "자세히"}</Button>
            {step && <Button variant="secondary" disabled={pending || expired} onClick={() => void advance(order, step)}>{fulfillmentStatusLabels[step]}로 변경</Button>}
            {order.status === "PENDING_PAYMENT" && <Button variant="quiet" disabled={pending || expired} onClick={() => void cancel(order)}>취소</Button>}
          </div>
        </li>;
      })}
      {!orders.length && <li>{filter === "all" ? "주문이 없습니다." : "해당 상태의 주문이 없습니다."}</li>}
    </ul>
  </div>;
}
