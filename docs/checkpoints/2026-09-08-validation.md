# 공개 디자인 로컬 검증 — 2026-09-08

> 이 문서는 이전 후보의 기록입니다. 이후 사용자 UI/UX 피드백에 따른 최신 구현·검증은 [디자인 수정 기록](2026-09-08-design-revision.md)과 [최신 인수인계](../handoff/2026-09-08-design-revision-next.md)를 우선합니다.


범위는 **사용자 검토용 공개 디자인 후보**다. 최종 디자인 승인, 백엔드·관리자·인증·DB 이전·실제 예약/결제/메일·운영 배포는 다음 단계다.

## 현재 검증 대상

- 브랜치 `redesign/center-web`, HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`. 기존 dirty/untracked 변경을 보존했으며 커밋하지 않았다.
- production build **`VW6RTRHWutxOd2NMwW_H2`**, Node22.23.2, 실제 Chrome, `http://127.0.0.1:3100`.
- `evidence/source-manifest.json`: 소스·설정·테스트·폰트 등147개, 페이지 PNG96개, 상태 PNG8개의 SHA-256. manifest SHA-256 `8927523009b29ee173c6eb2866d90d1c310f7003493cff8f88292b3c02fe4e18`. 미커밋 작업이므로 HEAD만으로 검토 범위를 특정하지 않는다.
- 화면: 한영 각각 홈과 about/programs/experience/journal/goods/visit, 검토용 design-system. 한영16경로 × light/dark ×375/768/1280 =96장.

## 현재 빌드 실행 증거

| 검사 | 결과 | 로컬 증거 |
| --- | --- | --- |
| `npm run check` | typegen/strict TypeScript/ESLint 통과 | `evidence/check.log` |
| `npm run build` | 정적 페이지20개, exit0 | `evidence/build.log` |
| production Playwright | **102/102, 57.7초, exit0**, worker1 | `evidence/public-site.log` |
| 화면 전체 조합 |96장, PNG signature/요청 너비/해시 확인 | `evidence/public-site/`, manifest |
| DPR1/2 사진 |4개 cover ×3너비 ×2DPR =24측정, 원본 픽셀 부족 없음 | `evidence/image-quality-dpr1.json`, `image-quality-dpr2.json` |
| 확장 axe |32사례, **위반0/incomplete0** | `evidence/browser-audit.json` |
| 320px reflow |한영16경로 overflow0 | 같은 JSON |
| HTTP/도구 경계 |root307, ko/en200, fr404, production dev-tools3종404, 보안 헤더 | 같은 JSON의 HTTP7건 |
| 실제 Pretendard |한영 h1/p 모두 custom Pretendard glyph 확인 | `evidence/manual/results.json` |
| 직접 동작 확인 |방문 이동→상세경로 유지 언어 전환→다크→모바일 메뉴/Escape 초점 | 같은 JSON 및 headed Chrome PNG |
| 외부 요청 |공개 브라우저 감사와 직접 시나리오 모두0 | 위 JSON들 |
| 의존성 |이번 세션 npm audit 취약점0, exit0; 이후 lockfile 변경 없음 | `evidence/audit.json` |
| React Doctor |77/100, 아래 판정한 경고2개 | `evidence/react-doctor.log` |
| React Scan Lite |16경로, errors0/정착 후500ms idle commits0 | `evidence/react-runtime.json` |

기본 개발 환경 검사는 앞서 home/root307/ko/fr404/dev-tool200의4건을 통과했다(`evidence/dev-regression.log`). 개발 도구200을 기대하는 routing suite를 production 서버에 적용하지 않는다.

전체 화면 테스트는 응답/lang/theme/단일h1/noindex, **로드된 Pretendard font face**, 보이는 이미지 decode, pageerror와 overflow를 확인한다. 기능 시나리오는 메뉴/Escape, 언어와 테마 상태 유지, 탭 Home/End, 기존 `/walletExperence` 링크, canonical/hreflang/sitemap14주소/unknown404를 검증한다.

Axe는 WCAG2 A/AA, WCAG2.1 A/AA, WCAG2.2 AA 태그와 `label-content-name-mismatch`를 실행했다. 모든 WCAG 항목의 수동 인증이나 Safari/Firefox 실기기 검증을 뜻하지 않는다.

## 폰트와 SVG

- 한영 제목/본문 기본은 **Pretendard**. 공식 v1.3.9 Unicode subset92개와 OFL을 보존한다. 상대 CSS source import를 통해 font faces와 파일을 로컬 build에 포함했다. 전체2MB 파일은 `.local/font-source/`에 보관하고 화면에서 요청하지 않는다.
- 직접 Chrome CDP 검사: `main h1`은 `PretendardVariable-Medium`, `main p`는 `PretendardVariable-Regular`, 모두 `isCustomFont=true`. 새 컨텍스트의 홈에서 한글14 font files/367,156 encoded bytes, 영문3개/89,936B. 다른 CSS/JS/사진 크기는 제외한 수치다.
- Manrope/Noto는 비교 화면의 A/B 대안에만 사용한다. 현재 기본은 C Pretendard로 표시한다.
- **SVG2,402개, 1,399,570B**를 `web/assets/icons/`에 원본 그대로 도입했다. Heroicons324개는 고정 커밋 `bd6c5c0d5acec14d116da611b4c5044fec1bb7dc`, Bootstrap2078개는 v1.13.1 커밋 `ce0e49dd063243118a115f17ad1fe1fe7576d552`와 모두 바이트 일치하며 각MIT를 동봉했다.
- 총괄도 모든 로컬 원본과 복사본의 파일명/해시/크기, 전체 정적 XML 검사를 재실행했다. 문제0. 출처·재검증 명령은 `web/assets/icons/README.md`, `verification.json`, `docs/design/svg-assets-2026-09-08.md`.
- 아이콘 라이브러리는 public 밖에 있어 자동으로 제공/import하지 않는다. 화면의 기본 Lucide24px outline 체계를 유지하고, 선택한 추가 SVG는 원래 좌표계/채움/선을 보존한다. 최종 브랜드 로고 SVG는 아직 미수급이다.

## 시각 검토와 수정 이력

- 총괄은 현재 화면을 실제 Chrome에서 구동하고 한영 모바일 첫 화면, 전체 홈, 비교 화면 등을 직접 열었다. 새 폰트의 실제 렌더링도 확인했다.
- 첫 A/B는 REVISE였다. 한국어 보조 표현5곳/영문 도로명 분리, accessible name, heading/section 의미구조, 모바일 타입/focus 문서 불일치를 수정했다. `reviews/review-a-first.md`, `review-b-first.md`.
- 두 번째 A는 PASS, B는 책장 portrait 저해상도 때문에 REVISE였다. `reviews/review-round-two.md`. DPR1/2의 실제 cover 면적을 반영해 비교 사진과 모바일 home/about/goods sizes를 고쳤다. 수정 전 회귀2개가 실패한 증거는 `evidence/before-image-fix/`에 있다.
- 처음 Pretendard CSS의 URL import가 컴파일 결과에서 빠졌다. CSS family 이름만 바뀌고 실제 시스템 폰트가 렌더됐다. CDP 수동 검사에서 발견했고 source CSS import로 수정했다. loaded font assertion을 기존 화면 검사에 추가해 먼저1실패, 현재102통과를 확인했다. `evidence/before-font-import-fix/font-loading-red.log`와 현재 결과를 비교할 수 있다.
- 새 독립 종합 검토 **PASS/APPROVE, confidence HIGH, 블로커0**. `current_visual_gate`는 현재147소스/96페이지/8상태 해시를 독립 재검증하고 PNG104장 모두 original detail로 직접 열었다. 실제 Chrome 동작도 추가 확인했다. `reviews/review-current-final.md`에 현재 build/HEAD/manifest와 항목별 판정을 보존했다. 이 판정은 사용자의 최종 디자인 승인을 대신하지 않는다.
- 모션은 hero의 CSS timeline0/100/650ms(scale1.025→1), 탭 rest/transition/settled, 정착된 skip focus와 메뉴를 촬영했다. reduced motion의 hero animation none/scroll auto도 확인했다.

## 성능·렌더링 최종 측정

현재 build의 전체16경로 ×모바일/데스크톱 **Lighthouse32회 완료, 정상exit0**. 모든 경로에서 성능/접근성/권장사항 **100/100/100**이었다. SEO는 홈~goods69, visit/design-system66이며, SEO 점수의 남은 실패는 의도한 검색 차단이다. `evidence/lighthouse/summary.json`과 개별 HTML/JSON에 저장했다. 이 측정에서 최대LCP1061.9ms, CLS0, TBT37.04ms였다. React Scan Lite는 현재16경로에서 오류0, 정착 후500ms idle commit0을 확인했다.

측정 도구는 실제 Chrome + Lighthouse13.0.3 Node API다. production, mobile 기본 CPU4배/desktop 설정, URL과 폰트 선로딩 후 storage reset을 끈 **재방문 조건**이다. 원격 첫 방문, 반복 중앙값, 실사용자 p75 결과가 아니다. 시안은 meta robots/robots.txt로 검색 차단을 유지하므로 SEO100 또는 전체4항목100 통과를 주장하지 않는다.

## 도구 한계와 중간 실행 이상

- LSP MCP/자동 hook의 fresh diagnostics가3000ms timeout이었다. LSP clean으로 보고하지 않는다. strict TypeScript/ESLint/production build를 직접 실행해 통과했다.
- React Doctor 경고: 선택 탭의 첫 항목 state 초기화는 실제 선택 상태이며 한영 IDs가 같다. footer의 고정 nav7개 filter/map은 서버의 작은 목록이다. 점수만 올리려고 effect/memo/추상화를 추가하지 않았다.
- React Scan Lite0.5.7에는 `changeDescription.kind: unnecessary` 필드가 없다. Next 내장 production renderer는 profiling hook을 제공하지 않아 `no-inject-method`로 기록된다. 따라서 불필요 렌더0/컴포넌트별 정확한 실행시간을 입증했다고 하지 않는다. audit-only 주입이며 앱에 포함하지 않는다.
- 중간 build의 특정 이미지1080px 요청이 이전 서버 프로세스에서 멈췄다. 원본/Sharp 변환은 정상이고 같은 build/cache로 해당 프로세스만 재시작하자200/1080×607로 회복됐다. 내부 optimizer 원인은 증명하지 않았다. 실패 자료는 `evidence/before-pretendard-default/`; 현재 전체 사진24측정과 페이지 검사는 통과한다.
- 다음 병렬 실행은102항목 통과 후 browser fixture 종료에서 worker2개가 대기했다. Inspector에서 runFinished=true/fatalErrors=[]/browserConnected=false를 확인했고 작업 프로세스를 종료했다(exit130). 해당 실행을 정상 통과로 보고하지 않는다. 현재 문서화한 worker1 실행은 assertion을 유지한 채 **정상 exit0**다. 임시 inspector/worker는 종료했다.
- 직접 시나리오의 첫 driver는 언어 클릭 직후 즉시 URL을 검사해 navigation 완료 전 실패했다. 고정 지연 대신 실제 URL/상태 완료를 기다리도록 고친 후 같은 동작을 확인했다.
- `next start`는 유지된 standalone 설정에 경고한다. 이 로컬 preview는 실제 HTTP/브라우저 검사를 통과했으며, standalone 운영 기동은 별도 release 작업이다.

## 보존·연속성·다음 결정

- `.gitignore`는 로컬 인덱스/개인 설정/세션 보관/원시 QA 폴더만 좁게 추가 제외했다. 소스·테스트·폰트/SVG·검토 Markdown·env example·lockfile·disabled workflow는 Git에 추가 가능하다. `2026-09-08-gitignore-cleanup.md`에 이동 전후 해시와 경로를 기록했다.
- QA 원본은 `docs/checkpoints/evidence/`, 세션 HTML은 `.local/session-exports/`에 **로컬 보존**한다. 이 원본들은 Git에서 제외된다. 사람의 검토 기록은 `docs/checkpoints/reviews/`, 실행 가능한 검사 소스는 `web/tests/`에 남긴다.
- legacy src/Express/SQLite/data/uploads와 기존 지갑 URL을 보존했다. 백엔드 경계를 바꾸거나 실제 인증/예약/결제/메일을 실행하지 않았다. 운영 시스템의 보안 인증은 아니다.
- Actions 미사용. disabled workflow SHA-256 `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d` 보존. 기존 AGENTS.md 변경과 원래 workflow 삭제 상태를 초기화하지 않았다.
- 기본 폰트는 Pretendard로 반영했다. 사용자가 검토할 최종 시각 구성/사진 선택, 최종 로고 벡터/정확한 색, 공개 전 운영 정보/사진 권한은 남아 있다.
- 원본 요청33개/답변15개/옛 TODO10개/하위작업11개는 역사 인수인계에 보존한다. 예약 정책, 토스 원화 수납, 배송·환불·관리자 권한, DB 이전·복구 및 수동 운영 배포는 디자인 승인 다음 단계이며 이번 후보 완료에 포함하지 않는다.
