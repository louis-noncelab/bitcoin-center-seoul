# 수동 배포 안내

배포 대상은 새 `web/` 서비스입니다. 현재는 로컬 검토본이며, 실제 서버 전환은 검토한 릴리스에 대한 별도 승인 후 진행합니다. 이 문서는 배포를 실행하지 않습니다.

## 기준 문서와 설정

- [운영 절차](docs/security/operations.md): 데이터 경로·권한, 비밀번호 검증값, 프록시, 백업과 복구의 기준입니다.
- [로컬 검증](web/README.md): 실행 방법과 검사 명령입니다.
- [PM2 템플릿](web/deploy/ecosystem.config.cjs), [nginx 템플릿](web/deploy/nginx.conf.example): 호스트명·인증서·Node 실행 경로·데이터 경로를 실제 서버에 맞춰 검토해야 합니다.

## 전환 순서

1. 릴리스 커밋과 서버 설정을 확정합니다. 기존 서비스와 데이터 경로를 확인하고, 기존 환경변수 파일을 열거나 비밀값을 출력하지 않습니다.
2. PostgreSQL 호스트·지원 버전·TLS·접근 역할·백업을 확정합니다. 기존 SQLite는 콘텐츠와 관리자 세션용으로 유지합니다. 작은 EC2의 여유 디스크·메모리를 확인하기 전 같은 호스트에 PostgreSQL을 설치하거나 빌드하지 않습니다. 빌드는 별도의 호환 Linux 환경에서 할 수 있습니다.
3. 운영 절차에 따라 SQLite와 **전체 공용 업로드**, PostgreSQL `pg_dump`를 같은 복구 지점으로 보관합니다. SQLite `restore-check`와 별도 PostgreSQL DB의 `pg_restore` 복구 연습을 모두 통과해야 합니다. 최종 백업·마이그레이션·전환 동안 관리자와 주문 쓰기, 웹훅 처리 및 결제 워커를 정지합니다. 로컬 `review -- import`는 운영 데이터 이전에 사용하지 않습니다.
4. 배포 호스트와 같은 OS·아키텍처에서 Node 24와 잠금 파일로 `npm ci`, `__NEXT_PROCESSED_ENV=true npm run check`, `__NEXT_PROCESSED_ENV=true npm run build`를 수행합니다. 설치·타입 검사·빌드 전 Prisma client가 자동 생성됩니다. DB 접속이나 환경 파일은 생성에 필요하지 않습니다. SQLite·Sharp를 포함한 macOS 산출물을 Linux에 그대로 배포하지 않습니다.
5. 보호된 `commerce.env`와 별도 관리자 검증값 파일을 준비합니다. 운영 절차의 명시적 Node `--env-file` 명령으로 `db:deploy`에 해당하는 `prisma migrate deploy`를 실행하고 migration 상태를 확인합니다. `db:migrate`, `db:seed`, `db push`는 운영 릴리스 명령이 아닙니다. 데모 seed는 재고를 초기화하므로 운영에서 실행하지 않습니다.
6. standalone 서버·`public`·`.next/static`과 함께 **워커/백업 스크립트, `src/server`, 생성한 `src/generated/prisma`, `tsconfig.json`, `prisma.config.ts`, `prisma/`, 잠금 파일과 전체 검증 의존성(`tsx`, Prisma CLI 포함)**을 릴리스에 넣습니다. 전체 `web/` 소스와 호환 `node_modules`를 비공개 릴리스 경로에 보관하는 방식이 기준이며 비밀 파일·로컬 DB·검토 자료는 제외합니다. 웹은 루프백 단일 프로세스, 결제 워커는 PM2의 별도 단일 프로세스입니다.
7. `nginx -t`, HTTPS, 두 신뢰 프록시 설정과 `X-BCS-Client-IP`, 관리자 로그인·로그아웃·업로드, 비로그인 상품 이미지와 비공개 이미지 차단을 확인합니다. 웹훅 토큰 경로가 access/error 로그에 남지 않는지 등록 전에 확인합니다. 정식 공개 시 `BCS_PUBLIC_INDEXING=true`와 robots.txt·메타데이터를 확인합니다. 실제 결제나 이메일 발송을 검증에 포함하지 않습니다.
8. 승인된 시점에 트래픽과 워커를 전환하고 웹 오류·워커 마지막 성공/전체 순회 시각·백업 상태를 각각 확인합니다. 문제가 생기면 아래 운영 절차대로 웹과 워커를 함께 되돌립니다. DB rollback은 호환성 검토 없이 실행하지 않으며 전환 후 주문·결제·업로드는 별도 보존합니다.

## 기존 배포 파일

루트 `deploy.sh`는 EC2 안에서 `origin/main`으로 작업 트리를 초기화하고 기존 Vite 앱을 빌드하는 레거시 스크립트입니다. 새 `web/` 배포에 사용하지 않습니다. `upload-to-ec2.sh`도 `rsync --delete`로 운영 DB·업로드를 지울 수 있어 사용하지 않습니다.

GitHub Actions는 사용하지 않으며 기존 워크플로는 `.github/workflows/deploy.yml.disabled`로 보존합니다. 푸시는 배포 절차가 아닙니다.

## 콘텐츠 반영

코드 릴리스에는 운영 DB·업로드·후기 초기 데이터를 포함하지 않습니다. 기존 `/var/lib/bitcoin-center-seoul/events.db`와 `images/`를 유지하며 초기 후기는 개발 안내의 명시적 `reviews:import`로 반영합니다. 먼저 별도 DB 사본에서 가져오기와 재실행을 검증하고, 운영에서는 관리자 쓰기를 중지한 상태로 최신 백업·복구 검증 후 반영합니다. 구 버전 앱으로 되돌릴 때 새 후기는 보존하고, DB 복구가 필요한 경우 반영 이후 데이터를 별도로 보관합니다.

동일 잠금 파일·Node ABI의 호환성을 확인한 릴리스는 이전 릴리스의 검증된 Linux 네이티브 의존성을 재사용할 수 있습니다. 새 JavaScript 산출물과 정적 파일을 분리해 전송하고, 격리된 Linux 서비스에서 SQLite·Sharp·공개 페이지를 확인한 뒤 전환합니다. 의존성 또는 ABI가 바뀌면 Linux에서 다시 설치·검증합니다.
