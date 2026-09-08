# Bitcoin Center Seoul — 공개 디자인 재개 기록

> 최신 재개 상태: [이름·색상·SEO 후속 기록](2026-09-08-identity-seo-next.md). 아래 원본 지시와 과거 상태는 보존하며, 현재 빌드·검증 상태는 최신 기록을 먼저 대조한다.

이 문서는 이후 사용자 피드백을 반영한 최신 재개 지점이다. 원본33요청·15답변·TODO10개·11하위작업과 부록은 [원본 인수인계](2026-09-08-codex.md), [시작 프롬프트](2026-09-08-codex-start.md)에 보존한다. 역사 기록의 미완료·완료 상태와 아래 현재 상태를 혼동하지 않는다.

## 현재 상태
공개 프런트엔드 디자인 보완, 로컬 런타임 검증, 한영 독립 시각 검토를 완료했다. 이 상태를 다음 공개 디자인 검토의 기준으로 사용한다. 백엔드·관리자·DB 이전과 운영 배포는 시작하지 않았다. 사용자 디자인 채택은 에이전트 검토의 PASS와 별개다.

- 경로: `/Users/max/noncelab/center/bitcoin-center-seoul`
- 브랜치: `redesign/center-web`
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f` (커밋 없음)
- 최신 로컬 빌드: `AFKk_t8vqWjTq4n4S-G_D`
- 미리보기: `http://127.0.0.1:3100/ko`, `/en`; 현재 `npm run start` 세션5292. 이 주소는 작업 Mac의 로컬 주소이며 원격 모바일 공개 주소가 아니다.
- 진행 기록: [체크포인트](../checkpoints/2026-09-08-design-craft.md). 산출물: `docs/checkpoints/evidence/design-craft-2026-09-08/final/`.

## 이어받은 TODO의 현재 판정
| 원래번호 | 현재 판정 | 근거/경계 |
| --- | --- | --- |
| 1 브랜치·승인 기준 | 완료 | 현재 브랜치와 dirty/untracked 파일 보존. DESIGN.md 최상단 계약 적용. |
| 2 사진·시각 구성 | 시안 구현 완료 | 실제 센터7사진, 정렬된 히어로/전시/활동/굿즈. 사용자 시각 채택과 촬영 권리는 별도. |
| 3 브라우저 시안 | 완료 | 한영 홈+6공개 상세+디자인 시스템. 잘못된 중첩 document와 홈404 해결. |
| 4 반응형·모션·접근성 | 로컬 검증 완료 | 공개123테스트,32접근성,20와이드배치,16좁은화면 검증 통과. 독립 시각 게이트는 아래 최신 결과 확인. |
| 5 Actions 제외·시안 안내 | 완료 | 로컬 미리보기만 사용. 운영 배포/원격공개 없음. |
| 6 옛 자동배포 제거 | 완료 상태 유지 | 이후 요청대로 파일 삭제가 아니라 disabled 보존. |
| 7 taste·모션 참고 | 완료 | SaturdayBlock 실제 소스, Bali·Coconut 실제 브라우저 비교; CSS/WAAPI와 설치된 Motion 사용. |
| 8 disabled 보존 | 완료 상태 유지 | 아래 SHA-256 유지. GitHub Actions 실행 없음. |
| 9 폰트 비교·추천 | 완료 | 공개 화면은 로컬 Pretendard v1.3.9/92subset/OFL. 비교 페이지에 후보 보존. |
| 10 SVG 관리 | 완료 | Heroicons324 + Bootstrap2078 원본/MIT/검증 자료. 실제 UI Lucide outline 계열 일관성 유지. |
| 추가 디렉터리 구조 | 완료 | `web/README.md` 경계도와 `src/app/content/components/i18n/styles`, 폰트·SVG 자산 경계. |
| 추가 .gitignore 정리 | 완료 | `.local/`, 원본 실행 증거와 생성물 제외. 세션 HTML 이동, 소스·문서·라이선스 보존. |

## 이번 디자인 작업
- 강제 대각선과 중복 블록을 정리하고5/7텍스트·사진 히어로, 동등한 전시 사진, 밀도 있는 기록 목록, 넓은 굿즈 사진과 정렬된 캡션을 구성했다.
- 17–18px 본문,48px 행동 영역,8px 버튼/12px 미디어, 실제 Pretendard를 사용한다. 마포/Mapo와 분위기용 AI 문구를 공개 콘텐츠에서 제거했다.
- 내비 즉각 피드백/현재 메뉴/모바일 등장·퇴장과 Escape·inert·초점 처리. Next 문서의 HTML 속성으로 메뉴 이동 후 불필요한 스크롤을 해결했다.
- 페이지/섹션 등장과 방향성 프로그램 전환, 키보드·연속 입력·실시간 reduced motion 대응.
- 푸터에 주소·전체 운영시간·지도·연락처 버튼을 묶고,48초 문자 마키에 정지/재생과 hover 정지를 제공한다. 모션 감소/JS 없음에서는 정지된 센터 이름이다. 높이를 미리 확보하여 hydration 밀림을 방지한다. 태블릿 푸터 링크는1열,1024px부터2열.
- 사용자 사진첩 아이디어는 **검토만** 했다. 현재 자동/수동 사진 캐러셀을 구현한 것으로 기록하지 않는다.
- Coconut은 사진/설명의 결합과 가까운 CTA 위계를 참고했다. 큰 둥근 모서리/작은 버튼/코드 배경/모바일 메뉴 오류는 가져오지 않았다.

## 검증과 검토
- Build `AFKk_t8vqWjTq4n4S-G_D`, source fingerprint `659df61b8e3dd62c257b512c06e5dc722de36d6971282528682ab87f41721326`.
- `npm run check`, production build, 생산용 Playwright123/123 (exit0).
- Fresh205PNG:96기본(한영×8경로×2테마×375/768/1280),80와이드/마키,29실제조작. Source2563파일/사진7/캡처205개 해시 재검증 일치.
- 와이드1440/1920/2560/3440×한영×테마: 중앙정렬/동일576×432사진/48px CTA/넘침 없음.960/1024내비도 양 언어 통과.
- 마키 반복 첫/끝 캡처 동일,정지/재생/hover/모션감소/JS없음 통과.375/1280초기로딩 전후 높이delta0,측정한layoutshift0.
- 접근성 axe32회 위반0·미완결0,320px리플로16개 넘침0,HTTP7검사·외부요청0. 실제 라우트5/모션18기록 오류0.
- 로컬 warm-cache Lighthouse4회: 성능/접근성/권장사항100,CLS0,TBT0. SEO69는 의도한preview noindex. 실기기나 운영네트워크 성능으로 일반화하지 않는다.
- 고정된 같은package-lock의 npm audit0취약점;disabled해시/ignore자격/dirty상태 보존 확인.
- 코드 최종follow-up CLEAR, 한영 독립 시각 검토 각각30캡처 APPROVE. 총괄이 실제 결과와 보고서를 대조했다. [최종 게이트](../checkpoints/reviews/2026-09-08-craft-final-gate.md), [코코넛 비교](../checkpoints/reviews/2026-09-08-coconut-reference.md).

`source-manifest.json`의 buildId,sourceFingerprint와 실제 파일을 먼저 대조한다. dirty source가 바뀌면 과거 PASS를 재사용하지 않는다. 원래 root evidence 폴더는 기본 테스트 출력으로 덮어써질 수 있으므로 named final폴더와 해시를 사용한다.

한 번 생산용 서버에 개발 전용200기대 테스트를 잘못 포함한 실행은 `final/interrupted-environment-run/`에 보존했다. 해당 테스트를 지우거나 기대값을 바꾸지 않았으며, 생산용404는 HTTP감사에서 검사한다.

## 다음 단계와 금지 사항
공개 디자인을 사용자가 본 뒤 새 결정을 적용한다. PostgreSQL/Prisma, 인증/관리자/세션, 예약/결제/이메일, SQLite·업로드 이전, 운영 배포는 미완료이며 지금 완료로 표시하지 않는다. 원본15답변의 승인 범위를 그대로 이어받고 이미 답한 질문을 반복하지 않는다. 새 구현은 해당 단계에서 실제 데이터·권한·동시 실행·장애·복구를 검증한다.

GitHub Actions 금지. `.github/workflows/deploy.yml.disabled` SHA-256: `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`. 커밋/스테이징/원격터널/운영접속/배포 없음. 사용자 중단 지시 뒤 중지한 ngrok를 다시 시작하지 않는다. 기존 변경과 미추적 `web/`를 보존하며 `git clean/reset`을 쓰지 않는다.

Node22와 npm 사용. 루트 레거시 서버/DB/업로드와 `/walletExperence`는 유지한다. 개발 도구200검사는 `npm run dev`에서, 생산용404검사는 `npm run start`에서 수행한다. 동시 Chrome 감사 대신 브라우저 작업을 순차 실행한다. 실제 source가 바뀌거나 새 실패가 없으면 전체 검사를 반복하지 않는다.

## 동일 조건 재검증 명령
소스가 바뀌지 않았다면 불필요하게 반복하지 않는다. 필요할 때만 Node22로 web/에서 실행한다.

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run check
# 빌드 전 현재 로컬 dev/start를 종료한다.
npm run build
npm run start
# 별도 셸, 생산용 서버가 준비된 뒤:
BCS_EVIDENCE_DIR=../docs/checkpoints/evidence/design-craft-2026-09-08/final npm run test -- --workers=1 --grep-invert 'development tools bypass locale routing'
node ../docs/checkpoints/evidence/design-craft-2026-09-08/final/wide-craft.mjs
node ../docs/checkpoints/evidence/design-craft-2026-09-08/final/manual-craft.mjs
node ../docs/checkpoints/evidence/design-craft-2026-09-08/final/verify-preview.mjs
```

최신 미리보기 파일: [1920px한글](../checkpoints/evidence/design-craft-2026-09-08/final/wide/ko-light-1920-full.png), [375px한글](../checkpoints/evidence/design-craft-2026-09-08/final/public-site/ko-home-light-375.png).
