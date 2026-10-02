"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";
import { zapriteObservationHistory } from "@/lib/zaprite-contract";
import { adminRequest, errorText } from "./request";

const orderLabels = { PENDING: "결제 대기", PROCESSING: "입금 확정 대기", PAID: "입금 확인", COMPLETE: "주문 완료", OVERPAID: "초과 입금", UNDERPAID: "부족 입금", ABANDONED: "미결제 이탈" } as const;
const transactionLabels = { PENDING: "미확정", CONFIRMED: "확정", CANCELED: "취소로 보고됨" } as const;
const methodLabels: Readonly<Record<string, string>> = { BITCOIN: "비트코인 온체인", LIGHTNING: "라이트닝", BANK: "계좌 이체" };
const stamp = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));

export function ZapriteObservations({ orderId, open, revision }: {
  readonly orderId: string; readonly open: boolean; readonly revision: string;
}) {
  const [history, setHistory] = useState<z.infer<typeof zapriteObservationHistory>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    adminRequest(`/api/admin/orders/${orderId}/payment-observations`, zapriteObservationHistory, { signal: abort.signal })
      .then((rows) => { if (!abort.signal.aborted) { setHistory(rows); setError(""); } })
      .catch((caught: unknown) => { if (!abort.signal.aborted) setError(errorText(caught, "ko")); });
    return () => abort.abort();
  }, [orderId, open, revision]);

  if (!open) return null;
  if (error) return <p className="events-error" role="alert">Zaprite 조회 기록을 불러오지 못했습니다. {error}</p>;
  if (!history.length) return null;
  return <div className="events-editor-fields" data-provider="ZAPRITE">
    <h4>Zaprite 조회 기록 <span className="muted">최근 20건</span></h4>
    <p className="muted">제공자를 다시 조회한 시점의 기록입니다. 거래 취소나 결제 기한만으로 미입금을 확정하지 않습니다.</p>
    {history.map((entry, index) => {
      const snapshot = entry.summary.zaprite;
      const transactions = snapshot.transactions;
      const pending = transactions?.some((transaction) => transaction.status === "PENDING");
      const canceled = transactions?.some((transaction) => transaction.status === "CANCELED");
      const completed = ["PAID", "COMPLETE", "OVERPAID"].includes(snapshot.status);
      return <details key={entry.id} open={index === 0} data-order-status={snapshot.status}>
        <summary>{stamp(entry.createdAt)}, {orderLabels[snapshot.status]}</summary>
        <div className="events-editor-fields">
          <p className="commerce-reference">제공자 주문 번호: {snapshot.orderId}</p>
          {snapshot.expiresAt && <p>제공자 결제 기한: {stamp(snapshot.expiresAt)}</p>}
          {snapshot.status === "PROCESSING" && <p>결제가 감지됐지만 아직 확정되지 않았습니다. 제공자의 거래 내역과 실제 수신 상태를 대조해 주세요.</p>}
          {snapshot.status === "ABANDONED" && <p>고객이 정보를 입력한 뒤 결제하지 않은 주문으로 보고됐습니다. 뒤늦은 송금 가능성은 별도로 확인해야 합니다.</p>}
          {pending && <p>미확정 거래가 있습니다. 최종 입금 확인 전 미입금 취소 근거로 사용하지 마세요.</p>}
          {canceled && <p>취소로 보고된 거래가 있습니다. 비트코인 거래가 대기 목록에서 빠진 경우도 포함되므로 최종 미입금 증거는 아닙니다.</p>}
          {completed && (pending || canceled) && <p className="events-error">주문 완료 상태와 미확정 또는 취소 거래가 함께 있습니다. 실제 입금 내역을 대조해 주세요.</p>}
          {transactions === null ? <p className="muted">제공자 응답에 거래 내역이 포함되지 않았습니다.</p>
            : !transactions.length ? <p className="muted">조회 시점에 보고된 거래가 없습니다. 지연 송금 여부는 별도로 확인해 주세요.</p>
              : <ul className="events-admin-list">
                {transactions.map((transaction, transactionIndex) => <li key={transaction.id ?? transactionIndex} data-transaction-status={transaction.status}>
                  <div>
                    <p>{methodLabels[transaction.method] ?? transaction.method}, {transactionLabels[transaction.status]}</p>
                    <p>주문 통화 기준 금액: {transaction.amountInOrderCurrency === null ? "제공되지 않음" : `${new Intl.NumberFormat("ko").format(transaction.amountInOrderCurrency)} sats`}</p>
                    {transaction.id && <p className="commerce-reference">거래 번호: {transaction.id}</p>}
                    <p className="commerce-reference">거래 참조: {transaction.externalRef ?? "제공되지 않음"}</p>
                  </div>
                </li>)}
              </ul>}
        </div>
      </details>;
    })}
  </div>;
}
