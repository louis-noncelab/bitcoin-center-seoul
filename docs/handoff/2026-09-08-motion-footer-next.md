# 재개 지점: 타이틀·스크롤 모션, 히어로, 푸터 — 2026-09-08

최신 공개 사이트 구현은 이 문서와 `web/DESIGN.md`의 상단 계약을 기준으로 이어간다. [원본 인수인계](2026-09-08-codex.md)의 요청33개·답변15개·TODO10개·하위 작업11개·부록, [첫 메시지 프롬프트](2026-09-08-codex-start.md), [직전 사진 구성 단계](2026-09-08-scenes-next.md)는 역사 기록으로 보존한다. 과거 전체 폭 히어로와 전체 H1 단위 모션은 아래 최신 요청으로 대체됐다. 전체 조사나 이미 답한 질문을 다시 시작하지 않는다.

## 이번 사용자 요청과 구현

1. SaturdayBlock처럼 푸터의 예약·문의는 아이콘만 표시: 실제 이메일·전화 목적지를 48×48px 메일/전화 SVG 버튼으로 정리했다. 한영 접근성 이름, 목적지 title, 키보드 초점을 유지한다. 가짜 소셜 링크는 추가하지 않았다.
2. 화면 맨 위 스크롤 게이지: 3px 오렌지 선이 실제 문서 읽은 위치를 표시한다. 크기/내용 높이 변경, 경로 이동, 뒤로 가기에 대응한다. 스크롤을 가로채거나 React를 매 프레임 렌더링하지 않는다.
3. 사진 길이와 소개·버튼 배치를 UI/UX 담당에게 검토 요청: 제목→소개→CTA를 왼쪽 한 묶음으로 두고 오른쪽에 3:2 사진을 배치했다. 데스크톱5:7 그리드, 태블릿16:9, 모바일4:3, 사진 높이 상한480px이다. 영문 모바일 버튼 두 개도 정상 글자 크기에서 한 줄에 들어간다. 기존 억지 대각선/분리된 긴 사진 구성을 되살리지 않는다.
4. 큰 타이틀의 글자가 완성되고 스크롤 시 요소들이 제자리를 찾는 효과: 한글8음절/영문18글자가 600ms 곡선과 24ms 순차 지연으로 자리 잡는다. 이름500/서울650 강조, 하나의 완전한 접근성 H1, 실제 텍스트와 공백을 유지한다. 필요한 때만 서울 앞에서 줄바꿈한다. 스크롤 효과는 섹션 전체 대신 개별 사진·내용 묶음이 화면에 들어올 때 시작한다. 모바일의 아래 사진이 미리 모션을 끝내던 원인을 해결했다. 각 묶음은 한 번, 600ms, 지연 최대160ms이다.

모든 움직임은 기존 CSS/네이티브 Web Animations API로 구현했다. 새 의존성이나 스크롤 제어 라이브러리는 추가하지 않았다. 동작 줄이기 설정은 즉시 표시하며 실행 중 설정 변경도 취소한다. JavaScript 없이도 내용과 목적지는 남는다.

## 현재 파일과 검증 대상

- 작업 폴더: `/Users/max/noncelab/center/bitcoin-center-seoul`
- 브랜치: `redesign/center-web`
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`
- 프로덕션 프리뷰 build: `RcYcgiLOZAi3KkRBM4anP`
- 최종 소스·설정·자산·테스트 fingerprint: `182389382a6dddb6960a82d41bd27f7104d27aca0aff48a454b4dc4124c385d4`
- 원본 증거: `docs/checkpoints/evidence/footer-progress-2026-09-08/final/`
- `source-manifest.json`: 2568개 소스/설정/자산/테스트, PNG282장, 원본 사진7개의 해시. 동영상2개는 `motion/video-manifest.json`에 별도 기록했다.
- 프리뷰는 현재 localhost3100에서 실행 중이다. 다음 세션에서는 프로세스/빌드와 위 해시를 먼저 대조한다. 원격 터널은 다시 열지 않았다.

주요 수정은 `home.tsx`, `page-motion.tsx`, `section-content.tsx`, `site-footer.tsx`, 새 `controls/reading-progress.tsx`, locale layout, 관련 CSS/tokens 및 테스트다. 원본 사진 파일, 폰트, SVG 원본, 의존성 lockfile은 보존했다.

## 실제 검증 결과

| 검사 | 결과 |
| --- | --- |
| Node22 typecheck·ESLint·build | 통과. 일부 자동 LSP 진단은 갱신 대기 시간 초과였으며, 전체 TypeScript/ESLint 검사로 오류가 없음을 확인했다. |
| 프로덕션 Playwright | 141개 통과. 한영/테마/경로96개 화면, 이미지 해상도60측정, 내비/뒤로 가기/게이지/초점/무JS/SEO/모션 검사를 포함한다. |
| 타이틀·줄바꿈 | 320/375/768/960/1024/1280/3440px × 한영/테마28개, 320px 글자200% 확대4개 통과. 모션 중 H1 영역 크기와 접근성 이름을 유지한다. |
| 히어로·푸터·게이지 | 한영/양 테마 ×375/768/1280px, 12개 조합 통과. 0/50/100% 진행, 크기/콘텐츠/경로 변화, 아이콘48px, 초점, 맨 위로 이동 확인. |
| 와이드·카드·CTA·마키 | 20개 레이아웃, 80개 캡처. 3440px까지 정렬과 목표 크기를 확인했다. 마키 반복/일시정지/동작 줄이기/무JS 확인. |
| WebKit26.4 | 한영/양 테마375px +영문 라이트1440px, 5개 실제 브라우저 시나리오 통과. 모션, 내비, 뒤로 가기 후 등장, 게이지, 푸터, 동작 줄이기 확인. 실제 iPhone Safari 기기 검증으로 확대해서 말하지 않는다. |
| 접근성·좁은 화면 | axe32개 조합에서 위반0, 320px reflow16개 넘침0, 외부 폰트/스크립트 요청0. 자동 대비 판정 보류3개 조합의 굿즈 텍스트5개는 별도 실측으로 확인했다. 대비5.544/8.149/15.563, 텍스트는 사진 클리핑 영역 위, hit-test/불투명도 정상이다. |
| 동작 영상 | 실제 스크롤과 클릭을 기록한 모바일/데스크톱 MP4 각각10.6/11초. 25fps 녹화이며 기기의 성능 벤치마크가 아니다. 모바일은 CSS375px 뷰포트, 인코딩 폭374px이다. |
| 총괄 시각 확인 | 현재 캡처17개를 직접 열고 단계별 타이틀, 한영 히어로, 푸터 초점, WebKit 사진, 3440px, 실제 영상 프레임을 확인했다. 생성한 모든 PNG를 직접 검토했다고 말하지 않는다. |

검사 명령은 Node22 PATH를 사용한다:

```sh
cd /Users/max/noncelab/center/bitcoin-center-seoul/web
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run check
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run start
PATH=/opt/homebrew/opt/node@22/bin:$PATH BCS_EVIDENCE_DIR=../docs/checkpoints/evidence/footer-progress-2026-09-08/final npm test -- --workers=1 --grep-invert 'development tools bypass locale routing'
```

마지막 제외 항목은 개발 모드에서만 실행 도구 스크립트200을 기대하는 기존 테스트다. 프로덕션은 차단하는 것이 맞으며, 실제 세 경로의 빈404를 `production-dev-tools.json`에 확인했다. 테스트를 맞추려고 개발 도구를 공개하지 않는다. 동시에 여러 빌드/브라우저를 돌리지 않는다.

초기 실패 로그도 보존했다. 푸터 텍스트 기반 SEO 기대값, 옛 사진 selector, hydration 이전 DOM 변경 fixture, CSS 시간의 부동소수 오차를 각각 고쳤다. 현재141개 통과 결과가 이를 대체한다. WebKit 첫 사용자 정의 검사에는 뒤로 가기 직후 그리기 대기가 빠져 있었다. 진단 기록에서 정상 observer/600ms 효과를 확인하고 화면이 그려진 뒤 검사하도록 수정했다. 해당 제품 소스를 변경해서 고친 버그라고 기록하지 않는다.

## 독립 담당과 기록

- 푸터 구현: [footer-icons](../checkpoints/reviews/2026-09-08-footer-icons.md). 담당 파일은 footer TSX/CSS만.
- UI/UX 진단·시각 후속 검토: [hero-ux-check](../checkpoints/reviews/2026-09-08-hero-ux-check.md). 새 실제 캡처6개 기준 구성 문제 해소를 확인했다. 타이밍 검토로 확대하지 않는다.
- 스크롤 구현: [scroll-reveal](../checkpoints/reviews/2026-09-08-scroll-reveal.md). PageMotion/해당 테스트만 담당; 브라우저는 총괄이 실행했다.
- 최종 코드 검토: [footer-progress-code](../checkpoints/reviews/2026-09-08-footer-progress-code.md). 기존 미표시 부분 없는 section의 fallback 테스트가 내부 등록 순서에 의존한다는 비차단 유지보수 관찰을 남겼다. 현재 홈의 실제 그룹 동작과 별개이며, 기존 fallback 동작은 유지했다.
- 총괄 진행: [체크포인트](../checkpoints/2026-09-08-footer-progress.md). 소스 보존 전후·초기 실패·최종 해시는 위 원본 증거 디렉터리에 남겼다.

## 계속 지킬 범위와 남은 작업

이번 공개 디자인 요청의 구현과 검증을 이어받는다. 원본 TODO10개와 구조/폰트/SVG 요청의 현재 상태는 이전 체크포인트를 함께 보며, 과거 연구 완료와 미구현 백엔드를 혼동하지 않는다. 다음 사용자 디자인 피드백은 현재 결과를 기준으로 적용한다.

프리텐다드92개 로컬 subset/OFL, Heroicons324개·Bootstrap2078개/MIT 원본은 프로젝트에 있다. 실제 UI는 일관된 Lucide SVG를 사용한다. 이름은 중립색, 오렌지는 주요 CTA, 파랑은 기능적 선택 상태에 유지한다. `web/src`에 마포/Mapo/센터 한쪽 표현은 없다.

기존 dirty/untracked 파일과 미추적 `web/`를 유지한다. `.gitignore`는 빌드·테스트 출력·원본 캡처/영상·로컬 세션 보관물을 제외하고 소스·테스트·보고서·라이선스는 남긴다. 이전 세션 HTML 이동은 `.local/session-exports/`의 원본과 해시를 보존했다. 이번에 stage/commit/reset/clean 또는 원본 삭제는 하지 않았다.

GitHub Actions는 사용하지 않는다. `.github/workflows/deploy.yml.disabled` SHA-256는 `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`로 동일하며 활성 yml/yaml은 없다. lockfile 해시는 `a757cc5faa112d488cc54b9ff085d3dea8851358148431e64eb2454388ea2fb7`로 동일하다.

백엔드·관리자·인증·DB 이전·결제·운영 배포·상점/밋업 신청 기능은 시작하지 않는다. 프리뷰 noindex/nofollow와 robots 제외를 유지한다. 운영 공개의 실제 HTTPS/SEO·기존 URL·활동 기록 목적지 검토와 수동 배포는 별도 승인 단계다. 중지한 원격 공개를 자동 재개하지 않는다.

## 이후 전체 작업 현황 — 2026-09-09

[남은 작업과 운영 데이터 확인](../checkpoints/2026-09-09-remaining-work.md)에 디자인 마감과 전체 운영 전환의 남은 범위를 구분했다. 실제 레거시 저장 코드와 현재 소스를 대조했으며, 운영 서버 자료 확인·백업·이전은 아직 수행하지 않았다. 공개 구현의 기준은 계속 이 문서다.
