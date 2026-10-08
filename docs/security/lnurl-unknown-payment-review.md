# LNURL 생성 결과 불명 결제 검토

Issue #50의 범위는 정책 검토다. 이 문서는 현재 코드와 공개 LNURL 규격으로 확인한 사실, 운영자가 확인해야 할 증거, 그리고 아직 결정되지 않은 정책 항목을 정리한다. 런타임 동작을 바꾸지 않으며, 이 문서만으로 생성 결과 불명 결제를 취소해도 된다고 승인하지 않는다.

## 현재 확인된 동작

- `ensureInvoice`는 인보이스 생성 중 오류가 나면 같은 callback을 다시 호출하지 않고 결제를 `REVIEW`, `creationUnknown: true`로 둔다. 생성 요청이 제공자까지 도달했을 수 있기 때문이다.
- `recoverInvoice`는 LNURL에 대해 `null`을 반환한다. LUD-06의 callback 응답이 유실된 경우, 앱이 payment hash나 verify URL을 모르는 상태에서 같은 결제 인보이스를 표준 방식으로 다시 찾는 경로는 없다.
- `reconcilePayment`는 `externalId`가 없고 `creationUnknown`인 LNURL 결제를 자동 복구하지 못한다. 결제 행은 REVIEW에 남고, 주문의 예약 재고와 쿠폰 사용도 자동 해제되지 않는다.
- `resolveManualPayment`는 `payment.status === "CREATING"` 또는 `payment.creationUnknown`이면 수동 결제 완료와 미입금 취소를 모두 `PAYMENT_IN_FLIGHT`로 막는다.
- 이미 발급된 LNURL 인보이스가 있는 경우에도 미입금 취소는 로컬 TTL만으로 허용되지 않는다. `assertLnurlUnpaidResolution`은 제공자 증거, 저장된 BOLT11/payment hash 일치, BOLT11 만료, 진행 중 HTLC 없음 확인을 요구한다.
- 늦은 입금이 확인되면 기존 전이는 주문과 결제를 `REVIEW`로 격리해 재고를 다시 차감하지 않는다.

관련 코드 위치:

- `web/src/server/payments/index.ts`
- `web/src/server/payments/provider.ts`
- `web/src/server/payments/state.ts`
- `web/src/server/payments/lnurl.ts`
- `web/src/server/payments/unpaid-resolution.ts`
- `web/src/server/orders/manual-payment.ts`
- `web/src/components/events-admin/order-payment-controls.tsx`

## 규격에서 확인되는 한계

LUD-06은 payRequest 조회 후 wallet/service가 callback URL에 `amount`를 붙여 GET 요청하고, 응답으로 BOLT11 `pr`을 받는 흐름을 정의한다. LUD-21은 callback 응답에 선택적으로 `verify` URL을 포함해 특정 인보이스의 `settled` 상태, `preimage`, `pr`을 확인하는 흐름을 정의한다.

따라서 앱이 callback 응답을 저장하지 못한 `creationUnknown` 상태에서는 최소한 다음 값이 없다.

- provider가 발급한 BOLT11 `pr`
- 앱이 비교할 `paymentHash`
- LUD-21 `verify` URL

이 상태에서 LUD-21의 `settled:false`를 조회할 대상도 없으므로, 현재의 "보류 후 사람에게 이관" 동작은 돈을 잃거나 중복 처리하지 않기 위한 안전장치다.

## 상태별 처리 가능성

| 상태 | 현재 가능한 판단 | 예약/쿠폰 처리 |
| --- | --- | --- |
| `NEW`, 인보이스 생성 전 | 로컬 기한 만료 시 `NO_INVOICE_ISSUED`로 만료 가능 | 기존 만료/취소 경로에서만 해제 |
| `CREATING`, 30초 이내 | 생성 중으로 간주 | 유지 |
| `CREATING`, 중단 후 `creationUnknown: true` | 표준 LNURL 복구 불가, 운영자 이관 필요 | 유지 |
| `REVIEW`, `creationUnknown: true`, `externalId` 없음 | 이 문서만으로 미입금 취소 불가 | 유지 |
| `PENDING`/`REVIEW`, BOLT11과 verify URL 저장됨 | 제공자 조회와 서명 인보이스 만료 확인 후 미입금 취소 검토 가능 | 감사 기록 있는 관리자 취소에서 한 번만 해제 |
| `PAID` 또는 `PROCESSING` | 미입금 취소 불가 | 결제 완료/검토 경로 유지 |
| 수동 미입금 취소 후 늦은 입금 관측 | 자동 완료하지 않고 REVIEW 격리 | 재고/쿠폰 이중 변경 금지 |

## 운영 증거 체크리스트 제안

아래는 승인된 정책이 아니라, 정책 결정을 위해 필요한 증거 후보이다.

1. 해당 결제 행의 `provider`, `mode`, `orderId`, `amountSats`, `creationUnknown`, `externalId`, `paymentHash`, `createdAt`, `updatedAt`와 인보이스/검증 URL 저장 여부를 확인한다. 원문 `paymentRequest`, 인증 토큰이 포함될 수 있는 `verifyUrl`, preimage, 고객 정보를 일반 로그·이슈·감사 요약에 복사하지 않는다. 필요한 원본 조회는 권한이 있는 제공자/수신 지갑과 암호화된 결제 저장소에서만 한다.
2. 주문 행의 현재 `status`, `holdExpiresAt`, `refundStatus`, `fulfillmentStatus`, 예약 재고와 쿠폰 사용 상태를 기록한다.
3. callback 응답이 저장된 경우에는 BOLT11의 amount, payment hash, 만료 시각이 DB 값과 일치하는지 확인한다.
4. LUD-21 verify URL이 저장된 경우에는 `settled:true`와 preimage hash 일치만 입금 증거로 인정한다. `settled:false`는 단독으로 최종 미입금 증거가 아니다.
5. callback 응답이 저장되지 않은 `creationUnknown` LNURL 결제는 수신자 또는 결제 제공자 관리 화면에서 해당 시간대, 금액, 수신 주소, 가능한 payment hash 또는 요청 로그 기준으로 정산 없음과 진행 중 HTLC 없음이 확인되어야 한다.
6. 확인자는 제공자 조회 참조, 조회 시각, 확인한 범위, "정산 없음", "진행 중 HTLC 없음"을 감사 기록에 남겨야 한다.
7. 확인 중 같은 주문에 새 checkout을 발급하지 않는다. 결제 행을 삭제하거나 `creationUnknown`을 수동으로 지우지 않는다.
8. 동일 유형의 REVIEW 보류가 누적되면 checkout 중지 여부를 소유자에게 이관한다. 시간·건수 기준, 담당자, 중지 권한은 아래 미결정 정책 항목이며 이 문서가 임의로 확정하지 않는다.

## 이미 구현된 감사와 책임 경로

현재 관리자 화면은 미입금 취소 시 다음 입력을 요구하고 `AuditLog.summary.unpaidEvidence`에 저장한다.

- `providerReference`
- `pendingHtlcsCleared: true`
- 사유, 결제 행 버전(`expectedPaymentUpdatedAt`), 이전/이후 주문·결제 상태

이 경로는 "운영자가 제공자 또는 수신 지갑을 확인했다"는 기록을 남기는 수단이지, 어떤 제공자 화면이나 어떤 사람의 권한으로 충분한지까지 승인하지 않는다. Issue #50의 남은 결정은 그 책임자, 허용 증거, 보류 기간, checkout 중지 기준을 소유자가 확정하는 것이다.

## fixture 검증으로 이미 덮은 범위

현재 테스트가 덮는 범위:

- `web/tests/commerce-manual-payment.mjs`: 생성 중 또는 `creationUnknown` 결제는 모든 수동 결정을 막는다.
- `web/tests/commerce-payment-policy.mjs`: 로컬 LNURL timeout만으로 재고를 해제하지 않는다.
- `web/tests/commerce-payment-policy.mjs`: 만료된 LNURL 인보이스 취소에는 제공자 증거가 필요하다.
- `web/tests/commerce-payment-policy.mjs`: 제공자 확인 후 취소는 재고를 한 번만 해제하고, 늦은 입금은 REVIEW로 격리한다.
- `web/tests/commerce-payment-policy.mjs`: 정비 워커는 미결제 reconciliation이 필요한 REVIEW를 보고한다.

이 문서 변경은 prose-only라 새 테스트를 추가하지 않았다. 정책이 확정되어 코드가 바뀌면 REVIEW fixture 전이, 멱등성, 예약 보호, 감사 기록, checkout 중지 조건을 새 테스트로 고정해야 한다.

## 아직 결정되지 않은 항목

- `creationUnknown: true`이며 BOLT11이 저장되지 않은 LNURL 결제를 어느 증거 조합으로 취소할 수 있는가.
- 제공자 또는 수신자 증거를 누가 확인하고, 어떤 외부 기록 식별자를 감사 기록에 남길 것인가.
- 보류가 길어질 때 고객 안내, 새 checkout 중지, 운영자 에스컬레이션 기준을 어떻게 둘 것인가.
- 여러 보류 주문이 재고와 쿠폰을 장시간 잡을 때 수동 이관 또는 판매 중지 기준을 어떻게 둘 것인가.
- 정책 확정 후 코드 변경이 필요한지, 운영 runbook만으로 충분한지.

결론: 현재 코드의 금융 안전장치는 의도된 보수적 동작이다. TTL만으로 예약·쿠폰을 해제하거나 `creationUnknown`을 지우는 변경은 이 검토 범위에서도 금지한다.
