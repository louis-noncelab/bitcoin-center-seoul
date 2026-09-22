# SQLite·PostgreSQL 및 수동 운영 절차

이 문서는 새 `web/` 서비스의 운영 후보 설정이다. 기존 루트 Express 앱, 운영 DB, 운영 업로드, nginx, PM2를 변경하거나 배포하지 않는다. 실제 전환은 검토된 릴리스에 대한 별도 승인 후 수행한다. GitHub Actions, 자동 푸시, 자동 배포는 사용하지 않는다.

아래 호스트 준비·PostgreSQL dump/복구·원본 자산 보관은 운영자가 수행할 절차이며 실제 운영 서버에서 검증했다는 뜻이 아니다. 로컬 회귀 검사는 임시 fixture만 사용한다. 정적 원본 사진·영상은 DB 백업에 포함되지 않으므로 검토한 릴리스 자산 묶음과 독립 보관본을 별도로 유지한다.

## 두 데이터베이스의 역할

행사·하이라이트·공지·도서·작품·후기·관리자 세션은 기존 SQLite를 유지한다. 승인된 commerce 기능은 별도 PostgreSQL의 상품·재고·주문·결제·배송·outbox 테이블을 사용한다. SQLite 콘텐츠를 PostgreSQL로 옮기는 작업이 아니다. 공용 `BCS_EVENTS_UPLOADS`에는 두 DB의 사진과 아직 게시하지 않은 업로드가 함께 있으므로 DB 하나만 백업해서는 복구할 수 없다.

DB와 WAL은 같은 호스트의 로컬 영구 디스크에 둔다. NFS/SMB 같은 네트워크 파일시스템이나 릴리스 디렉터리, 웹 공개 디렉터리에는 두지 않는다. DB 크기, 여유 공간, WAL 증가, `SQLITE_BUSY` 및 백업 실패를 운영자가 관찰한다. SQLite를 쓴다는 사실만으로 접근 통제나 백업이 해결되는 것은 아니다.

## 경로와 권한

| 설정 | 예시 | 요구 사항 |
| --- | --- | --- |
| 서비스 코드 | `/srv/bitcoin-center-seoul/current/web` | 검토한 릴리스, 운영 DB와 분리 |
| `BCS_EVENTS_DB` | `/var/lib/bitcoin-center-seoul/events.db` | 기존 호환 DB의 절대 경로, 파일 `0600`, 상위 디렉터리 `0700` |
| `BCS_EVENTS_UPLOADS` | `/var/lib/bitcoin-center-seoul/images` | `/images/` 아래 URL에 대응하는 루트, 서비스 계정만 쓰기 |
| 비밀번호 검증값 | `/etc/bitcoin-center-seoul/admin-password.env` | 코드·공개 디렉터리 밖, `0600`, 서비스 계정만 읽기 |
| Commerce 설정 | `/etc/bitcoin-center-seoul/commerce.env` | DB 접속·암호화 키·결제 제공자 설정, `0600`, 서비스 계정만 읽기 |
| `DATA_DIR` | `/var/lib/bitcoin-center-seoul/commerce` | commerce 설정이 요구하는 절대 경로, 릴리스와 분리 |
| 백업 | `/var/backups/bitcoin-center-seoul/<고유한 이름>/` | 공개 경로 밖, 디렉터리 `0700`, 파일 `0600` |
| 프로세스 및 로그 | 서비스 계정의 PM2 상태, `/var/log/bitcoin-center-seoul/` | 다른 사용자에게 읽기·쓰기 금지, 보존기간 설정 |

전용 비특권 계정으로 웹 한 개와 결제 워커 한 개를 별도 감독한다. 프로세스의 umask는 `0077`로 설정한다. DB 상위 디렉터리를 보호하면 SQLite가 만드는 `-wal`·`-shm`도 같은 접근 경계 안에 놓인다. 데이터·백업·비밀 파일 경로를 nginx `root`/`alias`나 Next `public/` 아래에 연결하지 않는다.

## 기존 관리자 비밀번호의 검증값 전환

관리자가 입력하는 기존 비밀번호는 그대로 사용할 수 있다. 서버에는 원문 `ADMIN_PASSWORD` 대신 `ADMIN_PASSWORD_HASH`만 제공한다. Node 24에서 `web/` 기준으로 다음 도구를 실행하면 터미널 입력을 숨기고 새 `0600` 파일에 scrypt 검증값을 만든다. 기존 파일은 덮어쓰지 않는다.

```sh
npm run admin:password -- --output /absolute/private/new-admin-password.env
```

기존 비밀번호가 이미 해당 명령의 환경에 있는 경우에만 `--from-env`를 추가할 수 있다. 원문을 명령 인자, 셸 히스토리, 로그, 저장소에 넣지 않는다. 이 작업에서 기존 `.env`·`.env.local`을 읽지 않는다. 운영 환경의 원문 `ADMIN_PASSWORD`는 제거하고, 잘못 남은 `ADMIN_PASSWORD_HASH`가 새 파일 값보다 우선하지 않도록 프로세스 환경을 점검한다.

PM2 예시는 Node의 명시적 `--env-file`로 운영자가 새로 만든 파일을 읽는다. 생성한 검증값 파일의 작은따옴표와 `$`를 그대로 사용한다. 셸 `source`나 dotenv용 `\$` 변환을 적용하지 않는다. Node는 기존 프로세스 환경을 파일보다 우선하므로 오래된 값을 제거한 승인된 프로세스 환경을 사용한다. 자동 dotenv 탐색은 `__NEXT_PROCESSED_ENV=true`로 차단한다. `pm2 env`, 환경 덤프, 상태 파일을 공유하지 않는다. 비밀번호를 교체하면 새 검증값 파일을 만들고 승인된 재시작 절차로 반영한다. 검증값이 바뀌면 기존 관리자 세션도 무효화된다. [Node env-file 규칙](https://nodejs.org/docs/latest-v24.x/api/cli.html#--env-filefile)을 따른다.

## PostgreSQL 준비와 마이그레이션

지원되는 PostgreSQL과 호환 `pg_dump`/`pg_restore` 버전, 영구 저장소·여유 용량·복구 목표를 확정한다. 서버 자원이 부족하면 별도 DB 호스트를 사용하며 확인 없이 기존 작은 EC2에 설치하지 않는다. 외부 공개 DB 포트를 열지 않고 서비스 호스트만 허용한다. 원격 DB는 서버 인증서를 검증하는 TLS 연결을 사용한다. DB/역할 생성은 운영자가 별도 수행하고 앱에는 superuser 대신 필요한 권한만 부여한다. DDL용 migration 역할과 실행 역할을 분리했다면 migration 뒤 테이블·sequence 권한도 확인한다.

새 보호 파일 `commerce.env`에는 `DATABASE_URL`, `DATA_DIR`, 32바이트 base64 `TOKEN_ENCRYPTION_KEY`, `PAYMENT_MODE`, `PAYMENT_PROVIDER`와 선택한 제공자의 설정을 준비한다. Zaprite는 API key·unguessable webhook secret·정확한 조직 ID와 필요 시 checkout ID, lightning address는 수신 주소와 검토한 HTTPS origin 허용 목록이 필요하다. 실제 값을 문서·코드·명령 인자에 기록하지 않는다. PM2 템플릿은 `APP_MODE=production`, `EMAIL_MODE=capture`, `TRUST_PROXY=true`를 두 프로세스에 제공하며 실제 `APP_ORIGIN`을 둘 다 동일하게 설정한다. production은 `PAYMENT_MODE=live`만 허용한다. 설정 파일 준비는 결제나 운영 전환의 승인이 아니다. 운영 메일 발송기는 없고 outbox만 쌓인다.

아래는 승인된 릴리스에서 `web/` 기준으로 실행할 migration/status 명령이다. `npm run db:deploy`와 같은 Prisma 동작에 Node의 명시적 설정 파일 전달을 더한 것이다. 별도 migration 역할을 쓰면 첫 번째 파일을 해당 역할의 새 보호 설정으로 지정한다. 먼저 양쪽 DB와 이미지를 백업하고 복구 연습을 통과한다.

```sh
node --env-file=/etc/bitcoin-center-seoul/commerce.env node_modules/prisma/build/index.js migrate deploy
node --env-file=/etc/bitcoin-center-seoul/commerce.env node_modules/prisma/build/index.js migrate status
```

`db:generate`는 DB 접속 없이 코드를 생성한다. `npm ci`의 postinstall과 typecheck/build lifecycle에서 실행되므로 새 체크아웃에도 생성 클라이언트가 생긴다. `db:migrate`/`db push`는 운영에 사용하지 않는다. `db:seed`는 데모 SKU의 재고를 20으로 덮어쓰는 로컬 fixture이므로 운영 migration과 함께 실행하지 않는다.

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

한 배치 최대 100건을 immutable ID 순으로 확인한 뒤 30초 쉬며 `maintenance.pass`에 `checked`, `unavailable`, `cycleComplete`만 기록한다. PM2 로그 시각으로 마지막 성공과 전체 순회 완료를 별도로 관찰한다. PM2 `online`만으로 정상 판정하지 않는다. `maintenance.pass_failed`, `maintenance.stopped_unexpectedly`, 재시작 횟수, `unavailable` 증가와 오래된 PENDING/REVIEW·재고 예약을 감시한다. 실제 결제 수와 제공자 응답 시간을 기준으로 정한 최대 전체 순회 시간이 지나면 경보한다. 워커가 최대 재시작 횟수를 소진해 멈춘 경우도 웹 상태와 독립적으로 경보한다. 이메일 outbox를 drain하는 작업은 추가하지 않는다.

## SQLite·공용 이미지 온라인 백업

[`events-backup.ts`](../../web/scripts/events-backup.ts)는 `better-sqlite3`의 SQLite Online Backup API로 읽기 전용 원본 연결에서 별도 DB 스냅샷을 만든다. 열린 WAL에만 있는 커밋도 포함한다. 활성 `.db` 파일만 `cp`하거나 `.db`·`-wal`·`-shm`을 각각 복사하지 않는다. 온라인 스냅샷의 일관성은 [SQLite 공식 백업 API](https://sqlite.org/backup.html)를 이용한다.

백업은 압축하지 않은 하나의 디렉터리다.

```text
backup-directory/
  events.db
  images/uploads/...
  images/events/uploads/...
  images/highlights/uploads/...
  manifest.json
```

DB 전체를 보존하므로 행사·하이라이트·공지·도서·작품·운영 상태·슬러그·관리자 세션 테이블이 함께 들어간다. 관리자 세션 해시가 포함될 수 있어 백업도 비공개 자료다. 원문 비밀번호·검증값 환경 파일은 백업 대상이 아니며 별도의 비밀 보관 절차가 필요하다.

이미지는 SQLite 스냅샷의 참조를 확인하고 공용 업로드 경로의 검증된 파일을 모두 복사한다. PostgreSQL 상품에만 연결된 사진, 비공개 콘텐츠, 아직 어느 DB에도 연결되지 않은 업로드도 포함한다. 새 SQLite 테이블·열이 없는 호환 레거시 DB의 참조도 검증한다. 외부 URL의 콘텐츠와 정적 빌드 자산은 포함하지 않는다. 지원하지 않는 경로나 누락된 SQLite 참조가 있으면 실패한다. PostgreSQL 상품 참조와 파일의 일치는 아래 통합 복구 연습에서 별도로 확인한다.

공개 이미지 요청은 현재 공개된 SQLite 콘텐츠 또는 판매 공개 조건을 충족한 상품의 참조를 확인한다. 비공개 항목에만 연결된 이미지와 아직 연결하지 않은 업로드는 인증된 관리자만 볼 수 있다. 공개 항목과 공유한 이미지는 공개된다. 비공개 전환 후 요청에 이전 공개 캐시가 재사용되지 않도록 업로드 응답은 `private, no-store`를 사용하고, Next 이미지 최적화 경로는 정적 빌드 이미지에만 허용한다. 이미 내려받은 파일을 회수할 수는 없으므로 민감한 자료는 게시 전에 확인한다.

현재 앱은 업로드에 새 파일명을 사용하고 콘텐츠를 삭제해도 파일을 즉시 삭제하지 않는다. 이 불변성을 전제로 DB 스냅샷 후 이미지를 보존한다. 백업 도중 운영자가 이미지를 교체·정리하지 않는다. 향후 파일 삭제 기능을 넣으면 백업 보존기간과 실행 중 백업을 고려한 지연 삭제가 필요하다.

Node 24와 이 프로젝트의 설치된 `tsx`·`better-sqlite3`가 있는 `web/`에서 실행한다. standalone 산출물만 있는 호스트에는 이 운영 도구와 검토된 의존성을 별도로 제공해야 한다. 도구는 `.env`나 런타임 설정 파일을 탐색하지 않고 명시한 절대 경로만 사용한다. 상위 백업 디렉터리는 먼저 `0700`으로 준비하고, 출력에는 매번 새로운 이름을 준다.

```sh
node --import tsx scripts/events-backup.ts --help
node --import tsx scripts/events-backup.ts backup \
  --database /absolute/private/data/events.db \
  --images /absolute/private/data/images \
  --output /absolute/private/backups/2026-09-09T120000Z
```

출력 디렉터리의 독점 생성과 파일 덮어쓰기 금지로 기존 DB·백업을 교체하지 않는다. 이미지 경로 이탈과 파일 심볼릭 링크는 거부한다. 완성된 DB를 단일 파일의 DELETE journal 모드로 정리하고 `integrity_check`를 통과시킨 뒤 각 파일의 크기·SHA-256을 manifest에 기록한다. manifest는 마지막에 쓴다. 잡을 수 있는 실패는 이번에 만든 출력만 정리하며, 강제 종료로 남은 불완전 디렉터리는 성공한 백업으로 취급하지 않는다.

온라인 복사에는 5초 SQLite 잠금 대기와 120초 진행 제한이 있다. 공간 부족·잠금·원본 손상·이미지 누락은 종료 코드 1로 보고하고 경로·DB 내용·세션 값을 로그에 출력하지 않는다. 종료 코드와 `restore-check` 통과 여부로 성공을 판단한다.

## 임시 경로 복구 점검

```sh
node --import tsx scripts/events-backup.ts restore-check \
  --backup /absolute/private/backups/2026-09-09T120000Z
```

`restore-check`는 OS 임시 디렉터리 아래 새 `0700` 경로에 DB와 이미지를 복사한다. 파일 해시·크기, DB `integrity_check`, SQLite 참조가 manifest에 포함되는지와 전체 보관 이미지의 일치를 확인한다. 성공·실패 모두 임시 복원본을 정리한다. 활성 DB를 목적지로 지정하는 옵션은 없다. 임시 공간도 백업 전체를 담을 만큼 확보한다.

이 점검은 파일 손상·누락을 찾아낸다. manifest까지 함께 변조할 수 있는 공격자에 대한 서명 검증은 아니다. 백업은 암호화된 별도 저장소에도 복제하고 저장소 접근 권한과 삭제 방지 정책을 적용한다. 복구할 때는 신뢰할 수 있는 보관 출처를 사용한다.

실제 장애 복구에서는 검증한 백업을 **새 비활성 데이터 경로**에 풀고, 복원 후보 DB의 `admin_sessions`를 비워 오래된 세션을 재사용하지 않는다. 새 비밀번호 검증값과 새 DB·이미지 경로를 준비하여 로컬 검토를 완료한 뒤 승인된 전환을 한다. 실행 중 DB 위에 파일을 덮어쓰거나 WAL 파일을 임의 삭제하지 않는다. 롤백도 앱·DB·이미지를 한 세트로 다루며 현재 데이터는 별도로 보존한다.

## PostgreSQL 백업과 통합 복구 연습

SQLite 도구는 PostgreSQL을 백업하지 않는다. 전용 백업 역할과 `0600` libpq service/password 파일을 별도로 준비한다. 아래 `bcs_backup`은 원본에 읽기 권한만 가진 연결, `bcs_restore_check`는 운영과 분리해 미리 만든 **빈 복구 연습 DB**의 연결 이름이다. 호스트·사용자·TLS 설정은 보호 service 파일에서 관리하고 비밀번호 URI를 명령행에 넣지 않는다. 매번 새 백업 디렉터리와 고유 파일명을 사용하고 `umask 077`을 적용한다.

```sh
umask 077
PGSERVICEFILE=/etc/bitcoin-center-seoul/pg_service.conf PGPASSFILE=/etc/bitcoin-center-seoul/pgpass \
  pg_dump --dbname=service=bcs_backup --format=custom --file=/absolute/private/backups/2026-09-21T120000Z/commerce.dump
PGSERVICEFILE=/etc/bitcoin-center-seoul/pg_service.conf PGPASSFILE=/etc/bitcoin-center-seoul/pgpass \
  pg_restore --dbname=service=bcs_restore_check --no-owner --no-privileges --exit-on-error --single-transaction \
  /absolute/private/backups/2026-09-21T120000Z/commerce.dump
```

`pg_dump`의 custom archive는 DB 하나의 일관된 스냅샷을 제공하고 `pg_restore`로 복구한다. 역할·권한·비밀·서버 설정은 별도로 보관·재구성해야 한다. dump 파일을 목록 조회하는 것만으로 복구 성공을 주장하지 않는다. 두 명령의 종료 코드와 비공개 오류 로그를 확인하고 실패·불완전 파일을 성공 백업으로 표시하지 않는다. [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

정기 온라인 백업은 두 DB 사이의 원자적 스냅샷이 아니다. 전환용 복구 지점은 관리자·주문·업로드·웹훅 쓰기와 워커를 정지한 상태에서 PostgreSQL dump, SQLite 스냅샷과 전체 이미지를 같은 배치 ID로 묶는다. 릴리스 커밋·migration 상태·시각·각 산출물 해시와 크기를 비공개 기록에 남긴다. 정기 백업에서도 PostgreSQL을 먼저 스냅샷하고 이후 전체 이미지를 보관하며, 진행 중 업로드 삭제·교체는 금지한다. 목표 RPO가 일일/시간별 dump보다 짧다면 DB 호스트의 WAL/PITR 백업을 운영자가 별도 구성한다.

복구 연습에서는 새 PostgreSQL DB와 새 SQLite/이미지 경로만 사용한다. 인터넷·결제 제공자 접근을 차단하고 REVIEW 설정의 앱으로 공개/비공개 콘텐츠, 상품 이미지와 원본의 상품·주문·결제·예약 재고 개수/관계를 확인한다. LIVE 데이터에 워커나 결제 재시도를 실행하지 않는다. `Payment.mode`가 REVIEW와 분리되어 있다는 이유만으로 운영 자격 증명을 복구 연습에 넣지 않는다. 검증 후 임시 DB와 파일은 명시적으로 식별한 연습 대상만 정리한다.

## 마이그레이션과 롤백 경계

웹과 워커는 같은 릴리스·설정·Prisma schema를 사용한다. migration 후 이전 코드가 새 schema를 안전하게 읽고 쓸 수 있는지 먼저 판단한다. 호환되는 경우 데이터는 보존하고 두 프로세스의 코드를 함께 되돌린다. 비호환이면 쓰기를 정지하고 현재 양쪽 DB·이미지를 별도 보존한 뒤 검증된 복구 지점을 새 비활성 경로/DB로 복원한다. 활성 DB에 덮어쓰기나 자동 down migration을 실행하지 않는다.

백업 이후 생성된 주문·결제·업로드를 무시한 복원은 결제 내역과 재고를 잃게 한다. 결제 제공자의 외부 상태는 DB 복원으로 되돌아가지 않으므로 해당 기록을 보존·대조한 뒤 승인된 복구 절차로 반영한다. 웹훅 중단 중 누락된 알림과 결제 상태는 재개 후 워커가 재조회하도록 하되 REVIEW 항목은 운영자가 확인한다. 자동 환불·재결제·운영 이메일은 이 절차에 없다.

## 운영자가 적용할 일정

초기 운영안은 매시간 양쪽 DB·공용 이미지 백업, 매일 암호화된 외부 복제, 매주 외부 보관본 통합 복구 점검이다. 예를 들어 시간별 24개·일별 7개·주별 4개를 보관하되 필요한 복구 시점과 저장 용량에 맞춰 확정한다. 코드에서 스케줄이나 삭제 작업을 자동 등록하지 않는다.

양쪽 백업 실패·마지막 성공 시각, 전체 복구 점검 시각, 디스크 여유, PostgreSQL 연결·잠금·용량, 서비스 5xx·로그인 제한 급증과 워커 실패를 별도로 관찰한다. 새 백업과 복구 점검이 성공하기 전에 마지막 검증 백업을 삭제하지 않는다. 호스트의 TLS 인증서 갱신, OS·Node·의존성 보안 업데이트, 비밀 파일 권한, 방화벽, 로그 회전, 백업 스케줄·외부 복제·보존 정책은 별도 운영 적용 사항이다.

## 로컬 검증

```sh
node --test tests/events-backup.mjs
```

실제 SQLite 연결을 열어 WAL에만 최신 행사·공지·세션을 커밋한 채 CLI 백업을 실행한다. 비공개 도서·작품과 Markdown 이미지, 해시·권한·DB 무결성, 원본 보존, 임시 복구, 덮어쓰기 거부, 누락·심볼릭 링크·변조·manifest 경로 이탈, 도움말·잘못된 인자를 확인한다. 모든 데이터는 테스트별 임시 경로에 만들고 정리한다.

## Operating status calendar maintenance

The header uses server time in Asia/Seoul, daily 12:00–20:00 hours (Sunday included), and the registered events' start/end times. Korean public holidays are resolved locally with pinned `@hyunbinseo/holidays-kr` data; no runtime external calendar request, API key or visitor geolocation is required. Version 5.2027.1 includes published calendars through 2027, including substitute holidays, election days and announced temporary public holidays. Compare new versions with [KASA's official calendar](https://www.kasa.go.kr/prog/plcyBrf/brief/kor/sub01_01_04/view.do?plcyBrfNo=431) and the [dataset source](https://github.com/hyunbinseo/holidays-kr) when a new calendar or temporary holiday is announced, then update the pinned package and run `npm run test:status` before an approved deployment. Do not infer future unpublished calendars; unsupported years show the unavailable status until data is updated or today's administrator exception is set.

The authenticated event admin's today's-operation controls store `open` or `closed` in `center_opening_overrides`, keyed by Seoul date. Automatic removes that date's exception. Normal operation enables standard hours and actual meetup windows, including on a holiday; temporary closure suppresses both. Dates are retained for overnight meetup eligibility, while the next day's regular opening reverts to its own calendar/exception. The SQLite backup includes these rows. Expired manual `center_status` rows from the earlier local-only prototype are not read or migrated into live status.
