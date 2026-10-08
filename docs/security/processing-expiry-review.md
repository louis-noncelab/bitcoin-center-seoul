# PROCESSING 뒤 EXPIRED 관찰 정책 검토

작성일: 2026-10-02
범위: Issue #51 정책 검토 문서. 구현 승인이나 정책 확정이 아니다.

## 결론

현재 코드는 `PROCESSING` 결제에 뒤늦게 들어온 `EXPIRED` 관찰을 무시하고, 운영자가 `PROCESSING` 결제를 미입금으로 수동 취소하는 것도 막는다. 이 동작은 보수적이지만 의도된 금융 안전장치로 보는 것이 맞다. 공개 제공자 계약만으로는 "`PROCESSING` 후 `EXPIRED`가 최종 미입금을 의미한다"는 결론을 낼 수 없다.

따라서 이 문서는 현재 보류 정책을 유지하는 쪽으로 정리한다. 정책 변경은 별도 승인과 제공자별 최종 미입금 증거가 생긴 뒤에만 구현해야 한다.

## 현재 코드 사실

| 영역 | 현재 동작 | 근거 |
| --- | --- | --- |
| 공통 상태 적용 | `PROCESSING` 결제가 `EXPIRED` 관찰을 받으면 기존 결제를 그대로 반환한다. | `web/src/server/payments/state.ts:45` |
| 운영자 수동 미입금 처리 | 결제가 `PAID`이거나 `paidAt`이 있거나, 미입금 처리인데 결제가 `PROCESSING`이면 `PAYMENT_RECEIVED`로 거부한다. | `web/src/server/orders/manual-payment.ts:89` |
| 미입금 취소 API | `CREATING`, `PROCESSING`, `REVIEW`, `PAID`, `creationUnknown`은 미입금 취소할 수 없다. | `web/src/server/orders/cancel-unpaid.ts:65` |
| Zaprite 관찰 | `PENDING -> PENDING`, `PROCESSING -> PROCESSING`, `PAID/COMPLETE/OVERPAID -> PAID`, `UNDERPAID -> REVIEW`, `ABANDONED -> EXPIRED`로 매핑한다. | `web/src/server/payments/zaprite.ts:144-153` |
| LNURL 관찰 | LUD-21 `settled=false` 뒤 로컬 만료 시 `EXPIRED`가 아니라 `REVIEW/LNURL_EXPIRED_REQUIRES_RECONCILIATION`로 보낸다. | `web/src/server/payments/lnurl.ts:56` |
| REVIEW fixture | REVIEW 모드는 프로세스 내부 fixture이고 실제 네트워크나 돈을 쓰지 않는다. | `web/src/server/payments/review-transport.ts:11-80` |
| 유지보수 스캔 | `PROCESSING`, `REVIEW`, `EXPIRED` 모두 계속 재조정 대상으로 포함한다. | `web/src/server/payments/maintenance.ts:13-18` |

## 제공자·모드별 상태 진실표

| 모드 | 제공자 | 실제 네트워크 여부 | 가능한 관찰 | 현재 처리 | 해석 |
| --- | --- | --- | --- | --- | --- |
| `REVIEW` | LNURL | 없음. `lnurl.review.invalid` fixture만 사용 | `PENDING`, `PAID`, `REVIEW` | fixture 시나리오에 따라 내부 결정 | 테스트용 합성 관찰이다. 실제 HTLC나 최종 미입금 증거가 아니다. |
| `REVIEW` | Zaprite | 없음. `zaprite.review.invalid` fixture만 사용 | `PENDING`, `PROCESSING`, `PAID` | `PROCESSING` 후 `EXPIRED` fixture는 `applyObservation` 경로에서 직접 검증 | 테스트용 합성 관찰이다. 실제 Zaprite 전이 빈도 증거가 아니다. |
| `SANDBOX` | Zaprite만 허용 | 실제 Zaprite sandbox 조직 | 공개 API의 주문 상태 | `PROCESSING`은 계속 보류, `ABANDONED`만 `EXPIRED` | sandbox는 Zaprite 계약 확인용이다. 실제 운영 돈은 아니지만 외부 provider 상태를 본다. |
| `LIVE` | Zaprite | 실제 운영 provider | 공개 API의 주문 상태 | `PROCESSING`은 계속 보류, `ABANDONED`만 `EXPIRED` | `PROCESSING`은 "received a payment but pending"로 문서화되어 미입금 확정이 아니다. |
| `LIVE` | LNURL | 실제 lightning address / mainnet money | LUD-21 `settled=true/false` | 저장된 인보이스/hash/preimage 대조를 통과한 `settled=true`만 `PAID`; 만료 후 `settled=false`는 `REVIEW` | LUD-21은 알려진 invoice의 settled 여부를 답하지만, pending HTLC 없음·최종 미입금을 보증하는 서명된 negative proof는 아니다. |

## 공개 계약 확인

### Zaprite

공개 OpenAPI 문서에서 주문 생성의 `expiresAt` 설명은 "After this time, the order cannot be paid unless a payment is already in progress."라고 되어 있다. 같은 문서의 주문 응답 상태 설명에서 `PROCESSING`은 "received a payment but the transaction is still pending"으로 설명된다.

이 두 문장을 함께 보면 `expiresAt` 이후라도 이미 진행 중인 결제는 계속 처리될 수 있다. 그러므로 `PROCESSING` 뒤 관찰된 만료성 상태를 자동으로 미입금 확정 처리하면 늦은 확정 돈을 놓칠 위험이 있다.

현재 코드가 `PROCESSING`을 재고·쿠폰 해제보다 우선하여 보류하는 것은 이 계약과 충돌하지 않는다.

### LNURL / LUD-06, LUD-21

LUD-06은 `callback`으로 invoice를 발급받는 흐름을 정의한다. 유실된 callback 응답을 나중에 검색하는 표준은 없다. 이 점은 Issue #50과 연결된다.

LUD-21은 callback 응답의 `verify` URL로 알려진 invoice가 `settled`인지 확인하는 선택 확장이다. `settled=false` 응답은 결제 완료가 아니라는 관찰일 뿐, 진행 중 HTLC가 없고 나중에 돈이 들어올 수 없다는 운영 증거가 아니다.

현재 코드가 LNURL invoice 만료 후에도 `EXPIRED`가 아니라 `REVIEW/LNURL_EXPIRED_REQUIRES_RECONCILIATION`으로 보내고, 수동 미입금 취소에는 provider reference와 `pendingHtlcsCleared=true` 증거를 요구하는 것은 안전한 경계다.

## REVIEW fixture와 실제 관찰의 차이

REVIEW 모드는 회귀 테스트용 합성 상태다. `review-transport.ts`는 고정 origin만 허용하고, signed invoice도 testnet fixture로 만든다. 따라서 REVIEW에서 `PROCESSING -> EXPIRED`를 만들 수 있다는 사실은 코드 경계가 의도대로 작동한다는 증거이지, 실제 Zaprite 또는 LNURL 운영 전이가 자주 발생한다는 증거가 아니다.

정책 문서나 PR 본문에서 REVIEW fixture 결과를 "실제 제공자에서 관찰됨"으로 쓰면 안 된다.

## 계속 보류가 안전한 이유

`PROCESSING`은 돈이 없다는 상태가 아니라 돈 또는 결제 절차가 들어왔지만 아직 완료되지 않았다는 상태다. 이 상태에서 재고 예약과 쿠폰 사용을 해제하면 다음 위험이 생긴다.

- 늦게 확정된 돈이 들어왔는데 재고가 이미 다른 주문에 팔린다.
- 쿠폰 capacity가 재사용된 뒤 첫 결제가 뒤늦게 `PAID` 또는 `REVIEW`가 된다.
- 운영자가 증거 없이 "미입금"으로 닫은 뒤 provider가 결제를 확정한다.
- 고객·운영자 메일 또는 주문 상태가 돈의 실제 상태와 갈라진다.

현재 테스트가 보장하는 기존 안전장치는 이 방향이다.

- `web/tests/commerce-invariants.mjs`의 "processing payments keep coupon capacity when a stale expiry arrives"는 `PROCESSING` 뒤 `EXPIRED`가 와도 payment가 `PROCESSING`으로 남고 coupon usage가 유지되는 것을 확인한다.
- `web/tests/commerce-manual-payment.mjs`의 "`PROCESSING` payment cannot be manually marked unpaid"는 운영자 미입금 수동 취소가 `PAYMENT_RECEIVED`로 막히는 것을 확인한다.
- `web/tests/commerce-paid-cancellation.mjs`는 늦은 paid/review/cancel/refund 경계에서 재고가 이중 증가하거나 이중 차감되지 않도록 확인한다.
- `web/tests/commerce-payment-policy.mjs`는 LNURL 만료 후에도 provider 증거 없이 예약을 풀지 않고, provider-confirmed expired LNURL cancellation 뒤 늦은 돈을 `REVIEW`로 격리하는 경계를 확인한다.

## 현재 감사·재조정 경계

현재 코드 기준 운영 재조정 경계는 다음과 같다.

- `runPaymentMaintenancePass`는 `PROCESSING`, `REVIEW`, `EXPIRED`, external id가 있는 `FAILED`까지 재조정 대상으로 계속 읽는다.
- Zaprite는 저장된 `externalId` 또는 `payment.id`로 주문을 다시 조회한다.
- LNURL은 이미 발급된 invoice의 `verifyUrl`로 확인한다. 생성 결과가 유실된 invoice는 표준 검색 경로가 없어 Issue #50의 별도 정책 대상이다.
- 실제 운영 DB, 실제 결제, 운영 메일, webhook delivery 실험은 이 검토 범위 밖이다.

## 정책 변경 전에 필요한 권위 있는 증거

제공자에 해당하는 최종 미입금 증거(아래 1–3의 관련 항목)와 소유자의 처리 정책 승인(4)이 함께 필요하다. 소유자 승인만으로 제공자 증거를 대체하거나, Zaprite 증거를 LNURL에 적용하면 안 된다. 이 문서는 해당 증거가 이미 확보되었다고 주장하지 않는다.

1. Zaprite가 특정 주문·거래에 대해 더 이상 확정될 수 없다는 authoritative final state를 문서 또는 API 필드로 제공한다.
2. on-chain 결제라면 transaction/mempool/confirmation 상태와 provider order 상태가 모순 없이 최종 실패를 가리키는 운영 절차가 정해진다.
3. LNURL이라면 receiver/provider가 해당 invoice에 대해 settled payment와 pending HTLC가 없음을 확인한 운영 증거를 제공하고, 감사 로그에 provider reference를 남긴다.
4. owner가 위 증거의 책임자, 보관 방식, 재고·쿠폰 해제 시점, late-money 발생 시 처리 방식을 승인한다.

## 아직 승인되지 않은 owner 정책 결정

다음은 이 문서가 승인하지 않는다.

- `PROCESSING + EXPIRED`를 자동으로 `EXPIRED` 또는 `FAILED`로 바꾸기.
- provider final no-money proof 없이 예약 재고와 쿠폰을 해제하기.
- `PROCESSING` 결제의 미입금 수동 취소를 일반적으로 허용하기.
- REVIEW fixture 관찰을 실제 Zaprite/LNURL 운영 빈도 증거로 취급하기.
- 실제 결제, HTLC, 운영 DB, 운영 메일, webhook delivery를 이 PR에서 실험하기.

owner가 이후 정책을 정한다면 구현 이슈는 최소한 다음 회귀를 포함해야 한다.

- 모순 관찰: `PROCESSING -> EXPIRED -> PAID`
- late-money 격리와 주문 `REVIEW` 전환
- 재고 예약·stockOnHand·coupon usage 멱등성
- provider별 final no-money evidence audit
- REVIEW fixture와 sandbox/live 계약의 분리

## 이 문서의 준비 상태

문서 검토는 준비됐다. 정책 구현은 승인되지 않았다.
