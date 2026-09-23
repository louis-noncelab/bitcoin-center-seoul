"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { MenuSelect } from "@/components/ui/menu-select";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { adminOrderRecord, orderStatusLabels, type AdminOrderRecord } from "@/lib/commerce-contract";
import { orderPaymentHistory, paymentActionLabels, paymentOperationErrors, paymentStatusLabels, refundMethodLabels, refundRecordingMethods } from "@/lib/order-payment-contract";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

type Operation = "PAID" | "CANCELLED" | "CANCEL_PAID" | "REFUND";
const operations = {
  PAID: { title: "입금을 확인했나요?", description: "제공자 또는 지갑에서 주문 금액 전액을 받은 근거를 확인해 주세요. 결제 완료와 재고 차감이 함께 기록됩니다.", label: "결제 완료로 처리", path: "payment" },
  CANCELLED: { title: "미입금 주문을 취소할까요?", description: "제공자에서 입금이 없고 진행 중인 라이트닝 결제도 없음을 확인한 주문만 취소해 주세요. 예약 재고와 쿠폰 한도가 반환됩니다. 이후 입금은 운영자 확인 대상으로 남습니다.", label: "미입금 취소 확정", path: "payment" },
  CANCEL_PAID: { title: "주문을 취소하고 환불 대기로 변경할까요?", description: "수령·배송을 중단하고 환불 대기로 기록합니다. 고객 안내는 이메일로 직접 보내 주세요. 이 버튼은 돈을 보내거나 메일을 보내거나 재고를 복구하지 않습니다.", label: "취소·환불 대기로 처리", path: "cancel-paid" },
  REFUND: { title: "최초 결제 사토시 전액을 환불했나요?", description: "고객과 환불 받을 비트코인 주소 또는 라이트닝 지급 수단을 확인하고, 최초 결제 사토시 전액을 외부에서 송금한 증빙을 기록해 주세요. 원화 시세로 다시 계산하지 않습니다. 이 화면은 송금하거나 메일을 보내지 않습니다. 재고 복구를 선택했다면 판매 가능한 실물을 확인해 주세요.", label: "환불 완료 기록", path: "refund" },
} as const;
const stamp = (date: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(date));

export function OrderPaymentControls({ order, open, disabled, onPendingChange, onError, onUpdated, onDirtyChange }: {
  readonly order: AdminOrderRecord;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly onPendingChange: (pending: boolean) => void;
  readonly onError: (error: unknown) => void;
  readonly onUpdated: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<(typeof refundRecordingMethods)[number]>("LIGHTNING");
  const [proof, setProof] = useState("");
  const [restock, setRestock] = useState(false);
  const [providerReference, setProviderReference] = useState("");
  const [pendingHtlcsCleared, setPendingHtlcsCleared] = useState(false);
  const [history, setHistory] = useState<z.infer<typeof orderPaymentHistory>>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const { confirm, dialog } = useConfirmation();
  const payment = order.payments[0];
  const version = payment?.updatedAt;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    adminRequest(`/api/admin/orders/${order.id}/payment`, orderPaymentHistory, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) { setHistory(value); setHistoryError(""); } })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setHistoryError(errorText(caught, "ko")); });
    return () => controller.abort();
  }, [open, order.id, version, historyRevision]);

  function failure(caught: unknown) {
    setError(caught instanceof AdminRequestError && caught.code ? paymentOperationErrors[caught.code] ?? errorText(caught, "ko") : errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) onError(caught);
  }
  async function refresh() {
    if (busy.current || disabled || !payment) return;
    busy.current = true; onPendingChange(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/orders/${order.id}/payment`, adminOrderRecord, jsonBody({ paymentId: payment.id }, "PATCH"));
      onUpdated(); setHistoryRevision((value) => value + 1); setMessage("결제 상태를 다시 확인했습니다.");
    } catch (caught) { failure(caught); }
    finally { busy.current = false; onPendingChange(false); }
  }
  async function submit(operation: Operation) {
    if (busy.current || disabled || order.privacyRedactedAt || !payment || !reason.trim() || (operation === "REFUND" && !proof.trim()) || (operation === "CANCELLED" && (!providerReference.trim() || !pendingHtlcsCleared))) return;
    busy.current = true;
    const action = operations[operation];
    try {
      if (!await confirm({ title: action.title, description: `주문 ${order.id} · ${new Intl.NumberFormat("ko").format(BigInt(order.amountSats))} sats. ${action.description}`, confirmLabel: action.label })) return;
      onPendingChange(true); setError(""); setMessage("");
      await adminRequest(`/api/admin/orders/${order.id}/${action.path}`, adminOrderRecord, jsonBody({
        paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt, reason: reason.trim(),
        ...((operation === "PAID" || operation === "CANCELLED") ? { decision: operation } : {}),
        ...(operation === "CANCELLED" ? { unpaidEvidence: { providerReference: providerReference.trim(), pendingHtlcsCleared: true } } : {}),
        ...(operation === "REFUND" ? { method, proof: proof.trim(), restock } : {}),
      }, "POST"));
      setReason(""); setProof(""); setRestock(false); setProviderReference(""); setPendingHtlcsCleared(false); onDirtyChange(false);
      setMessage(`${action.label}했습니다.`); onUpdated(); setHistoryRevision((value) => value + 1);
    } catch (caught) { failure(caught); }
    finally { busy.current = false; onPendingChange(false); }
  }
  const receipt = payment && (payment.status === "PAID" || payment.paidAt !== null);
  const inFlight = payment && (payment.status === "CREATING" || payment.creationUnknown);
  const canResolve = !order.privacyRedactedAt && payment && order.payments.length === 1 && !inFlight && order.status !== "PAID" && order.refundStatus === "NONE" && order.fulfillmentStatus === "UNFULFILLED";
  const refundPending = order.refundStatus === "PENDING";
  const needsRefund = !order.privacyRedactedAt && refundPending;
  const canRestock = history.some((entry) => entry.action === "order.paid.cancelled" && entry.summary.inventoryConsumed);
  const hasActions = !order.privacyRedactedAt && (canResolve || (receipt && order.refundStatus === "NONE") || needsRefund);
  return <section className="events-editor-fields" aria-label="결제 처리">
    {dialog}
    <h4>결제 처리</h4>
    <p>{payment ? paymentStatusLabels[payment.status] : "결제 내역 없음"}{payment?.paidAt ? ` · 입금 확인 ${stamp(payment.paidAt)}` : ""}</p>
    {order.refundStatus !== "NONE" && <p>{refundPending ? "환불 대기 · 비트코인으로 전액 환불한 뒤 기록해 주세요." : `환불 완료${order.refundedAt ? ` · ${stamp(order.refundedAt)}` : ""}`}</p>}
    {inFlight && <p className="muted">인보이스 생성 결과를 먼저 확인해야 수동 처리할 수 있습니다.</p>}
    <div className="button-row">
      {payment && <Button variant="secondary" disabled={disabled} onClick={() => void refresh()}>결제 상태 다시 확인</Button>}
      <Button variant="quiet" disabled={disabled} onClick={() => { onUpdated(); setHistoryRevision((value) => value + 1); }}>최신 주문 불러오기</Button>
    </div>
    {error && <p className="events-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {hasActions && <>
      <label>수동 처리 사유<FormControl><textarea value={reason} required maxLength={2000} rows={3} disabled={disabled} onChange={(event) => { setReason(event.target.value); onDirtyChange(Boolean(event.target.value || proof || restock || providerReference || pendingHtlcsCleared)); }} /></FormControl></label>
      {canResolve && !receipt && payment.status !== "PROCESSING" && <div className="events-editor-fields">
        <p className="muted">미입금 취소 전 제공자 또는 수신 지갑에서 최종 결제 상태를 확인하세요. 인보이스 기한만 지난 것은 미입금 증빙이 아닙니다.</p>
        <label>제공자 조회 참조<FormControl><input value={providerReference} maxLength={500} disabled={disabled} placeholder="조회 시각·결제 해시·제공자 확인 번호" onChange={(event) => { setProviderReference(event.target.value); onDirtyChange(Boolean(event.target.value || reason || proof || restock || pendingHtlcsCleared)); }} /></FormControl></label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" checked={pendingHtlcsCleared} disabled={disabled} onChange={(event) => { setPendingHtlcsCleared(event.target.checked); onDirtyChange(Boolean(event.target.checked || reason || proof || restock || providerReference)); }} />제공자에서 입금 없음과 진행 중인 HTLC 없음 확인</label>
      </div>}
      {needsRefund && <>
        <p className="muted">원결제 {new Intl.NumberFormat("ko").format(BigInt(order.amountSats))} sats 전액을 비트코인으로 직접 환불한 뒤 기록하세요. 환불 시점의 원화 시세로 재계산하지 않습니다. 이 화면에서 자동 송금하지 않습니다.</p>
        <label>환불 방식<FormControl><MenuSelect value={method} disabled={disabled} onChange={(event) => { const selected = refundRecordingMethods.find((candidate) => candidate === event.target.value); if (selected) { setMethod(selected); onDirtyChange(true); } }}>{refundRecordingMethods.map((value) => <option key={value} value={value}>{refundMethodLabels[value]}</option>)}</MenuSelect></FormControl></label>
        <label>환불 증빙<FormControl><input value={proof} required maxLength={500} disabled={disabled} placeholder="라이트닝 결제 해시·온체인 트랜잭션 ID" onChange={(event) => { setProof(event.target.value); onDirtyChange(Boolean(event.target.value || reason || restock)); }} /></FormControl></label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" checked={restock} disabled={disabled || !canRestock} onChange={(event) => { setRestock(event.target.checked); onDirtyChange(true); }} />미발송 또는 반품 확인한 상품을 판매 재고로 복구</label>
      </>}
      <div className="button-row">
        {canResolve && <Button disabled={disabled || !reason.trim()} onClick={() => void submit("PAID")}>입금 확인 후 결제 완료</Button>}
        {canResolve && !receipt && payment.status !== "PROCESSING" && <Button variant="secondary" disabled={disabled || !reason.trim() || !providerReference.trim() || !pendingHtlcsCleared} onClick={() => void submit("CANCELLED")}>미입금 확인 후 취소</Button>}
        {receipt && order.refundStatus === "NONE" && <Button variant="secondary" disabled={disabled || !reason.trim()} onClick={() => void submit("CANCEL_PAID")}>주문 취소·환불 대기</Button>}
        {needsRefund && <Button disabled={disabled || !reason.trim() || !proof.trim()} onClick={() => void submit("REFUND")}>외부 환불 완료 기록</Button>}
      </div>
    </>}
    <h4>처리 이력 <span className="muted">최근 50건</span></h4>
    {historyError ? <p className="events-error" role="alert">{historyError}</p> : !history.length ? <p className="muted">관리자 처리 이력이 없습니다.</p> : <ol>
      {history.map((entry) => <li key={entry.id}>
        <p>{paymentActionLabels[entry.action] ?? "관리자 처리"} · {stamp(entry.createdAt)} · {entry.actorId === "admin" ? "관리자 (공용 계정)" : "운영자"}</p>
        {entry.summary.toOrderStatus && <p>{orderStatusLabels[entry.summary.toOrderStatus]}</p>}
        {entry.summary.reason && <p>{entry.summary.reason}</p>}
        {entry.summary.unpaidEvidence && <>
          <p className="commerce-reference">제공자 조회 참조 · {entry.summary.unpaidEvidence.providerReference}</p>
          <p>진행 중 HTLC 없음 확인됨</p>
        </>}
        {entry.summary.method && <p className="commerce-reference">{refundMethodLabels[entry.summary.method]} · {entry.summary.proof}</p>}
        {entry.summary.restock !== undefined && <p>{entry.summary.restock ? "판매 재고 복구" : "재고 복구 없음"}</p>}
      </li>)}
    </ol>}
  </section>;
}
