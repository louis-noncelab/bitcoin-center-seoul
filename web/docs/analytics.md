# GTM 및 분석 이벤트

분석은 기본적으로 비활성이다. 검토한 GTM 컨테이너 ID와
`NEXT_PUBLIC_ANALYTICS_APPROVED=true`가 모두 빌드 시점에 있어야 외부 스크립트를
로드하고 CSP를 확장한다. 승인 플래그는 실제 컨테이너 태그, 동의 설정, 수신 업체,
수집 항목, 보관기간과 국외이전 고지의 검토를 마친 뒤 설정한다. ID만 넣으면
활성화되지 않는다. 실제 컨테이너 설정이 없는 릴리스에서는 활성화하지 않는다.

현재 운영 컨테이너는 `GTM-PDMNB37Z`이며 GA4 측정 ID는 `G-HKG8YB2WS9`이다.
빌드 설정은 [수동 배포 안내](../../DEPLOY.md#gtm-빌드-설정)에 명시한다.
태그가 시작하기 전에 광고 저장, 광고용 사용자 데이터, 맞춤 광고, 분석 저장을
모두 `denied`로 설정한다. 분석 쿠키를 쓰지 않는 제한된 측정만 허용하며,
방문자나 세션을 계속 추적하려면 이용자의 선택을 받는 절차를 먼저 구현한다.
쿠키 없는 측정에서도 Google에 요청이 전송되므로 분석이 완전히 꺼졌다고 안내하지 않는다.

운영 CSP는 nonce와 strict-dynamic을 유지하며 Google의 현재 GA4 전송 경로인
`https://www.google.com/g/collect`를 공개 페이지의 connect-src에만 허용한다.
GTM의 사용자 정의 JavaScript 변수는 운영 CSP에서 실행되지 않는다. page_location은
기본 제공 Page URL 변수나 CSP 호환 사용자 정의 템플릿으로 설정하고 게시한다.
폼 자동 측정과 사용자 제공 데이터 자동 감지는 Google 계정에서도 끈다.
GA4 보관 기간은 실제 계정 설정을 확인하여 개인정보 처리방침에 구체적으로 반영한다.
계정에 접근하지 못한 상태에서 기본 보관 기간이나 DebugView 수신을 확인했다고 기록하지 않는다.

관리자와 주문 확인 페이지는 별도의 루트 레이아웃으로 이동하며 GTM을 로드하지
않는다. 그 경계를 넘을 때 문서를 새로 요청한다. 민감 페이지의 HTTP referrer
정책은 no-referrer이다. 이름, 이메일, 전화번호, 주소, 문의 내용, 확인 코드는
dataLayer 이벤트에 포함하지 않는다. GTM의 태그와 자동 page_view도 이 제한을
지켜야 하며, 폼 자동 수집과 임의 사용자 속성 수집을 활성화하지 않는다.

view_item은 상품 종류, 공개 식별자, 상품명과 언어를 보낸다. begin_checkout은
검증된 주문 항목의 items(item_id, item_name, quantity), 총 quantity, 종류와 언어를
보내며 한 항목일 때 item_id도 제공한다. 구매는 진행 중인 주문/결제 흐름에서만
기록하고 완료된 결제 주소를 새로 여는 것만으로 집계하지 않는다. 주문 참조를
transaction_id로 사용하며 브라우저 저장소와 지원 브라우저의 Web Locks로 중복을
막는다. 다른 탭이 잠금을 보유하면 기다리지 않고 선택적 분석을 건너뛴다.
저장소가 차단되면 같은 문서의 메모리로만 중복을 막을 수 있다.

purchase는 kind, item_name, order_id, transaction_id, locale, amount_sats를 보낸다.
주문에 저장된 원화 금액이 있을 때만 value와 currency=KRW를 보낸다. 무료 신청은
0원이다. 환율 없이 결제하는 고정 사토시 주문은 원화 값을 추정하지 않으며
amount_sats만 제공한다. 원화 매출 보고서에서 이런 주문을 0원으로 해석하지 않는다.
주문 상세 조회가 실패하면 불완전한 purchase를 보내지 않고 확인 페이지로 이동한다.
브라우저 측 분석은 차단, 이탈, 네트워크 장애로 누락될 수 있으며 주문 원장을 대신하지 않는다.

collab_submit은 접수 성공과 언어만, outbound_click은 X/Instagram과 언어만,
outbound_legacy_meetup은 외부 예약 링크 클릭과 언어만 보낸다.

검증 명령은 npm run test:analytics와 tests/analytics.spec.ts이다. 활성 경로는
NEXT_PUBLIC_GTM_ID=GTM-TEST 및 NEXT_PUBLIC_ANALYTICS_APPROVED=true로 검증하고,
비활성 경로도 별도 빌드/실행한다. Google 요청은 fixture로 처리한다.
