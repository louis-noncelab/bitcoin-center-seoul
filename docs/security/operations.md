# PostgreSQL 콘텐츠·결제 및 수동 운영 절차

이 문서는 새 `web/` 서비스의 운영 후보 설정이다. 기존 루트 Express 앱, 운영 DB, 운영 업로드, nginx, PM2를 변경하거나 배포하지 않는다. 실제 전환은 검토된 릴리스에 대한 별도 승인 후 수행한다. GitHub Actions, 자동 푸시, 자동 배포는 사용하지 않는다.

아래 호스트 준비·PostgreSQL dump/복구·원본 자산 보관은 운영자가 수행할 절차이며 실제 운영 서버에서 검증했다는 뜻이 아니다. 로컬 회귀 검사는 임시 fixture만 사용한다. 정적 원본 사진·영상은 DB 백업에 포함되지 않으므로 검토한 릴리스 자산 묶음과 독립 보관본을 별도로 유지한다.

## 현재 데이터 저장소

새 `web/` 서비스의 행사·하이라이트·공지·컬렉션·후기·운영 예외·관리자 세션과 상품·주문·결제·배송·메일 outbox는 모두 PostgreSQL/Prisma에 저장한다. `web/src/server/events/db.ts`와 SQLite 가져오기·백업 코드는 과거 자료를 보존하고 이관하는 도구다. 실행 중인 사이트의 콘텐츠/세션 백업으로 SQLite 사본만 사용하면 최신 데이터가 빠진다. 이미 PostgreSQL에 콘텐츠가 있다면 아래 backfill은 차이를 감지해 멈춘다. 차이가 있는 DB에 강제 덮어쓰기를 하지 않는다.

업로드는 `BCS_EVENTS_UPLOADS` 파일 경로에 있고 PostgreSQL 행이 이를 참조한다. PostgreSQL dump와 전체 업로드는 함께 복구해야 한다. 코드에 포함된 정적 원본 사진·영상은 검토한 릴리스 자산 묶음과 별도 보관한다.

## 경로와 권한

| 설정 | 예시 | 요구 사항 |
| --- | --- | --- |
| 서비스 코드 | `/srv/bitcoin-center-seoul/current/web` | 검토한 릴리스, 운영 DB와 분리 |
| 이전 SQLite 스냅샷 | `/var/backups/bitcoin-center-seoul/legacy/events.db` | backfill 입력 전용; 실행 중 앱 설정이 아님 |
| `BCS_EVENTS_UPLOADS` | `/var/lib/bitcoin-center-seoul/images` | `/images/` 아래 URL에 대응하는 루트, 서비스 계정만 쓰기 |
| 비밀번호 검증값 | `/etc/bitcoin-center-seoul/admin-password.env` | 코드·공개 디렉터리 밖, `0600`, 서비스 계정만 읽기 |
| Commerce 설정 | `/etc/bitcoin-center-seoul/commerce.env` | DB 접속·암호화 키·결제 제공자 설정, `0600`, 서비스 계정만 읽기 |
| `DATA_DIR` | `/var/lib/bitcoin-center-seoul/commerce` | commerce 설정이 요구하는 절대 경로, 릴리스와 분리 |
| 백업 | `/var/backups/bitcoin-center-seoul/<고유한 이름>/` | 공개 경로 밖, 디렉터리 `0700`, 파일 `0600` |
| 프로세스 및 로그 | 서비스 계정의 PM2 상태, `/var/log/bitcoin-center-seoul/` | 다른 사용자에게 읽기·쓰기 금지, 보존기간 설정 |

전용 비특권 계정으로 웹 한 개와 결제 워커 한 개를 별도 감독한다. 프로세스의 umask는 `0077`로 설정한다. 이전 SQLite 스냅샷의 디렉터리도 비공개로 보호한다. 데이터·백업·비밀 파일 경로를 nginx `root`/`alias`나 Next `public/` 아래에 연결하지 않는다.

## 기존 관리자 비밀번호의 검증값 전환

관리자가 입력하는 기존 비밀번호는 그대로 사용할 수 있다. 서버에는 원문 `ADMIN_PASSWORD` 대신 `ADMIN_PASSWORD_HASH`만 제공한다. Node 24에서 `web/` 기준으로 다음 도구를 실행하면 터미널 입력을 숨기고 새 `0600` 파일에 scrypt 검증값을 만든다. 기존 파일은 덮어쓰지 않는다.

```sh
npm run admin:password -- --output /absolute/private/new-admin-password.env
```

기존 비밀번호가 이미 해당 명령의 환경에 있는 경우에만 `--from-env`를 추가할 수 있다. 원문을 명령 인자, 셸 히스토리, 로그, 저장소에 넣지 않는다. 이 작업에서 기존 `.env`·`.env.local`을 읽지 않는다. 운영 환경의 원문 `ADMIN_PASSWORD`는 제거하고, 잘못 남은 `ADMIN_PASSWORD_HASH`가 새 파일 값보다 우선하지 않도록 프로세스 환경을 점검한다.

PM2 예시는 Node의 명시적 `--env-file`로 운영자가 새로 만든 파일을 읽는다. 생성한 검증값 파일의 작은따옴표와 `$`를 그대로 사용한다. 셸 `source`나 dotenv용 `\$` 변환을 적용하지 않는다. Node는 기존 프로세스 환경을 파일보다 우선하므로 오래된 값을 제거한 승인된 프로세스 환경을 사용한다. 자동 dotenv 탐색은 `__NEXT_PROCESSED_ENV=true`로 차단한다. `pm2 env`, 환경 덤프, 상태 파일을 공유하지 않는다. 비밀번호를 교체하면 새 검증값 파일을 만들고 승인된 재시작 절차로 반영한다. 검증값이 바뀌면 기존 관리자 세션도 무효화된다. [Node env-file 규칙](https://nodejs.org/docs/latest-v24.x/api/cli.html#--env-filefile)을 따른다.

## PostgreSQL 준비와 마이그레이션

지원되는 PostgreSQL과 호환 `pg_dump`/`pg_restore` 버전, 영구 저장소·여유 용량·복구 목표를 확정한다. 서버 자원이 부족하면 별도 DB 호스트를 사용하며 확인 없이 기존 작은 EC2에 설치하지 않는다. 외부 공개 DB 포트를 열지 않고 서비스 호스트만 허용한다. 원격 DB는 서버 인증서를 검증하는 TLS 연결을 사용한다. DB/역할 생성은 운영자가 별도 수행하고 앱에는 superuser 대신 필요한 권한만 부여한다. DDL용 migration 역할과 실행 역할을 분리했다면 migration 뒤 테이블·sequence 권한도 확인한다.

새 보호 파일 `commerce.env`에는 `DATABASE_URL`, `DATA_DIR`, 32바이트 base64 `TOKEN_ENCRYPTION_KEY`, `PAYMENT_MODE`, `PAYMENT_PROVIDER`와 선택한 제공자의 설정을 준비한다. Zaprite는 API key·unguessable webhook secret·정확한 조직 ID와 필요 시 checkout ID, lightning address는 수신 주소와 검토한 HTTPS origin 허용 목록이 필요하다. 실제 값을 문서·코드·명령 인자에 기록하지 않는다. PM2 템플릿은 `APP_MODE=production`, `EMAIL_MODE=capture`, `TRUST_PROXY=true`를 두 프로세스에 제공하며 실제 `APP_ORIGIN`을 둘 다 동일하게 설정한다. production은 `PAYMENT_MODE=live`만 허용한다. 설정 파일 준비는 결제나 운영 전환의 승인이 아니다. 운영 메일은 `EMAIL_MODE`에 따라 capture 또는 별도 검토된 SMTP 전송을 사용한다. 이관·복구 연습은 반드시 capture로 두고 실제 메일을 보내지 않는다.

아래는 승인된 릴리스에서 `web/` 기준으로 실행할 migration/status 명령이다. `npm run db:deploy`와 같은 Prisma 동작에 Node의 명시적 설정 파일 전달을 더한 것이다. 별도 migration 역할을 쓰면 첫 번째 파일을 해당 역할의 새 보호 설정으로 지정한다. 먼저 PostgreSQL과 전체 이미지를 백업하고 복구 연습을 통과한다.

```sh
node --env-file=/etc/bitcoin-center-seoul/commerce.env node_modules/prisma/build/index.js migrate deploy
node --env-file=/etc/bitcoin-center-seoul/commerce.env node_modules/prisma/build/index.js migrate status
```

`db:generate`는 DB 접속 없이 코드를 생성한다. `npm ci`의 postinstall과 typecheck/build lifecycle에서 실행되므로 새 체크아웃에도 생성 클라이언트가 생긴다. `db:migrate`/`db push`는 운영에 사용하지 않는다. `db:seed`는 데모 SKU의 재고를 20으로 덮어쓰는 로컬 fixture이므로 운영 migration과 함께 실행하지 않는다.


## 이전 SQLite 콘텐츠의 명시적 backfill

새 PostgreSQL content migration은 테이블만 만든다. 이전 `events.db`의 행은 자동 이전되지 않는다. 쓰기를 멈춘 뒤 [`events-backup.ts`](../../web/scripts/events-backup.ts)의 `backup`으로 SQLite 온라인 스냅샷과 공용 이미지를 비공개 디렉터리에 보관하고 `restore-check`를 통과시킨다. 이미 PostgreSQL을 사용하는 환경은 기존 PG 콘텐츠가 기준이며 SQLite 사본을 무조건 다시 적용하지 않는다.

아래 CLI는 SQLite 스냅샷을 읽기 전용으로 열고 이미지 참조의 실재 여부를 확인한다. 행사·스케치·공지·컬렉션·후기·슬러그·갤러리 순서·태그·revision·선택 후기·운영 예외와 ID를 같은 값으로 옮긴다. 유료 밋업의 `meetup-ID` 상품/재고도 같은 transaction에서 신규 생성하고 기존 상품 slug와 충돌하면 중단한다. 옛 `admin_sessions`와 로그인 시도는 보안상 이관하지 않는다. 관리자에게 재로그인을 요청한다. 대상 PostgreSQL이 빈 상태이거나 전체 콘텐츠가 정확히 같은 재실행일 때만 진행한다. 일부만 있거나 관리자 수정 내용이 다른 경우 `POSTGRES_CONTENT_CONFLICT`로 종료하며 기존 행을 덮어쓰지 않는다. 원본과 이미지의 불일치도 실패한다.

```sh
# web/ 기준. 보호된 설정 파일의 DATABASE_URL을 Node만 읽는다.
node --env-file=/etc/bitcoin-center-seoul/commerce.env --conditions=react-server --import tsx scripts/sqlite-to-pg-content.mjs \
  --source /absolute/private/legacy-backup/events.db --images /absolute/private/legacy-backup/images
node --env-file=/etc/bitcoin-center-seoul/commerce.env --conditions=react-server --import tsx scripts/sqlite-to-pg-content.mjs \
  --source /absolute/private/legacy-backup/events.db --images /absolute/private/legacy-backup/images --apply
node --env-file=/etc/bitcoin-center-seoul/commerce.env --conditions=react-server --import tsx scripts/sqlite-to-pg-content.mjs \
  --source /absolute/private/legacy-backup/events.db --images /absolute/private/legacy-backup/images --verify
```

`--apply`는 모든 콘텐츠 행을 하나의 PostgreSQL SERIALIZABLE transaction으로 추가하고 sequence를 원래 ID 이후로 맞춘다. 원본 SQLite와 이미지는 수정하지 않는다. `--verify`는 콘텐츠 행과 생성된 유료 밋업 상품·변형의 식별자, 가격, 초기 재고까지 확인한다. 변형이 없거나 가격·재고가 달라지면 `--verify`와 반복 `--apply`가 모두 실패하며 자동 복구하지 않는다. 주문이 한 건이라도 생성된 참가권은 현재 재고가 정상적인 판매·예약의 결과일 수 있으므로 초기 재고와 비교하지 않고 `EVENT_TICKET_ORDERS_REQUIRE_REVIEW`로 중단한다. 이 경우 PostgreSQL 주문 원장, 결제·예약 상태와 재고를 수동 대조한다. backfill 검증은 첫 전환 확인용이며 운영 중인 상거래 DB의 일반 복구 검사 대신 사용할 수 없다. 별도 DB에서 먼저 dry-run→apply→verify→재실행→복구를 연습한다. 대상에 차이가 있으면 PostgreSQL의 현재 내용을 보존하고 행 단위로 원인을 검토한 뒤 별도 승인된 reconciliation 계획을 작성한다. 수동 SQL로 충돌을 우회하지 않는다.

## ingress 및 프로세스 템플릿

검토 대상은 [`nginx.conf.example`](../../web/deploy/nginx.conf.example)과 [`ecosystem.config.cjs`](../../web/deploy/ecosystem.config.cjs)이다. 기존 루트 배포 파일과는 별개다. 호스트명·인증서·Node 24 실행 파일·서비스 계정·경로는 실제 호스트에 맞게 검토한다. PM2의 `interpreter`가 가리키는 실행 파일도 Node 24인지 확인한다.

- 외부는 TLS가 설정된 nginx의 80/443만 접속한다. 앱은 `127.0.0.1:3100`에 바인딩한다. 방화벽과 보안 그룹에서도 앱 포트를 외부에 열지 않는다.
- `APP_ORIGIN`은 실제 정규 HTTPS 출처와 정확히 일치해야 한다. HTTP는 루프백 검토 환경에서만 허용한다.
- 이 예시는 nginx가 인터넷 연결을 직접 받는 구조다. `BCS_TRUST_PROXY=true`와 `TRUST_PROXY=true`를 함께 설정하고 nginx가 `X-BCS-Client-IP`를 소켓의 `$remote_addr`로 덮어쓴다. 콘텐츠 인증과 commerce 제한이 같은 계약을 따른다. 외부에서 보낸 `X-Forwarded-For`, `X-Real-IP`, `Forwarded`를 인증·제한의 근거로 사용하지 않는다. CDN/LB 추가 시 허용된 프록시 주소와 헤더 처리부터 다시 검토한다.
- `/api/admin/login`에 IP당 분당 5회, 버스트 5회의 nginx 제한을 적용한다. 애플리케이션의 로그인 제한은 별도로 유지한다. nginx의 요청 제한 동작은 [공식 문서](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)를 따른다.
- nginx는 전체 요청 크기를 31MiB로 제한한다. 앱의 이미지 합계 30MiB 제한에 multipart 여유를 둔 값이며, 각 이미지 10MiB·최대 12개 제한은 앱에서 검증한다.
- 점으로 시작하는 파일·DB·비밀 파일 경로는 거부한다. 공개 자산과 `/images/`, `/api/`를 포함한 모든 경로는 새 Next 서비스로만 전달한다. 업로드 디렉터리를 직접 공개하는 `alias`와 레거시 Express 폴백은 없다.
- 관리자 요청의 `Origin`은 그대로 전달한다. 프록시가 임의로 재작성하면 출처 검증이 무력화될 수 있다. 신뢰 헤더의 덮어쓰기 규칙은 [nginx 공식 문서](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)에 맞춘다.
- access log에는 메서드·안전한 경로·상태·응답 크기·시간만 남기고 접속 IP·쿠키·Authorization·본문·쿼리는 제외한다. `/api/webhooks/zaprite/` 뒤의 bearer token은 경로에 있으므로 반드시 가린다. error log와 상위 CDN/LB/APM도 원본 요청 경로를 저장하지 않는지 webhook 등록 전에 확인한다. 기존 로그에 노출된 토큰은 회전하고 접근·보존 범위를 점검한다.

Next standalone 산출물의 실행 파일은 현재 tracing root 기준 `web/.next/standalone/web/server.js`이다. `web/public`과 `web/.next/static`은 각각 standalone의 `web/public`, `web/.next/static` 위치에 포함해야 한다. 저장소의 원본 사진 중 빌드된 정적 자산도 검토한 빌드와 함께 보존한다. 검토용 `.next-events` 산출물과 실제 `.next` 산출물을 섞지 않는다.

standalone만으로는 결제 워커·백업·migration을 실행할 수 없다. 비공개 릴리스 디렉터리에 전체 검토 `web/` 소스와 같은 잠금 파일의 `node_modules`를 함께 보관한다. `scripts/`, `src/server/`, 생성된 `src/generated/prisma/`, `tsconfig.json`, `prisma.config.ts`, `prisma/`, `package.json`/lockfile을 포함하고 `tsx`와 Prisma CLI가 있는 개발 의존성도 유지한다. 환경 파일·`.local`·DB·업로드를 코드 묶음에 넣지 않는다. `npm ci --omit=dev`로 이 운영 묶음을 만들지 않는다.

SQLite·Sharp는 네이티브 코드를 포함하므로 배포 호스트와 같은 OS·아키텍처에서 잠금 파일로 `npm ci`와 빌드·검사를 수행한다. macOS 검토 산출물을 Linux 서버에 그대로 복사하는 방식으로 검증을 대신하지 않는다.

템플릿 자체는 TLS 인증서 발급, 방화벽 적용, 서비스 계정 생성, 비밀 주입, 로그 회전, nginx 재로드 또는 PM2 시작을 수행하지 않는다. 실제 호스트에서 `nginx -t` 및 서비스 바인딩·TLS·헤더·로그인 제한 검증을 완료한 뒤 승인된 수동 전환을 진행한다.

## 결제 워커 감독

PM2의 `bitcoin-center-seoul-payments`는 `scripts/reconcile-payments.ts --watch`를 Node 24, `--conditions=react-server`, `--import=tsx`로 실행한다. 웹과 같은 commerce 설정 파일을 읽고 별도 로그·재시작 정책을 사용한다. 도움말은 DB 접근 없이 `npm run payments:reconcile -- --help`로 확인한다. 운영 워커 실행은 provider 재조회와 DB 변경을 일으키므로 release 승인 전에 실행하지 않는다.

한 배치 최대 100건을 immutable ID 순으로 확인한 뒤 30초 쉬며 `maintenance.pass`에 `checked`, `unavailable`, `requiresReconciliation`, `cycleComplete`를 기록한다. PM2 로그 시각으로 마지막 성공과 전체 순회 완료를 별도로 관찰한다. PM2 `online`만으로 정상 판정하지 않는다. `maintenance.pass_failed`, `maintenance.stopped_unexpectedly`, 재시작 횟수, `unavailable` 증가와 오래된 PENDING/REVIEW·재고 예약을 감시한다. `requiresReconciliation`이 0보다 크면 운영자가 즉시 REVIEW 주문을 조사한다. 검토할 인력이 없거나 1시간 안에 처리할 수 없으면 기존 운영 설정으로 새 checkout을 일시 중지한다. 워커가 최대 재시작 횟수를 소진해 멈춘 경우도 웹 상태와 독립적으로 경보한다. 메일 outbox 배출은 결제 워커와 별개다.

### Lightning 미결제 취소와 결제 불확실성

LNURL 인보이스의 앱 내부 `expiresAt`은 관찰·재조회 시각일 뿐 결제 불가능 증거가 아니다. 이 시각이 지나도 주문을 REVIEW로 두고 재고와 쿠폰 예약을 유지한다. TTL 만료만으로 SQL을 직접 실행해 예약을 해제하지 않는다. 관리자 주문 화면에서 제공자 상태를 새로고침하고 실제 서명된 BOLT11 만료시각이 지났는지 확인한다. 장기 인보이스는 앱 내부 TTL보다 훨씬 늦게 만료될 수 있다. 제공자 또는 지갑 측에서 정산된 금액이 없고 진행 중 HTLC도 없다는 사실을 확인한 후, 제공자 참조·근거를 남기고 `HTLC 없음` 확인을 체크하여 미입금 취소한다. LUD21의 `settled:false`나 시간 경과만으로 최종 미결제를 단정하지 않는다. 버전·감사 기록이 있는 관리자 취소만 재고/쿠폰을 한 번 해제한다. 늦게 결제가 확인되면 REVIEW에서 수동 대조한다. 발급·상태 확인이 불확실하면 예약을 유지하고 담당자에게 이관하며, 반복 악용으로 예약이 쌓이면 새 checkout을 일시 중지한다.

실행 가능한 환율 캐시는 최신 유효 quote가 5분 이내이고 미래 시각 오차가 5초 이내일 때만 사용한다. 오래되거나 잘못된 quote는 `RATE_UNAVAILABLE`로 실패한다. 관리자가 명시적으로 지정한 고정 환율은 별도 정책 예외다. LNURL 수신 주소 변경은 새 인보이스에만 적용하며 이미 발급한 인보이스는 저장된 receiver snapshot으로 대조한다. 수신 URL 허용 목록·전송 방식·인보이스 hash/preimage 검증은 유지한다.

## 업로드 보관과 이전 SQLite 스냅샷

현재 사이트의 필수 백업은 PostgreSQL custom dump와 **전체** `BCS_EVENTS_UPLOADS`다. [`events-backup.ts`](../../web/scripts/events-backup.ts)의 `backup-images`는 SQLite 없이 모든 지원 업로드를 새 비공개 `0700` 디렉터리에 복사하고 파일 크기·SHA-256을 manifest에 기록한다. 지원하지 않는 파일이나 심볼릭 링크, 출력 덮어쓰기를 거부한다. 원본 업로드 삭제·교체가 없는 동안 실행하고 전환용 복구 지점에서는 모든 쓰기와 워커를 정지한다. 정적 빌드 자산은 릴리스와 별도 보관한다.

```sh
umask 077
mkdir -m 700 /absolute/private/backups/unique-batch
node --import tsx scripts/events-backup.ts backup-images \
  --images /absolute/private/data/images \
  --output /absolute/private/backups/unique-batch/uploads
node --import tsx scripts/events-backup.ts restore-check \
  --backup /absolute/private/backups/unique-batch/uploads
```

`restore-check`는 새 임시 `0700` 디렉터리에 이미지를 복사하여 크기와 해시를 검증하고 종료 시 정리한다. 복원에 성공했다는 것만으로 PostgreSQL 행의 참조가 모두 있는지는 증명하지 않으므로 복구 DB의 공개·비공개 이미지 요청도 확인한다. 비어 있는 업로드 루트도 유효한 보관본이며 manifest를 기록한다.

과거 SQLite를 backfill하려면 별도로 `backup --database /absolute/legacy/events.db --images /absolute/data/images --output /absolute/private/backups/unique-legacy`와 `restore-check`를 실행한다. 이 명령은 WAL을 포함한 SQLite 온라인 스냅샷을 만들지만 **현재 PostgreSQL 콘텐츠/세션 백업은 아니다**. `events.db`와 이미지가 든 legacy archive는 옛 세션 해시가 포함될 수 있으므로 비공개로 보관한다. 복구한 SQLite 세션은 새 앱으로 이관하지 않는다.

## PostgreSQL 백업과 통합 복구 연습

`backup-images`는 PostgreSQL을 백업하지 않는다. 전용 백업 역할과 `0600` libpq service/password 파일을 준비한다. 아래 `bcs_backup`은 원본 전체를 dump할 권한이 있는 연결, `bcs_restore_check`는 운영과 분리해 미리 만든 **빈 복구 연습 DB**다. 호스트·사용자·TLS와 비밀번호는 보호된 libpq 파일에서 관리하고 비밀번호 URI를 명령행에 넣지 않는다. PG dump와 업로드 archive에는 같은 배치 ID를 사용하고, 부모 디렉터리를 `0700`으로 먼저 준비한다. custom dump에는 현재 콘텐츠·관리자 세션·상거래 데이터가 모두 포함되므로 접근을 제한한다. 복구 연습본의 관리자 세션은 로그인 전에 비우고, SMTP/결제 실연동을 차단한다.

```sh
umask 077
PGSERVICEFILE=/etc/bitcoin-center-seoul/pg_service.conf PGPASSFILE=/etc/bitcoin-center-seoul/pgpass \
  pg_dump --dbname=service=bcs_backup --format=custom --file=/absolute/private/backups/unique-batch/site.dump
PGSERVICEFILE=/etc/bitcoin-center-seoul/pg_service.conf PGPASSFILE=/etc/bitcoin-center-seoul/pgpass \
  pg_restore --dbname=service=bcs_restore_check --no-owner --no-privileges --exit-on-error --single-transaction \
  /absolute/private/backups/unique-batch/site.dump
PGSERVICEFILE=/etc/bitcoin-center-seoul/pg_service.conf PGPASSFILE=/etc/bitcoin-center-seoul/pgpass \
  psql --dbname=service=bcs_restore_check --set=ON_ERROR_STOP=1 \
  --command='TRUNCATE TABLE admin_sessions, admin_login_attempts'
```

`pg_dump`의 custom archive는 DB 하나의 일관된 스냅샷을 제공하고 `pg_restore`로 복구한다. 역할·권한·비밀·서버 설정은 별도로 보관·재구성해야 한다. dump 파일을 목록 조회하는 것만으로 복구 성공을 주장하지 않는다. 두 명령의 종료 코드와 비공개 오류 로그를 확인하고 실패·불완전 파일을 성공 백업으로 표시하지 않는다. [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

PostgreSQL dump와 파일 업로드 사이에는 원자적 스냅샷이 없다. 전환용 복구 지점은 관리자·주문·업로드·웹훅 쓰기와 워커를 정지한 상태에서 PostgreSQL dump와 전체 이미지를 같은 배치 ID로 묶는다. 릴리스 커밋·migration 상태·시각·각 산출물 해시와 크기를 비공개 기록에 남긴다. 정기 백업에서도 PostgreSQL을 먼저 스냅샷하고 이후 전체 이미지를 보관하며, 진행 중 업로드 삭제·교체는 금지한다. 목표 RPO가 일일/시간별 dump보다 짧다면 DB 호스트의 WAL/PITR 백업을 운영자가 별도 구성한다.

복구 연습에서는 새 PostgreSQL DB와 새 이미지 경로만 사용한다. 인터넷·결제 제공자 접근을 차단하고 REVIEW 설정의 앱으로 공개/비공개 콘텐츠, 상품 이미지와 원본의 상품·주문·결제·예약 재고 개수/관계를 확인한다. LIVE 데이터에 워커나 결제 재시도를 실행하지 않는다. `Payment.mode`가 REVIEW와 분리되어 있다는 이유만으로 운영 자격 증명을 복구 연습에 넣지 않는다. 검증 후 임시 DB와 파일은 명시적으로 식별한 연습 대상만 정리한다.

## 마이그레이션과 롤백 경계

웹과 워커는 같은 릴리스·설정·Prisma schema를 사용한다. migration 후 이전 코드가 새 schema를 안전하게 읽고 쓸 수 있는지 먼저 판단한다. 호환되는 경우 데이터는 보존하고 두 프로세스의 코드를 함께 되돌린다. 비호환이면 쓰기를 정지하고 현재 PostgreSQL DB·이미지를 별도 보존한 뒤 검증된 복구 지점을 새 비활성 경로/DB로 복원한다. 활성 DB에 덮어쓰기나 자동 down migration을 실행하지 않는다.

백업 이후 생성된 주문·결제·업로드를 무시한 복원은 결제 내역과 재고를 잃게 한다. 결제 제공자의 외부 상태는 DB 복원으로 되돌아가지 않으므로 해당 기록을 보존·대조한 뒤 승인된 복구 절차로 반영한다. 웹훅 중단 중 누락된 알림과 결제 상태는 재개 후 워커가 재조회하도록 하되 REVIEW 항목은 운영자가 확인한다. 자동 환불·재결제·운영 이메일은 이 절차에 없다.

## 운영자가 적용할 일정

초기 운영안은 매시간 PostgreSQL DB·공용 이미지 백업, 매일 암호화된 외부 복제, 매주 외부 보관본 통합 복구 점검이다. 예를 들어 시간별 24개·일별 7개·주별 4개를 보관하되 필요한 복구 시점과 저장 용량에 맞춰 확정한다. 코드에서 스케줄이나 삭제 작업을 자동 등록하지 않는다.

DB·이미지 백업 실패·마지막 성공 시각, 전체 복구 점검 시각, 디스크 여유, PostgreSQL 연결·잠금·용량, 서비스 5xx·로그인 제한 급증과 워커 실패를 별도로 관찰한다. 새 백업과 복구 점검이 성공하기 전에 마지막 검증 백업을 삭제하지 않는다. 호스트의 TLS 인증서 갱신, OS·Node·의존성 보안 업데이트, 비밀 파일 권한, 방화벽, 로그 회전, 백업 스케줄·외부 복제·보존 정책은 별도 운영 적용 사항이다.

## 로컬 검증

```sh
node --test tests/events-backup.mjs
TEST_DATABASE_URL=postgresql://127.0.0.1:5432/bcs_fix_ops_20260923 npm run test:backfill
```

이전 SQLite 연결을 열어 WAL에만 최신 행사·공지·세션을 커밋한 채 legacy CLI 백업을 실행한다. 비공개 도서·작품과 Markdown 이미지, 해시·권한·DB 무결성, 원본 보존, 임시 복구, 덮어쓰기 거부, 누락·심볼릭 링크·변조·manifest 경로 이탈, 도움말·잘못된 인자를 확인한다. 모든 데이터는 테스트별 임시 경로에 만들고 정리한다.

## 개인정보 보관기간 및 파기 운영

일반 주문 개인정보의 정기 파기 기준은 수집일(`Order.createdAt`)로부터 1년이다. 목적 달성·유효한 파기 요청으로 더 이른 파기가 필요하면 아래 특정 주문 명령을 사용한다. 연례 점검일까지 파기를 미루지 않는다. 결제 워커의 일일 만료 점검은 배포 후 실행되며, 매년 보관 목록·예외·외부 사본·작업 성공 기록을 별도로 검토한다. 이번 개발 작업은 운영 배포나 운영 DB 파기를 실행하지 않는다.

`npm run privacy:retention`은 기본 dry-run으로 후보 수만 출력한다. `--apply`를 붙여야 변경한다. 한 배치는 최대 100건, CLI 한 실행은 최대 100배치이며 `complete:false`와 종료 코드 2는 미완료를 뜻한다. `--help`는 DB 설정 없이 동작한다. 승인된 운영 환경에서는 앱과 같은 런타임 환경을 주입하며 명령어에 비밀값을 직접 적지 않는다.

```bash
npm run privacy:retention
npm run privacy:retention -- --apply
npm run privacy:retention -- --order ORDER_ID --early
npm run privacy:retention -- --order ORDER_ID --early --apply
npm run privacy:retention -- --hold ORDER_ID --apply
npm run privacy:retention -- --release-hold ORDER_ID --apply
```

연례 점검 외에 기존 `payments:reconcile --watch` 워커가 시작 시 및 전체 순회 종료 24시간 후 파기 후보를 검사한다. 잔여 배치는 기존 30초 간격으로 이어서 처리한다. 재시작 시 재검사는 멱등적이며 개인정보 작업 실패는 `privacy.maintenance_failed`로 별도 기록되어 결제 재조회를 중단하지 않는다. `privacy.maintenance`의 `cycleComplete:true`와 시각을 확인하고, 실패·24시간 이상 성공 기록 부재·장기간 보류를 운영 경보 대상으로 삼는다. 독립 실행을 원하면 위 CLI를 승인된 로컬 스케줄러로 매일 호출한다. 이 명령은 메일 발송이나 결제 제공자 호출을 하지 않는다.

파기 대상은 기한이 지난 취소·만료 주문, 수령·배송 완료 주문, 날짜가 지난 밋업 전용 주문이다. 일반 연락처·메모·주소·검색용 이메일 해시·주문 접근키·확인 코드를 제거하고, 견적 소유자 정보와 연결된 메일 사본도 제거한다. 주문/결제 금액·상품·결제 해시 및 결제 이벤트는 유지한다. 공개·관리자 주문 출력은 빈 연락처와 `privacyRedactedAt`을 반환하며, 별도 법정 보관 자료는 반환하지 않는다. 파기 후 일반 관리자 변경은 거절한다. 뒤늦게 확인된 입금은 증빙을 기록하고 REVIEW로 남기지만 빈 수신자에게 메일을 만들지 않는다.

결제 생성 불확실, 처리·검토 중 결제, 진행 중 주문·배송·환불, 명시적 `privacyHold`, 발송 중 메일은 파기를 막는다. 삭제된 행사처럼 완료 시점을 확인할 수 없는 예약도 자동으로 추정하지 않는다. 운영자는 오래된 보류 사유를 검토하고 정상 업무 절차로 종결해야 한다. `--early`도 이 보호를 우회하지 않는다. 분쟁이 새로 접수되면 즉시 hold를 설정하고 근거·담당자·다음 검토일을 별도 분쟁대장에 남긴다. 해제 전 미해결 환불/분쟁 및 외부 증빙 보존을 확인한다. 이미 파기된 정보는 hold 설정으로 복원되지 않는다.

법정 보관은 `PrivacyLegalRecord`로 분리하여 기존 AES-256-GCM 키로 암호화한다. 거래 식별·이행·환불 증빙에 필요한 이름/이메일/배송주소/운송장 및 제한된 환불 증빙만 TRANSACTION으로, 거래·이행·환불 중 마지막 시점부터 5년까지 보관한다. 일반 전화번호·고객 메모는 이 아카이브에 복제하지 않는다. 취소/분쟁 사유와 미입금 검토 사유는 별도 DISPUTE로 관련 기록 시점부터 3년까지 보관하며 결제 메타데이터의 취소 사유도 제거한다. 법정 보관기한을 이미 넘긴 자료는 파기 시 새로 아카이브하지 않는다. 아카이브 만료 삭제는 해당 주문 잠금을 취득하고 hold·진행 중 환불·REVIEW를 확인한다. 광고 표시 기록은 법정 6개월 기준이지만 현재 앱에는 해당 기록 수집/관리 기능이 없으므로 외부 기록 담당자가 별도로 관리한다.

법정 아카이브는 일반 관리자/공개 API에서 검색·열람·다운로드하지 않는다. 정당한 법적 목적의 열람은 승인된 DB 운영자가 최소 권한과 접근 기록을 갖춘 별도 절차로 수행한다. 앱 암호화 키와 PostgreSQL 백업의 접근 권한은 분리해서 관리한다.

범위는 현재 PostgreSQL의 주문·연결 메일·오래된 비연결 메일·미사용 견적·법정 아카이브이다. 레거시 밋업 발송 메일은 주문 연결 정보가 없어 원래 메일 생성일 기준 만료 점검을 적용한다. 개별 조기 파기 요청 시 이 레거시 사본을 별도로 확인한다. 외부 제안/문의 메일함, SMTP 제공자, 결제 제공자, 알림 서비스, 운영자 CSV·캡처·분쟁대장, 게시된 후기·사진, 로그 및 백업은 이 작업으로 자동 파기되지 않는다. 각각 목적과 법정 예외에 맞춘 삭제·백업 순환·접근 제한을 운영자가 수행한다. 백업 복원 시 신규 서비스/메일 워커를 열기 전에 hold 대장과 파기 기록을 대조하고 만료 파기를 다시 실행하여 삭제된 개인정보가 재노출되지 않게 한다.

## Operating status calendar maintenance

The header uses server time in Asia/Seoul, daily 12:00–20:00 hours (Sunday included), and the registered events' start/end times. Korean public holidays are resolved locally with pinned `@hyunbinseo/holidays-kr` data; no runtime external calendar request, API key or visitor geolocation is required. Version 5.2027.1 includes published calendars through 2027, including substitute holidays, election days and announced temporary public holidays. Compare new versions with [KASA's official calendar](https://www.kasa.go.kr/prog/plcyBrf/brief/kor/sub01_01_04/view.do?plcyBrfNo=431) and the [dataset source](https://github.com/hyunbinseo/holidays-kr) when a new calendar or temporary holiday is announced, then update the pinned package and run `npm run test:status` before an approved deployment. Do not infer future unpublished calendars; unsupported years show the unavailable status until data is updated or today's administrator exception is set.

The authenticated event admin's today's-operation controls store `open` or `closed` in `center_opening_overrides`, keyed by Seoul date. Automatic removes that date's exception. Normal operation enables standard hours and actual meetup windows, including on a holiday; temporary closure suppresses both. Dates are retained for overnight meetup eligibility, while the next day's regular opening reverts to its own calendar/exception. The PostgreSQL dump includes these rows. Expired manual `center_status` rows from the earlier local-only prototype are not read or migrated into live status.
