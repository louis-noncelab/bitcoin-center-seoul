# Bitcoin Center Seoul — 행사·하이라이트

Next.js 공개 사이트와 한국어 콘텐츠 관리 화면입니다. 공개 페이지는 한영·라이트/다크를 지원합니다. 행사·하이라이트·공지 등록·수정·삭제와 여러 사진 업로드를 제공합니다. 결제·상점·장바구니·회원·자체 예약은 포함하지 않습니다.

## 기존 DB와 비밀번호

기존 SQLite `events`, `highlights` 테이블과 ID를 유지합니다. PostgreSQL 전환이나 새 운영 DB 생성은 필요하지 않습니다. 갤러리, 세션·로그인 제한, URL 슬러그용 지원 테이블만 추가합니다. 기존 콘텐츠는 자동 삭제하거나 다시 쓰지 않습니다. 서버 실행 시 기존 DB 파일과 스키마를 확인하며, 경로가 없거나 잘못되면 빈 DB를 만들지 않고 오류를 반환합니다. 새 DB 생성은 명시적인 로컬 사본 가져오기에서만 허용합니다.

- `BCS_EVENTS_DB`: SQLite 파일의 절대 경로.
- `BCS_EVENTS_UPLOADS`: `/images/` 아래 상대 경로에 대응하는 이미지 폴더의 절대 경로.
- `ADMIN_PASSWORD_HASH`: 기존 관리자 비밀번호로 만든 scrypt 검증값. 앱은 원문 `ADMIN_PASSWORD`를 받지 않습니다.
- `APP_ORIGIN`: 사이트의 정확한 HTTPS origin. 루프백 검토 환경에서만 HTTP를 허용합니다.
- `BCS_TRUST_PROXY`: 운영에서 `true`로 설정하고, 외부 접근이 차단된 앱 앞의 nginx가 `X-BCS-Client-IP`를 실제 연결 IP로 덮어써야 합니다. 설정되지 않은 운영 로그인은 거부됩니다.

기존 비밀번호를 변경할 필요 없이 다음 도구로 검증값을 만듭니다. 입력은 화면에 표시되지 않으며 새 비공개 파일(0600)에만 기록합니다. 이 파일의 `ADMIN_PASSWORD_HASH`를 앱에 제공하고 원문 환경변수는 제거합니다.

```sh
npm run admin:password -- --output /absolute/private/new-admin-password.env
```

설정이 없으면 과거 비밀번호로 대체하지 않습니다. 로그인은 무작위 HttpOnly·SameSite=Strict 쿠키를 사용하고 서버는 토큰 해시만 저장합니다. 세션은 30분 미사용 또는 발급 8시간 후 만료되며 비밀번호 검증값 변경 시 무효화됩니다. 사진을 글에서 제거해도 공유 파일은 자동 삭제하지 않습니다. 배포 전 [운영 절차](../docs/security/operations.md)의 비밀번호 전환·프록시·백업 설정을 적용하고 검증해야 합니다.

## 로컬 검토

Node 22와 npm을 사용합니다. 기존 `.env`/`.env.local`은 열지 않습니다. `web/`에서 실행합니다.

```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
npm run review -- init
npm run review -- import
npm run review -- check
npm run review -- build
npm run review -- start
```

공개: `http://127.0.0.1:3102/ko`, 관리: `http://127.0.0.1:3102/ko/admin`.
지갑 체험: `http://127.0.0.1:3102/ko/experience/wallet`. 기존 `/walletExperence`도 로컬 가이드로 연결합니다.

관리자는 새 글의 URL 슬러그를 지정합니다. 기존 글은 지정 전까지 숫자 주소로 열리며, 지정·변경 후에는 숫자 주소와 과거 슬러그가 최신 주소로 연결됩니다. 영문 소문자·숫자·하이픈을 사용하고 중복 주소는 저장할 수 없습니다. 활동 기록은12개씩 페이지를 나누며 `?page=2` 주소로 공유할 수 있습니다.
로컬 설정은 ignored `.local/events-review/runtime.json`에 생성합니다. 여기의 무작위 비밀번호 원문은 브라우저 테스트용이며 운영 자격 증명이 아닙니다. 검토 실행기는 기존 검토 비밀번호의 해시를 한 번 추가하고 앱 프로세스에는 해시만 전달합니다. 검증된 운영 공개 사본에서 별도 로컬 SQLite·이미지를 만들며 원본은 보존합니다. `init`은 기존 설정을 덮어쓰지 않습니다.

서버를 실행한 상태에서 다음을 실행합니다.

```sh
npm run review -- test
npm run test:security
npm run test:backup
npm run test:image-optimizer
npm run audit
```

이미지 처리에는 이전 검증에서 필요했던 Next16.3.4 고정 패치를 유지합니다. 설치 시 원본 해시를 확인하고 요청 중단·용량 제한 회귀를 검사합니다.

## 복구 지점

축소 기준: `63a08b95cb54e06d9a00c89ae14d8d9eb1851284`.
미커밋 변경 포함 백업: `backup/center-web-before-events-only-20260909-175952`, 커밋 `b1cc3f81190f06fb53da668c003421f479854543`.
저장소 밖 `/Users/max/noncelab/center/bitcoin-center-seoul-backups/20260909-175952`에 독립 복원이 검증된 Git bundle과 공개/디자인 자산 아카이브가 있습니다. 런타임 DB·비밀 설정은 Git 백업에 포함하지 않았으며 원래 위치에 보존했습니다.

현재는 noindex 로컬 검토본입니다. 푸시·배포·GitHub Actions·운영 데이터 변경은 수행하지 않습니다. 루트 Vite/Express 앱과 배포 스크립트는 보존된 레거시이며 보안 개선 대상인 새 서비스의 실행 경로로 사용하지 않습니다. 특히 구버전 API를 같은 도메인에 병행 노출하거나 기존 업로드/배포 스크립트를 실행하지 않습니다.

## 공지사항
`/ko/admin/notices`에서 공지를 등록·수정·삭제합니다. 새 공지는 비공개로 저장되며 공개 체크 후 저장하면 `/ko/notices`와 `/en/notices`에 표시됩니다. 영어 제목·본문은 선택이며 미입력 시 한국어를 표시합니다. URL 슬러그를 바꿔도 이전 주소가 연결됩니다. 기존 SQLite에 notices/notice_slugs 테이블만 추가하며 기존 비밀번호와 데이터는 유지합니다.
