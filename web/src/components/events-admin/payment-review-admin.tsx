"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button, FormControl } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import { reviewPaymentsPayload, reviewScenarioLabels, type ReviewPaymentRecord } from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const scenarios = Object.entries(reviewScenarioLabels) as readonly (readonly [keyof typeof reviewScenarioLabels, string])[];
const sats = (value: string) => `${new Intl.NumberFormat("ko").format(BigInt(value))} sats`;

export function PaymentReviewAdmin() {
  const [enabled, setEnabled] = useState(true);
  const [payments, setPayments] = useState<ReviewPaymentRecord[]>([]);
  const [scenario, setScenario] = useState<Record<string, string>>({});
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/review/payments", reviewPaymentsPayload, { signal: abort.signal })
      .then((payload) => {
        if (abort.signal.aborted) return;
        setEnabled(payload.enabled); setPayments(payload.payments); setAuthenticated(true);
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);

  async function simulate(payment: ReviewPaymentRecord) {
    if (busy.current || expired) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/review/payments/${payment.id}`, z.unknown(),
        jsonBody({ scenario: scenario[payment.id] ?? "pending" }));
      setMessage("제공자 응답을 적용했습니다."); setRevision((value) => value + 1);
    } catch (caught) {
      setError(errorText(caught, "ko"));
      if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
    }
    finally { busy.current = false; setPending(false); }
  }

  if (authenticated === null) {
    return error
      ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></>
      : <p role="status">로그인 확인 중…</p>;
  }
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;

  return <div className="events-admin-workspace">
    <CommerceAdminNav current="/admin/review" disabled={pending} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 다시 로그인한 뒤 계속해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>

    {!enabled
      ? <p className="muted">검토 모드가 아닙니다. 이 화면은 <code>APP_MODE</code>가 review 또는 test일 때만 동작합니다.</p>
      : <>
        <div className="events-admin-toolbar"><h2>검토 결제</h2></div>
        <p className="muted">
          돈을 쓰지 않고 결제 제공자의 응답을 골라 주문 흐름 전체를 확인합니다. 응답만 고정값으로 바꾸고,
          실제 파서·상태 전이·재고 처리는 운영과 같은 경로를 그대로 탑니다. 검토 결제는 테스트넷 전용이며
          외부 네트워크로 나가지 않습니다.
        </p>
        <ul className="events-admin-list">
          {payments.map((payment) => <li key={payment.id}>
            <div>
              <h3>{sats(payment.amountSats)}<span className="muted"> · {payment.provider}</span></h3>
              <p className="muted">
                {payment.status}{payment.reviewReason ? ` · ${payment.reviewReason}` : ""}
                {payment.creationUnknown ? " · 발행 확인 필요" : ""}
                {payment.orderId ? ` · 주문 ${payment.orderId}` : ""}
              </p>
            </div>
            <div className="button-row">
              <FormControl>
                <select
                  aria-label="제공자 응답"
                  value={scenario[payment.id] ?? "pending"}
                  onChange={(event) => setScenario((current) => ({ ...current, [payment.id]: event.target.value }))}
                >
                  {scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormControl>
              <Button variant="secondary" disabled={pending || expired} onClick={() => void simulate(payment)}>적용</Button>
              {payment.orderId && <Link href={`/orders/${payment.orderId}`} locale="ko" className="button" data-variant="quiet">주문 보기</Link>}
            </div>
          </li>)}
          {!payments.length && <li>검토 결제가 없습니다. 상점에서 주문을 하나 만들면 여기에 나타납니다.</li>}
        </ul>
      </>}
  </div>;
}
