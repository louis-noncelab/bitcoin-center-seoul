# SQLite 및 수동 운영 절차

이 문서는 새 `web/` 서비스의 운영 후보 설정이다. 기존 루트 Express 앱, 운영 DB, 운영 업로드, nginx, PM2를 변경하거나 배포하지 않는다. 실제 전환은 검토된 릴리스에 대한 별도 승인 후 수행한다. GitHub Actions, 자동 푸시, 자동 배포는 사용하지 않는다.

## SQLite 선택

현재 범위는 행사·하이라이트·공지와 소수 관리자의 편집이다. 단일 호스트의 짧은 쓰기 트랜잭션에 맞춰 SQLite와 기존 테이블을 유지한다. PostgreSQL 전환은 지금 필요한 기능이 아니다. 여러 서버가 동시에 쓰거나 지속적인 잠금 대기, 별도 고가용성 요구가 실제로 생기면 저장소 구조를 다시 검토한다.

DB와 WAL은 같은 호스트의 로컬 영구 디스크에 둔다. NFS/SMB 같은 네트워크 파일시스템이나 릴리스 디렉터리, 웹 공개 디렉터리에는 두지 않는다. DB 크기, 여유 공간, WAL 증가, `SQLITE_BUSY` 및 백업 실패를 운영자가 관찰한다. SQLite를 쓴다는 사실만으로 접근 통제나 백업이 해결되는 것은 아니다.

## 경로와 권한

| 설정 | 예시 | 요구 사항 |
| --- | --- | --- |
| 서비스 코드 | `/srv/bitcoin-center-seoul/current/web` | 검토한 릴리스, 운영 DB와 분리 |
| `BCS_EVENTS_DB` | `/var/lib/bitcoin-center-seoul/events.db` | 기존 호환 DB의 절대 경로, 파일 `0600`, 상위 디렉터리 `0700` |
| `BCS_EVENTS_UPLOADS` | `/var/lib/bitcoin-center-seoul/images` | `/images/` 아래 URL에 대응하는 루트, 서비스 계정만 쓰기 |
| 비밀번호 검증값 | `/etc/bitcoin-center-seoul/admin-password.env` | 코드·공개 디렉터리 밖, `0600`, 서비스 계정만 읽기 |
| 백업 | `/var/backups/bitcoin-center-seoul/<고유한 이름>/` | 공개 경로 밖, 디렉터리 `0700`, 파일 `0600` |
| 프로세스 및 로그 | 서비스 계정의 PM2 상태, `/var/log/bitcoin-center-seoul/` | 다른 사용자에게 읽기·쓰기 금지, 보존기간 설정 |

서비스는 전용 비특권 계정으로 하나만 실행한다. 프로세스의 umask는 `0077`로 설정한다. DB 상위 디렉터리를 보호하면 SQLite가 만드는 `-wal`·`-shm`도 같은 접근 경계 안에 놓인다. 데이터·백업·비밀 파일 경로를 nginx `root`/`alias`나 Next `public/` 아래에 연결하지 않는다.

## 기존 관리자 비밀번호의 검증값 전환

관리자가 입력하는 기존 비밀번호는 그대로 사용할 수 있다. 서버에는 원문 `ADMIN_PASSWORD` 대신 `ADMIN_PASSWORD_HASH`만 제공한다. Node 22에서 `web/` 기준으로 다음 도구를 실행하면 터미널 입력을 숨기고 새 `0600` 파일에 scrypt 검증값을 만든다. 기존 파일은 덮어쓰지 않는다.

```sh
npm run admin:password -- --output /absolute/private/new-admin-password.env
```

기존 비밀번호가 이미 해당 명령의 환경에 있는 경우에만 `--from-env`를 추가할 수 있다. 원문을 명령 인자, 셸 히스토리, 로그, 저장소에 넣지 않는다. 이 작업에서 기존 `.env`·`.env.local`을 읽지 않는다. 운영 환경의 원문 `ADMIN_PASSWORD`는 제거하고, 잘못 남은 `ADMIN_PASSWORD_HASH`가 새 파일 값보다 우선하지 않도록 프로세스 환경을 점검한다.

PM2 예시는 Node의 명시적 `--env-file`로 운영자가 새로 만든 검증값 파일을 읽는다. 자동 dotenv 탐색은 `__NEXT_PROCESSED_ENV=true`로 차단한다. `pm2 env`, 환경 덤프, 상태 파일을 공유하지 않는다. 비밀번호를 교체하면 새 검증값 파일을 만들고 승인된 재시작 절차로 반영한다. 검증값이 바뀌면 기존 관리자 세션도 무효화된다.

## ingress 및 프로세스 템플릿

검토 대상은 [`nginx.conf.example`](../../web/deploy/nginx.conf.example)과 [`ecosystem.config.cjs`](../../web/deploy/ecosystem.config.cjs)이다. 기존 루트 배포 파일과는 별개다. 호스트명·인증서·Node 22 실행 파일·서비스 계정·경로는 실제 호스트에 맞게 검토한다.

- 외부는 TLS가 설정된 nginx의 80/443만 접속한다. 앱은 `127.0.0.1:3100`에 바인딩한다. 방화벽과 보안 그룹에서도 앱 포트를 외부에 열지 않는다.
- `APP_ORIGIN`은 실제 정규 HTTPS 출처와 정확히 일치해야 한다. HTTP는 루프백 검토 환경에서만 허용한다.
- 이 예시는 nginx가 인터넷 연결을 직접 받는 구조다. `BCS_TRUST_PROXY=true`와 함께 nginx가 `X-BCS-Client-IP`를 소켓의 `$remote_addr`로 덮어쓴다. 외부에서 보낸 `X-Forwarded-For`, `X-Real-IP`, `Forwarded`를 인증·제한의 근거로 사용하지 않는다. CDN/LB 추가 시 허용된 프록시 주소와 헤더 처리부터 다시 검토한다.
- `/api/admin/login`에 IP당 분당 5회, 버스트 5회의 nginx 제한을 적용한다. 애플리케이션의 로그인 제한은 별도로 유지한다. nginx의 요청 제한 동작은 [공식 문서](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)를 따른다.
- nginx는 전체 요청 크기를 31MiB로 제한한다. 앱의 이미지 합계 30MiB 제한에 multipart 여유를 둔 값이며, 각 이미지 10MiB·최대 12개 제한은 앱에서 검증한다.
- 점으로 시작하는 파일·DB·비밀 파일 경로는 거부한다. 공개 자산과 `/images/`, `/api/`를 포함한 모든 경로는 새 Next 서비스로만 전달한다. 업로드 디렉터리를 직접 공개하는 `alias`와 레거시 Express 폴백은 없다.
- 관리자 요청의 `Origin`은 그대로 전달한다. 프록시가 임의로 재작성하면 출처 검증이 무력화될 수 있다. 신뢰 헤더의 덮어쓰기 규칙은 [nginx 공식 문서](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)에 맞춘다.
- access log에는 메서드·경로·상태·응답 크기·시간만 남기고 접속 IP·쿠키·Authorization·본문·쿼리는 제외한다. 로그 접근 권한과 보존기간은 운영자가 설정한다.

Next standalone 산출물의 실행 파일은 현재 tracing root 기준 `web/.next/standalone/web/server.js`이다. `web/public`과 `web/.next/static`은 각각 standalone의 `web/public`, `web/.next/static` 위치에 포함해야 한다. 저장소의 원본 사진 중 빌드된 정적 자산도 검토한 빌드와 함께 보존한다. 검토용 `.next-events` 산출물과 실제 `.next` 산출물을 섞지 않는다.

SQLite·Sharp는 네이티브 코드를 포함하므로 배포 호스트와 같은 OS·아키텍처에서 잠금 파일로 `npm ci`와 빌드·검사를 수행한다. macOS 검토 산출물을 Linux 서버에 그대로 복사하는 방식으로 검증을 대신하지 않는다.

템플릿 자체는 TLS 인증서 발급, 방화벽 적용, 서비스 계정 생성, 비밀 주입, 로그 회전, nginx 재로드 또는 PM2 시작을 수행하지 않는다. 실제 호스트에서 `nginx -t` 및 서비스 바인딩·TLS·헤더·로그인 제한 검증을 완료한 뒤 승인된 수동 전환을 진행한다.

## 온라인 백업

[`events-backup.ts`](../../web/scripts/events-backup.ts)는 `better-sqlite3`의 SQLite Online Backup API로 읽기 전용 원본 연결에서 별도 DB 스냅샷을 만든다. 열린 WAL에만 있는 커밋도 포함한다. 활성 `.db` 파일만 `cp`하거나 `.db`·`-wal`·`-shm`을 각각 복사하지 않는다. 온라인 스냅샷의 일관성은 [SQLite 공식 백업 API](https://sqlite.org/backup.html)를 이용한다.

백업은 압축하지 않은 하나의 디렉터리다.

```text
backup-directory/
  events.db
  images/uploads/...
  images/events/uploads/...       # DB가 참조하는 경우
  images/highlights/uploads/...   # DB가 참조하는 경우
  manifest.json
```

DB 전체를 보존하므로 행사·하이라이트·공지·슬러그·관리자 세션 테이블이 함께 들어간다. 관리자 세션 해시가 포함될 수 있어 백업도 비공개 자료다. 원문 비밀번호·검증값 환경 파일은 백업 대상이 아니며 별도의 비밀 보관 절차가 필요하다.

이미지는 스냅샷의 `events.image`, `highlights.image`, `content_images.path`를 기준으로 중복 없이 복사한다. 아직 `content_images`가 없는 호환 레거시 DB도 두 기본 테이블의 이미지를 보존한다. 참조하지 않는 고아 업로드·외부 URL의 콘텐츠·정적 빌드 자산은 포함하지 않는다. 지원하지 않는 경로나 누락된 이미지가 있으면 조용히 생략하지 않고 실패한다.

현재 앱은 업로드에 새 파일명을 사용하고 콘텐츠를 삭제해도 파일을 즉시 삭제하지 않는다. 이 불변성을 전제로 DB 스냅샷 후 이미지를 보존한다. 백업 도중 운영자가 이미지를 교체·정리하지 않는다. 향후 파일 삭제 기능을 넣으면 백업 보존기간과 실행 중 백업을 고려한 지연 삭제가 필요하다.

Node 22와 이 프로젝트의 설치된 `tsx`·`better-sqlite3`가 있는 `web/`에서 실행한다. standalone 산출물만 있는 호스트에는 이 운영 도구와 검토된 의존성을 별도로 제공해야 한다. 도구는 `.env`나 런타임 설정 파일을 탐색하지 않고 명시한 절대 경로만 사용한다. 상위 백업 디렉터리는 먼저 `0700`으로 준비하고, 출력에는 매번 새로운 이름을 준다.

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

`restore-check`는 OS 임시 디렉터리 아래 새 `0700` 경로에 DB와 이미지를 복사한다. 파일 해시·크기, DB `integrity_check`, 스냅샷의 전체 이미지 참조와 manifest의 일치를 확인한다. 성공·실패 모두 임시 복원본을 정리한다. 활성 DB를 목적지로 지정하는 옵션은 없다. 임시 공간도 백업 전체를 담을 만큼 확보한다.

이 점검은 파일 손상·누락을 찾아낸다. manifest까지 함께 변조할 수 있는 공격자에 대한 서명 검증은 아니다. 백업은 암호화된 별도 저장소에도 복제하고 저장소 접근 권한과 삭제 방지 정책을 적용한다. 복구할 때는 신뢰할 수 있는 보관 출처를 사용한다.

실제 장애 복구에서는 검증한 백업을 **새 비활성 데이터 경로**에 풀고, 복원 후보 DB의 `admin_sessions`를 비워 오래된 세션을 재사용하지 않는다. 새 비밀번호 검증값과 새 DB·이미지 경로를 준비하여 로컬 검토를 완료한 뒤 승인된 전환을 한다. 실행 중 DB 위에 파일을 덮어쓰거나 WAL 파일을 임의 삭제하지 않는다. 롤백도 앱·DB·이미지를 한 세트로 다루며 현재 데이터는 별도로 보존한다.

## 운영자가 적용할 일정

초기 운영안은 매시간 로컬 백업, 매일 암호화된 외부 복제, 매주 외부 보관본 복구 점검이다. 예를 들어 시간별 24개·일별 7개·주별 4개를 보관하되 필요한 복구 시점과 저장 용량에 맞춰 확정한다. 코드에서 스케줄이나 삭제 작업을 자동 등록하지 않는다.

백업 실패, 마지막 성공 시각, 디스크 여유, 서비스 5xx·로그인 제한 급증을 관찰한다. 새 백업과 복구 점검이 성공하기 전에 마지막 검증 백업을 삭제하지 않는다. 호스트의 TLS 인증서 갱신, OS·Node·의존성 보안 업데이트, 비밀 파일 권한, 방화벽, 로그 회전, 백업 스케줄·외부 복제·보존 정책은 별도 운영 적용 사항이다.

## 로컬 검증

```sh
node --test tests/events-backup.mjs
```

실제 SQLite 연결을 열어 WAL에만 최신 행사·공지·세션을 커밋한 채 CLI 백업을 실행한다. 이미지와 해시·권한·DB 무결성, 원본 보존, 임시 복구, 덮어쓰기 거부, 누락·심볼릭 링크·변조·manifest 경로 이탈, 도움말·잘못된 인자를 확인한다. 모든 데이터는 테스트별 임시 경로에 만들고 정리한다.
