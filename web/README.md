# Bitcoin Center Seoul — 개발 안내

Next.js 공개 사이트와 한국어 관리 화면입니다. 공개 페이지는 한영·라이트/다크를 지원합니다. 센터 소개, 프로그램, 전시, 방문 후기, 공지와 사진을 관리합니다.

## 현재 DB와 비밀번호

행사·하이라이트·공지·컬렉션·후기·운영 상태·관리자 세션과 상품·주문·결제·배송·메일 outbox는 모두 PostgreSQL/Prisma에 저장합니다. SQLite는 이전 콘텐츠의 스냅샷과 로컬 레거시 가져오기 도구에만 사용합니다. 새 PG 테이블은 migration만 실행하면 비어 있으므로 기존 SQLite 데이터는 [운영 절차](../docs/security/operations.md)의 `content:backfill`로 명시적으로 옮기고 검증합니다. 이미 PG에 내용이 있으면 차이를 조사하며 덮어쓰지 않습니다. `collection_items.purchaseUrl`은 과거 데이터에 남아 있을 수 있지만 현재 공개 컬렉션은 전시용이고 자체 Product catalog가 구매 화면입니다.

- `DATABASE_URL`: PostgreSQL 접속 URL. 비밀 설정 파일에 보관합니다.
- `BCS_EVENTS_UPLOADS`: `/images/` URL에 대응하는 공용 이미지 폴더의 절대 경로.
- `ADMIN_PASSWORD_HASH`: 기존 관리자 비밀번호로 만든 scrypt 검증값. 앱은 원문 `ADMIN_PASSWORD`를 받지 않습니다.
- `APP_ORIGIN`: 사이트의 정확한 HTTPS origin. 루프백 검토 환경에서만 HTTP를 허용합니다.
- `BCS_PUBLIC_INDEXING`: 정식 공개 시 `true`로 설정합니다. 미설정 시 검색을 차단하며 관리자 경로는 이 설정과 관계없이 차단합니다.
- `BCS_TRUST_PROXY`와 `TRUST_PROXY`: 운영에서 `true`; nginx가 `X-BCS-Client-IP`를 실제 연결 IP로 덮어써야 합니다.

기존 비밀번호를 변경할 필요 없이 다음 도구로 검증값을 만듭니다. 입력은 화면에 표시되지 않으며 새 비공개 파일(0600)에만 기록합니다. 이 파일의 `ADMIN_PASSWORD_HASH`를 앱에 제공하고 원문 환경변수는 제거합니다.

```sh
npm run admin:password -- --output /absolute/private/new-admin-password.env
```

설정이 없으면 과거 비밀번호로 대체하지 않습니다. 로그인은 무작위 HttpOnly·SameSite=Strict 쿠키를 사용하고 서버는 토큰 해시만 저장합니다. 세션은 30분 미사용 또는 발급 8시간 후 만료되며 비밀번호 검증값 변경 시 무효화됩니다. 사진을 글에서 제거해도 공유 파일은 자동 삭제하지 않습니다. 배포 전 [운영 절차](../docs/security/operations.md)의 비밀번호 전환·프록시·백업 설정을 적용하고 검증해야 합니다.

## 로컬 검토

Node 24.21.0(`.nvmrc`)과 npm을 사용합니다. 기존 `.env`/`.env.local`을 열지 않습니다. 메이저 버전 전환 후에는 잠금 파일로 새로 설치합니다. 일반 검사·빌드는 자동 환경 파일 로드를 막는 `__NEXT_PROCESSED_ENV=true`를 지정합니다.

```sh
node --version
npm ci
__NEXT_PROCESSED_ENV=true npm run check
__NEXT_PROCESSED_ENV=true npm run build
```

전체 화면 검토는 **분리된 PostgreSQL DB**에 migration을 적용하고 보호된 REVIEW 설정 파일을 명시적으로 전달합니다. `DATABASE_URL`, `APP_MODE=review`, `PAYMENT_MODE=review`, `EMAIL_MODE=capture`, 루프백 `APP_ORIGIN`, `DATA_DIR`, 암호화 키, 이미지 루트와 관리자 검증값이 필요합니다. 운영 DB나 결제 조직을 사용하지 않습니다. 이 설정으로 `npm run dev`를 실행하고 공개 `/ko`·`/en`, 관리 `/ko/admin`을 확인합니다. 이전 `review -- init/import`는 로컬 SQLite 검토 사본만 준비하며 현재 PostgreSQL 콘텐츠를 채우지 않습니다.

`npm ci`의 postinstall, `npm run typecheck`, `npm run build`는 Prisma client를 생성합니다. `prisma.config.ts`는 환경 파일을 읽지 않으며 `db:generate`에는 DB 접속이 필요하지 않습니다. `db:seed`는 로컬 데모 상품의 재고를 20으로 되돌리므로 격리된 DB에만 사용합니다.

## Commerce 로컬 검토

레거시 SQLite용 `review` 실행기는 PostgreSQL 콘텐츠 설정을 만들지 않습니다. 테스트 전용 PostgreSQL DB를 따로 준비하고 **명시적 `TEST_DATABASE_URL`**로 `npm run test:commerce`를 실행합니다. 이 테스트는 데이터를 작성·삭제하므로 개발 중인 주문 DB나 공유 sandbox DB를 지정하지 않습니다. 테스트는 REVIEW fixture를 사용하며 네트워크 결제나 이메일을 보내지 않습니다. migration은 해당 테스트 DB에만 적용합니다.

전체 화면 검토에는 보호된 새 설정 파일을 명시적으로 Node `--env-file`로 전달합니다. `APP_MODE=review`, `PAYMENT_MODE=review`, `EMAIL_MODE=capture`, 루프백 `APP_ORIGIN`/`DATABASE_URL`, 검토용 `DATA_DIR`·암호화 키·업로드 경로가 필요합니다. `db:seed`는 로컬 데모 상품을 만들고 같은 SKU의 재고를 20으로 되돌리므로 테스트 DB에만 사용합니다. 운영에 자동 seed하지 않습니다.

`PAYMENT_MODE=sandbox`는 실제 Zaprite sandbox 조직을 호출하며 별도 승인된 검증에서만 사용합니다. lightning address에는 테스트 네트워크가 없어 live 전용입니다. sandbox 주문 생성/조회가 완료 결제 증거는 아닙니다. 완료된 sandbox 결제와 live lightning 결제는 아직 검증하지 않았습니다.

관리 화면은 PostgreSQL 관리자 세션을 사용합니다. 설정 파일은 Git에 포함하지 않으며 셸에서 불러오지 않습니다.

## 복구 지점

축소 기준: `63a08b95cb54e06d9a00c89ae14d8d9eb1851284`.
미커밋 변경 포함 백업: `backup/center-web-before-events-only-20260909-175952`, 커밋 `b1cc3f81190f06fb53da668c003421f479854543`.
저장소 밖 `/Users/max/noncelab/center/bitcoin-center-seoul-backups/20260909-175952`에 독립 복원이 검증된 Git bundle과 공개/디자인 자산 아카이브가 있습니다. 런타임 DB·비밀 설정은 Git 백업에 포함하지 않았으며 원래 위치에 보존했습니다.

현재는 noindex 로컬 검토본입니다. 푸시·배포·GitHub Actions·운영 데이터 변경은 수행하지 않습니다. 루트 Vite/Express 앱과 배포 스크립트는 보존된 레거시이며 보안 개선 대상인 새 서비스의 실행 경로로 사용하지 않습니다. 특히 구버전 API를 같은 도메인에 병행 노출하거나 기존 업로드/배포 스크립트를 실행하지 않습니다.

## 공지사항
`/ko/admin/notices`에서 공지를 등록·수정·삭제합니다. 새 공지는 비공개로 저장되며 공개 체크 후 저장하면 `/ko/notices`와 `/en/notices`에 표시됩니다. 영어 제목·본문은 선택이며 미입력 시 한국어를 표시합니다. URL 슬러그를 바꿔도 이전 주소가 연결됩니다. 공지·slug는 PostgreSQL에 저장합니다.

## 콘텐츠와 이미지

관리자가 저장하는 콘텐츠는 PostgreSQL에, 업로드 사진은 `BCS_EVENTS_UPLOADS`에 둡니다. 실제 DB·사진·개인 자료는 Git에 넣지 않습니다. `npm run backup -- backup-images`는 이미지 전용 archive를 만들며 PostgreSQL은 별도 `pg_dump`로 보관합니다. 두 산출물의 복구를 같은 배치로 연습합니다. 이전 SQLite용 `npm run backup -- backup`의 성공은 현재 사이트 백업 성공을 뜻하지 않습니다.

예전 `reviews.json` 번들은 `reviews:import`로 **이전 SQLite 사본**에만 반영할 수 있습니다. 이 도구는 현재 PostgreSQL 사이트에 직접 쓰지 않습니다. 반영한 SQLite 스냅샷을 검증한 뒤 `content:backfill` dry-run, `--apply`, `--verify`로 이관합니다. 이미 PG에서 수정한 콘텐츠와 충돌하면 중단하고 수동 검토합니다. 유료 밋업 참가권은 신규 상품으로 함께 만들고 기존 `meetup-ID` 상품과 충돌하면 중단합니다. 이전 관리자 세션과 로그인 시도는 이관하지 않습니다.

```sh
npm run content:backfill -- --source /absolute/legacy/events.db --images /absolute/legacy/images
npm run content:backfill -- --source /absolute/legacy/events.db --images /absolute/legacy/images --apply
npm run content:backfill -- --source /absolute/legacy/events.db --images /absolute/legacy/images --verify
```

이 명령들은 `DATABASE_URL`을 프로세스 환경에서 읽으며 `.env` 파일을 자동 로드하지 않습니다. 운영에서는 보호된 설정 파일을 Node `--env-file`로 명시해 실행합니다. `--verify`는 생성된 밋업 상품·변형의 가격과 초기 재고도 검사합니다. 참가권 주문이 있으면 현재 재고는 주문 원장에 의해 달라질 수 있어 검증이 수동 대조를 요구하며, 반복 `--apply`도 상품을 수정하지 않습니다. 로컬 검증은 별도 `TEST_DATABASE_URL`의 `npm run test:backfill`로 수행합니다.

### 주문 수동 처리와 환불 기록

관리자 주문 상세에서 결제 제공자 재조회, 사유를 남기는 입금 확인·미입금 취소,
결제 후 취소(환불 대기), 외부 전액 환불 완료 기록을 할 수 있습니다.
환불 완료에는 방식·증빙이 필요하며, 실제 송금을 수행하는 기능은 아닙니다.
재고 복구는 미발송 또는 반품 확인한 실물이 있을 때만 선택합니다.
입금 기록은 환불 뒤에도 보존하고, 처리 이력은 공용 관리자 계정·시각·사유와 함께 남습니다.

각 처리는 결제 버전을 확인하고 Payment → Order → SKU → Coupon 순으로 잠급니다.
동시 웹훅·조회·관리자 처리로 상태가 바뀌면 최신 주문을 다시 불러와야 합니다.
인보이스를 발급한 뒤 취소한 결제도 정기 조회하여 웹훅이 누락된 늦은 입금을 놓치지 않습니다.
`20260921160000_order_refund_tracking` 마이그레이션은 주문에 환불 상태와 완료 시각을 추가합니다.
기존 수동 배포 절차의 PostgreSQL 백업·마이그레이션 단계를 먼저 완료해야 합니다.

주문 목록은 검색·수령 방식·기간·페이지를 URL에 유지하며 같은 조건으로 CSV를 내려받습니다.
발송한 주문은 송장 정보를 별도로 정정할 수 있습니다. 상점은 검색·종류·재고 필터를 제공합니다.
관련 PostgreSQL 경합 및 관리자 API 경계 검사는 `TEST_DATABASE_URL`을 지정한
`npm run test:commerce`에 포함됩니다. 운영 데이터베이스를 테스트 대상으로 지정하지 마세요.
