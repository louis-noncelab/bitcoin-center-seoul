# 공개 디자인 재개 체크포인트

> 이 문서는 이전 후보의 기록입니다. 이후 사용자 UI/UX 피드백에 따른 최신 구현·검증은 [디자인 수정 기록](2026-09-08-design-revision.md)과 [최신 인수인계](../handoff/2026-09-08-design-revision-next.md)를 우선합니다.


## 작업 경계

- 2026-09-08, `redesign/center-web`, HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`.
- 인수인계 `2026-09-08-codex.md` 994행, `2026-09-08-codex-start.md` 69행을 부록까지 읽었다. 첫 입력 본문 전체를 적용한다. U01–U33, 15개 답변, 하위 작업 11개는 인수인계의 역사 기록으로 보존한다.
- 이번 산출물은 로컬에서 검토 가능한 공개 디자인 후보. 최종 디자인 승인은 아직 없다. 백엔드/관리자/인증/결제/DB 이전/배포/커밋은 진행하지 않는다.
- 기존 `src/`, Express, SQLite, 업로드와 `/walletExperence` 보존. Actions 사용 금지, `deploy.yml.disabled` 보존.
- 시작 시 기존 변경: 삭제 상태의 `deploy.yml`, 수정된 `AGENTS.md`, 미추적 disabled 파일·`docs/`·`web/`·`OmO-session-2026-09-08T08-16-29-843Z_01a08017-0e93-7fb6-a1ed-93a427df99eb.html`. 초기화하지 않았다.
- Node 22.23.2 확인. 과거와 달리 현재 `.codegraph/` 존재. 먼저 조회하되 누락 파일은 실제 파일에서 읽는다.

## 실행 계획

| 단계 | 상태 | 완료 기준 |
| --- | --- | --- |
| 1. 문서/브랜치/부분 구현 대조와 담당 복구 | completed | 원문 전체 읽기, 현재 경로와 작업 경계 확인 |
| 2. 라우팅 복구·폰트/SVG 비교·실사 콘텐츠 준비 | completed | locale 루트 복구, 실제 폰트 3안/SVG 비교, 7개 사진·카피 출처 |
| 3. 홈·여섯 공개 영역·SEO·디렉터리 통합 | completed | 한영 홈/6개 영역, 정적 사진, canonical/hreflang/OG/sitemap/noindex |
| 4. 로컬 타입·린트·브라우저·빌드·보안 검사와 시각 수정 | completed | 최신 build 전체 검사, 독립 검토 PASS/블로커0 |
| 5. 사용자 검토용 시안과 최신 인수인계 제공 | completed | 시안 URL, 최종 검증/독립 PASS, 남은 결정과 다음 시작 문서 제공 |

## 원본 마지막 TODO 10개 + 추가 요청

| 원본 번호 | 현재 처리 | 상태 |
| --- | --- | --- |
| 1 | 브랜치/기존 파일/승인 기준 확인 | completed |
| 2 | 실제 사진·카피·시각 구성, 출처 보고서 | completed |
| 3 | 홈과 여섯 영역의 한영 첫 시안 실행 | completed |
| 4 | 반응형·모션·접근성·로컬 검사, 현재 build 독립 PASS | completed |
| 5 | Actions 제외, 로컬 시안과 최신 인수인계 안내 | completed |
| 6 | 옛 “자동배포 설정 제거”는 삭제 지시로 재실행하지 않음 | preserved |
| 7 | Impeccable/taste·기존 모션 연구 적용 | completed |
| 8 | 원본 배포 파일 disabled 보존 | preserved |
| 9 | 한영 기본 Pretendard, 공식 로컬 subset/OFL, 실제 glyph/전체 화면 검증 | completed |
| 10 | Lucide 공통 관리 + SVG 두 세트 2,402개, MIT/고정 출처/무결성 검증 | completed |
| U33 | 실제 사용 경계에 맞춘 프로젝트 디렉터리와 README | completed |

## 병렬 소유권

- 총괄: 홈/여섯 영역의 서버 페이지와 `components/site/`, 사이트 스타일, SEO, `DESIGN.md`, README/구조 문서, 이 체크포인트와 종합 검증.
- `foundation` (GPT-5.6 Terra, high): root/locale layout, root page, i18n request, proxy, dev-tools route/component, 필요 시 next.config, `tests/routing.spec.ts`; 보고서 `foundation-2026-09-08.md`.
- `type_icons` (GPT-5.6 Terra, high): design-system page/specimen CSS, 비교 컴포넌트/폰트 자산, `docs/design/type-icons-2026-09-08.md`. 공유 폰트 변경은 총괄과 조율.
- `content_assets` (GPT-5.6 Sol, medium): `src/content/center.ts`, `src/content/media.ts`, `docs/design/content-assets-2026-09-08.md`.
- 작업자는 같은 파일을 동시에 수정하지 않는다. 완료 보고만으로 통과 판정하지 않고 총괄이 결과물과 브라우저를 검증한다.

## 복구 시 확인된 상태

- 홈 `web/src/app/[locale]/page.tsx` 없음, root page는 null. 기존 layout 두 곳의 html/body 중복도 소스에서 확인.
- Next 16.3.4/React 19.2.8, npm 잠금 파일과 설치된 의존성 존재. 재설치하지 않음.
- 기존 `DESIGN.md`의 잘못된 자산·영상·라이선스 설명은 인수인계에 따라 수정 대상.
- 이전 실패한 Playwright 결과는 이번 결과와 구분하여 보존한다. 이번 실행 검증은 아직 미실행.

## 미정 사항과 다음 단계

- 실제 화면을 본 뒤 최종 디자인/사진 구성 선택. 기본 폰트 방향은 Pretendard로 반영한다. 제공 로고의 최종 벡터와 정확한 색은 미확정.
- 공개 전 주소/운영 시간/신규 한영 카피, 사진 권리·공개 동의 재확인. 추가 촬영 목록 준비.
- 예약 정책 범위, 토스 원화 수납, 배송/환불/관리자 세부 권한과 DB 이전·복구 설계는 디자인 승인 다음 단계. 인수인계 3절/8절을 출발점으로 이어가며 완료로 표시하지 않는다.

## 이번 세션 실행 증거 (중간)

- Node 22 dev 서버 `127.0.0.1:3100`, 총괄 세션 ID 25731 (재개 시 프로세스 존재부터 확인).
- `evidence/home-before.log`: 이번 세션에서도 기존 홈 테스트 실패를 확인한 뒤 홈 구현. 과거 실패 기록은 `evidence/pre-resume-playwright/`에 별도 보존.
- `evidence/primitives/results.json`: 375/768/1280px 실제 Chrome에서 tab 키보드 선택, dark 전환, disclosure 열기, overflow 없음. 공유 controls CSS 추출 도중 캡처 한 번에 스타일이 빠졌으나 global import 후 재촬영했다.
- `foundation-2026-09-08.md`: root params 생성 정상, routing Playwright 3/3. 이 보고서는 홈 통합 전 범위이며 현재 전체 검사로 대체하지 않는다.
- `evidence/check.log`: 타입과 린트 통과. 기존 postcss anonymous default 경고는 명명된 config로 수정했다.
- `evidence/audit.json`: 이번 npm audit exit 0, vulnerability 0. 인증/운영 안전성 인증이 아니다.
- `evidence/first-home/`: ko 1280/375, en 1280 HTTP 200, pageerror/overflow 없음. 총괄이 실제 캡처를 열어 확인. dev toolbar가 포함되어 있으므로 최종 증거는 production 서버에서 다시 촬영할 것.
- LSP MCP와 자동 hook은 fresh diagnostics 3000ms timeout. clean이라고 보고하지 않는다. 직접 `next typegen && tsc --noEmit`, ESLint로 소스 오류를 확인하고 계속 진행한다.
- 초기 capture의 숨겨진 lazy img.decode 대기를 중단하고 visible 이미지마다 스크롤/디코드하는 방식으로 수정했다. 검사 도구 문제이며 앱 이미지 실패로 판정하지 않는다.
- 각 담당 산출물을 총괄이 읽고 통합했다. 상세 출처는 `docs/design/type-icons-2026-09-08.md`, `docs/design/content-assets-2026-09-08.md`.
- 프로그램 첫 탭은 검증된 프로토콜 강의 사진을 쓰는 교육. 밋업 탭은 라운지 사진. 얼굴 가림 그래픽이 있는 옛 밋업 사진은 첫 시안에서 제외했다.
- disabled workflow SHA-256: `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`.

## 09:03 UTC / 18:03 KST — 독립 리뷰 수정과 재검증

- 첫 production build와 100개 Playwright 검사는 통과했으나, 독립 리뷰 A/B는 REVISE였다. B는 96/96 PNG와 8개 상태 캡처를 직접 열었다. 첫 보고서는 `reviews/review-a-first.md`, `reviews/review-b-first.md`.
- 한국어 보조 표현 5곳을 nonbreaking space로 묶었다. 영어 도로명 `2an-gil`은 nonbreaking hyphen으로 묶었다. 사실·폰트 크기는 바꾸지 않았다.
- 모바일 masthead 값을 공통 responsive token으로 옮기고 `DESIGN.md`와 focus token 문서를 맞췄다.
- 워드마크의 중복 aria-label을 없애고 언어 전환의 접근성 이름에 보이는 언어 표기를 포함했다. 비교 화면의 이름 있는 generic div 2개를 semantic section으로 바꿨다.
- 첫 axe 설정에서 빠졌던 WCAG2.1 A/label-in-name 검사를 확장하자 32개 화면 사례에 문제가 나왔다. 0개였던 초기 결과만 최종 결과로 쓰지 않는다. 재검증은 WCAG2/2.1/2.2 A/AA의 명시된 tags와 label rule을 포함한다.
- 자동 `next-intl` alternate header와 직접 만든 메타데이터가 서로 다른 origin을 내보내던 원인을 확인했다. HTML metadata/sitemap이 주소를 관리하도록 `alternateLinks: false`로 통일하고 회귀 검사를 추가했다. noindex는 유지한다.
- 상세 프로그램과 기록의 h1→h3 건너뛰기도 h2로 수정했다. 홈의 프로그램은 기존 h2 아래 h3를 유지한다.
- 초점/메뉴 캡처는 160ms transition 이후 250ms에 촬영한다. 기존 사진이 실제로 잘렸다고 판정하지 않고 캡처 상태 문제를 고쳤다.
- 첫 결과와 캡처는 `evidence/before-review-fixes/`에 보존. 새 소스로 type/lint/build 통과했고 100-case 및 browser audit를 새로 실행 중이다. 완료 여부는 아래 최종 기록으로 확정할 것.
- React Scan Lite를 앱에 포함하지 않고 audit browser에만 주입했다. 16개 경로에서 오류 commit/idle commit 0. 실제 Next 내장 renderer는 `19.3.0-canary-cbb046ab-20260731`, production profiling hooks unavailable(`no-inject-method`). 설치된 Lite API에 `unnecessary` 분류 필드가 없어 '불필요 렌더 0'이라고 단정하지 않는다.
- 첫 Lighthouse 실제 Chrome 홈 4회: performance/accessibility/best-practices100, SEO61. 이 값은 수정 전 값이다. SEO는 noindex와 중복 alternate origin이 원인이었고 수정 후 전체 경로를 다시 측정한다.

## 09:11 UTC / 18:11 KST — 최신 검사와 마지막 사진 보정

- build `9_yczyc3ZOgQmCpP362Bu`에서 100/100 Playwright, axe32건 위반0/incomplete0, 16경로320px overflow0. 최신 원본은 `evidence/source-manifest.json`.
- 실제 Chrome의 전체16경로×2장치 Lighthouse32회 완료: 성능/접근성/권장사항 모두100. SEO66–69, 남은 실패는 의도된 검색 차단. 재방문 조건의 측정 한계는 `2026-09-08-validation.md`에 명시했다.
- 새 A 검토자는 현재 build, 소스50개 및 PNG96개 해시를 대조하고 모든 PNG와 상태8개를 직접 열어 PASS했다. B는 비교용 세로 책장 사진이 저해상도로 요청되는 문제를 추가 발견했다. A의 PASS만으로 전체 완료하지 않는다.
- B가 실제 Chrome DPR1에서 확인한 값: 375px frame335×418.75에384×216(1.939배 확대), 768px frame224.859×281.063에384×216(1.301배), 1280px frame381.875×477.344에640×360(1.326배). landscape 원본5652×3179를4:5로 cover하는 폭을 `sizes`에 반영해야 한다. 원본과 공개 페이지의 landscape 사진은 해당 문제가 없다.
- 이 항목을 마지막으로 수정하고 재촬영/재검토한다. 최종 디자인/폰트/로고 선택과 backend 작업은 여전히 별도 단계다.

## 추가 지시 — Pretendard, SVG 자산, Git 정리

- 한영 제목/본문을 Pretendard로 통일했다. 공식 v1.3.9 Unicode subset 92개를 로컬에 두고, 전체 2MB 파일은 `.local/font-source/`로 보존 이동했다. Manrope/Noto는 비교 경로에만 남긴다. 변경 후 production 재검증 전이므로 기존 성공 수치를 새 폰트 검증으로 인용하지 않는다.
- SVG 담당은 `web/assets/icons/`와 전용 출처 문서만 소유한다. Tailwind 참조 324개, Bootstrap 2078개의 라이선스·정적 SVG 안전성·원본 무결성을 확인해 프로젝트에 들여온다. 화면의 기본 Lucide와 최종 로고 수급은 구분한다.
- Git 정리 담당은 `.gitignore`와 `2026-09-08-gitignore-cleanup.md`를 완료했다. 세션 HTML을 해시 보존 이동하고 인덱스/로컬 설정/원시 QA 자료를 제외했다. 소스·테스트·사람이 읽는 검토 문서는 추가 가능하다.
- 사진 `sizes` 수정 build `ori7IA8ua0_AXbImLvubJ`의 전체 검사는 97 pass/5 timeout이었다. 실패는 1280px 비교 화면의 동일한 `exhibition` 1080px 변환 요청에 집중됐다. HTTP/axe32/reflow16은 통과했지만 전체 완료로 표시하지 않는다. 원인 진단 뒤 새 폰트 build 전체 검사를 실행한다.
- 같은 build/cache로 미리보기 프로세스만 재시작하자 해당 1080px 요청이 HTTP200/decoded1080×607로 회복됐다. 원본 JPEG와 native Sharp 변환도 정상이다. 이전 프로세스 상태로 좁혔지만 내부 optimizer 원인까지 증명한 것은 아니다. 이후 전체 해상도 검사를 그대로 유지한다.
- Pretendard build `yPLb1Kc3DNaV5BvEG-V8o`에서 102개 항목은 모두 통과, axe32/reflow16/HTTP7도 통과했다. 하지만 Playwright worker2개가 browser fixture 종료에서 대기했다. inspector는 runFinished=true/fatalErrors=[]/browserConnected=false를 확인했다. 해당 run은 SIGINT 종료130으로 기록하고 정상 exit0로 보고하지 않는다. 임시 inspector와 해당 작업 프로세스는 종료했다.
- 비교 페이지의 옛 Manrope/Noto 설명까지 한영 Pretendard로 맞춘 최신 build는 `jmVGu4U7mesK-A47WAMFK`. 타입·린트·build 통과. 마지막 전체 검사는 같은 assertion을 유지하고 worker1로 실행한다. 새 캡처/독립 리뷰/성능 결과로만 최종 판정한다.
- SVG 담당 완료: Heroicons324개는 `bd6c5c0d5acec14d116da611b4c5044fec1bb7dc`, Bootstrap2078개는 v1.13.1의 `ce0e49dd063243118a115f17ad1fe1fe7576d552`와 모두 바이트 일치. 총괄도 로컬 원본2,402개와 복사본의 이름/해시/크기를 전부 재검증했다. 두 세트 SVG합계1,399,570B, 각MIT 포함. 앱 자동import 없이 `web/assets/icons/`에 보관한다.
- build `jmVGu4U7mesK-A47WAMFK` 순차 검사102/102, exit0,47초. 다만 총괄의 CDP 실렌더 폰트 검사에서 `document.fonts` loaded0, 실제 Apple/SF 시스템 폰트를 발견했다. `font-family` 이름과 `document.fonts.ready`만으로 폰트 적용을 확정하면 안 된다. URL CSS import가 빌드 출력에서 사라져 있었으며, 상대 소스 CSS import로 바꿔 실제 @font-face를 묶는다. 로드된 Pretendard를 요구하는 기존 화면 테스트를 추가했고 같은 home375px에서 먼저 실패를 확인했다. 폰트 수정 전102통과를 최종 폰트 검증으로 쓰지 않는다.
- 실제 폰트 수정 build `VW6RTRHWutxOd2NMwW_H2`: 빌드 CSS에92 font faces 출력 확인, strict type/lint/build 통과. 총괄의 실제 Chrome CDP에서 한영 h1/p 모두 `Pretendard Variable`, `isCustomFont=true` 확인. 첫 로드 font 파일은 한글14개367,156B/영문3개89,936B였고 외부 요청0. 방문→언어 경로 유지→다크→메뉴/Escape 시나리오도 통과했다. 전체 테스트/캡처를 새로 실행 중이다.

## 09:51 UTC / 18:51 KST — 현재 빌드 최종 검사

- build `VW6RTRHWutxOd2NMwW_H2` 전체 Playwright **102/102,57.7초,exit0**. loaded Pretendard assertion 포함. 한영×8경로유형×2테마×3너비 **96 PNG**, 상태8 PNG 모두 signature/크기/해시 확인. 소스/설정/폰트/테스트147개와 함께 `evidence/source-manifest.json`에 기록했다.
- axe32건 위반0/incomplete0,320px reflow16건 overflow0,HTTP7건과dev-tools차단/보안헤더 확인. DPR1/2의24사진측정 모두 통과(최대 확대비0.901/0.884). 실제 custom Pretendard 및 방문/언어/테마/메뉴 동작도 총괄 확인.
- React Doctor77/100 경고2개 판정 유지, React Scan16경로 오류0/정착 후500ms idle commit0. profiling hook 부재와 API 한계는 종합 보고서에 명시했다.
- Lighthouse32회 모두 성능/접근성/권장사항100. SEO66–69는 시안 noindex 때문이다. 재방문 조건이며 최대LCP1061.9ms/CLS0/TBT37.04ms. 원격 첫 방문이나 실사용자 p75로 해석하지 않는다.
- branch/HEAD,147소스/96페이지/8상태 해시 동일. `git diff --check` 통과. 활성 yml/yaml workflow0개, disabled파일 지정 해시 보존. 소스/폰트/SVG/테스트/검토 문서/예제env/lockfile은 추가 가능하고 raw evidence만 로컬 제외된다.
- 새 독립 종합 검토 `current_visual_gate`가 현재 전체 캡처를 확인 중이다. 이 판정 이후 단계4를 완료한다. 다음 시작점은 `docs/handoff/2026-09-08-public-design-next.md`.

## 최종 인계 — 공개 후보 단계 완료

- 독립 검토 `current_visual_gate`: **PASS/APPROVE, confidence HIGH, 블로커0**. 현재 build `VW6RTRHWutxOd2NMwW_H2`, HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`, manifest SHA-256 `8927523009b29ee173c6eb2866d90d1c310f7003493cff8f88292b3c02fe4e18`에 결합된 판정이다.
- 검토자가147소스/96페이지/8상태 해시를 독립 검증하고 PNG104장을 모두 original detail로 열었다. 실제 Chrome에서 메뉴/초점/언어/테마/탭/모션도 확인했다. `reviews/review-current-final.md`가 승인 증거이며 앞의 과거 중간 상태를 대체한다.
- 이번 실행 계획5단계와 로컬 후보용 TODO를 완료했다. 원본TODO6/8은 disabled 배포 파일을 보존한 상태다. 원본33개 전체 제품 범위 중 백엔드/관리자/DB/수납/메일/운영 배포는 디자인 승인 다음 작업으로 남긴다.
- 미리보기: `http://127.0.0.1:3100/ko`, `/en`, 한영`/design-system`. Node22 production preview를 유지한다. 재개 시 포트/프로세스부터 확인하며 과거PID는 재사용하지 않는다.
- 최신 종합 검사: `2026-09-08-validation.md`. 다음 세션 시작: `docs/handoff/2026-09-08-public-design-next.md`. 원본 두 인수인계 문서와 부록을 보존했다.
- 최종 전체 디자인/사진/로고 선택은 사용자 확인이 남아 있다. 폰트 기본값은 Pretendard, SVG 두 컬렉션의 로컬 도입과 Git 제외 정리는 실제 반영·검증 완료다. 커밋/배포/Actions/백엔드 이전은 실행하지 않았다.
