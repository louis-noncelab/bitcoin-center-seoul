> Update: owner reopened visual design on 2026-09-08. Continue from [design craft checkpoint](../checkpoints/2026-09-08-design-craft.md); this file describes the earlier candidate and is not approval of the new revision.

# 다음 세션 시작점 — UI/UX 수정 후보

상태: **이번 공개 UI/UX 수정·로컬 검증·독립 화면 검수 완료.** 최종 시각 채택은 사용자 단계다.
이 문서는 사용자 추가 피드백 이후의 최신 기록이며, 원본33개 요청·15개 답변·
TODO10개·하위 작업11개·폰트/SVG/디렉터리 추가 요청은 원본 인수인계 부록에
그대로 보존한다. 원본 문서를 다시 조사하거나 이미 결정한 질문을 다시 열지 않는다.

## 현재 위치

- `/Users/max/noncelab/center/bitcoin-center-seoul`, `redesign/center-web`.
- Base HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`; 기존 dirty/untracked 보존, 커밋/스테이징 없음.
- 공개 앱은 `web/`. 최신 빌드 `SKMZrpDkw36xxCbLYGY6Z`.
- 로컬 후보 `http://127.0.0.1:3100/ko`, `/en`; 여섯 상세 페이지와 design-system 비교 경로.
- 프로세스 번호를 재사용하지 말고 포트와 작업 경로를 확인한다. Node22/npm, dev/build 동시 실행 금지.
- 디자인 계약은 `web/DESIGN.md` 맨 위의 Current contract가 우선한다.

## 사용자 피드백 반영

실제 SaturdayBlock 소스의 규칙적인 그리드, 버튼과 푸터 그룹, 단계적인 모션을
센터의 실사·오렌지/블루·라이트/다크에 맞췄다. 인위적인 대각선 사진 배치와
큰 중간 공백을 제거하고 체험 사진 비율을 통일했다. 기록의 분류와 제목을
가깝게 묶었다. 작은 글씨를 키우고 이메일/전화/페이지 이동을 버튼으로 정리했다.

`마포`/`Mapo`, `센터 한쪽`과 분위기만 만드는 표현을 공개 한영 본문·메타데이터·
대체 텍스트에서 제거했다. 실제 전시·교육·밋업·굿즈와 운영 정보만 설명한다.
공개 주소는 정확한 도로명·건물번호·층과 지도 링크를 보존한다.

내비 클릭 후 48–96px 내려가던 문제는 CSS smooth scroll과 Next 라우터 계약의
불일치였다. locale 루트 HTML에 `data-scroll-behavior="smooth"`를 추가했다.
별도 타이머나 전역 스크롤 리셋은 없다. 한영·두 motion 환경·현재 페이지 클릭·
로고·언어 변경·히스토리·키보드 본문 이동을 실제 브라우저에서 검증한다.

섹션 진입 600ms, 프로그램 패널 500ms, 버튼/선택 상태 전환을 적용했다.
reduced-motion에서는 자동 모션을 끄며 JS가 없어도 본문과 링크가 보인다.
CSS 최적화가 600ms를 .6s로 직렬화하는 경우도 올바르게 변환한다.

최초 독립 검수 후 모바일 푸터 방문 정보를 전체 폭으로 배치하고,
About 영문 카드의 고아 단어 줄바꿈을 조정했다. 굿즈 상세 사진은 데스크톱에서
원본16:9로 보여 진열품 위아래가 잘리지 않게 했다. 모바일은4:3을 유지한다.

## 지속되는 결정

- **Pretendard가 한영 제목/본문 기본.** 공식 v1.3.9 Unicode subset92개와 OFL 로컬 보관.
  Manrope/Noto는 비교 화면의 대안이다. 폰트 질문을 다시 열지 않는다.
- **Tailwind Heroicons324 + Bootstrap2078 = SVG2402개**를 `web/assets/icons/`에 보관.
  공식 고정 커밋·MIT·verification.json 포함. UI 아이콘은 일관된 Lucide outline을 사용한다.
- `.gitignore`는 원시 QA, .next, 테스트 결과, 로컬 인덱스/개인 설정/세션 내보내기를 제외한다.
  세션 HTML과 미사용 전체 폰트는 `.local/`에 해시를 보존해 보관했다. 소스·라이선스·
  테스트·사람이 읽는 검수 문서는 Git 대상으로 남긴다. 기존 tracked DB/옛 lockfile은 보존했다.
- 디렉터리 역할은 `web/README.md`에 정리했다. 실사용 경계인 app/content/site/controls/ui/
  i18n/styles/tests를 사용하며, 기존 루트 Vite/Express/SQLite를 이동하거나 변경하지 않았다.

## 원본 TODO의 현재 대응

| 번호 | 현재 상태 |
| --- | --- |
| 1 | 브랜치·현재 파일·승인 기준 대조 완료 |
| 2 | 사진/콘텐츠/배치 후보 수정 완료. 최종 시각 채택·사진 권한 확인은 사용자 단계 |
| 3 | 브라우저에서 보는 한영 공개 후보 구현 완료 |
| 4 | 최종 빌드110개 검사·접근성·실제 Chrome·독립127장 검수 완료 |
| 5 | GitHub Actions 제외·로컬 후보 안내 유지 |
| 6, 8 | 자동배포 비활성 파일 보존 완료. 옛 제거 문구를 재실행하지 않음 |
| 7 | 공유 토큰·규칙적 배치·실제 모션·reduced-motion 적용 완료 |
| 9 | 비교 후 사용자 지정 Pretendard 기본 적용 완료 |
| 10 | SVG 관리안과 로컬 두 라이브러리 보관 완료 |
| 추가 | 유지보수에 필요한 현재 디렉터리 경계 문서화 완료 |

## 증거와 재실행

- 통합 진행: `../checkpoints/2026-09-08-design-revision.md`.
- 내비 원인/RED/GREEN: `../checkpoints/2026-09-08-navigation-scroll.md`.
- 카피 보존/교정: `../checkpoints/2026-09-08-copy-revision.md`.
- 초기 독립 두 보고서: `../checkpoints/reviews/2026-09-08-revision-initial-*`.
- 최종 검수: `../checkpoints/reviews/2026-09-08-revision-final.md` (**APPROVE,블로커0**).
- 최신 raw 자료: `../checkpoints/evidence/revision-2026-09-08/final/`.
  이전 부모 폴더는 수정 전 증거다. 최종 source-manifest.json과 빌드가 일치해야 한다.
  Manifest SHA256 `0375c3d7cbda6dc6d8ca46499868306d8d999214ac5a18af4bc5c48300cacef1`
  (142 source/config/font/doc files,127 PNGs).

```sh
cd /Users/max/noncelab/center/bitcoin-center-seoul/web
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run check
npm run build
npm run start
# 별도 터미널: 서버 실행 중
BCS_EVIDENCE_DIR=../docs/checkpoints/evidence/revision-2026-09-08/final npm run test -- --workers=1 tests/home.spec.ts tests/public-site.spec.ts tests/image-quality.spec.ts tests/navigation-scroll.spec.ts tests/motion.spec.ts
```

브라우저 테스트는 다른 Chrome 감사 스크립트가 종료된 뒤 단독 실행한다.
동시 Chrome 감사 중에는110개 assertion 통과 뒤 runner 종료가 대기한 기록이 있다.
개발 전용 routing.spec는 dev에서 사용한다. production dev-tools는404여야 한다.
원시 자료는 Git 제외지만 이 작업 폴더에 보존한다. 다른 복제본에 없다면 문서의
PASS만으로 재검증했다고 주장하지 않는다. 재실행 가능한 회귀 검사는 web/tests/에 있다.

## 최종 검증 요약

- TypeScript/ESLint/빌드 통과.110개 브라우저 테스트1.1분/정상exit0.
- 한영·두 테마·375/768/1280·8페이지의96장과 상태/수동/수정 부분31장,
  총127장을 최종 독립 담당이 직접 열어 확인했다.142소스/127캡처 해시 불일치0.
- 사진54개 DPR측정,axe32건 위반0,reflow16건 overflow0,HTTP7건 통과.
- 실제 Chrome에서 Pretendard4건,레이아웃4건,모션7상태,no-JS,내비 이동 확인.
- Lighthouse32회 P/A/BP100,SEO66–69(미리보기 noindex),최대LCP992.385ms/CLS0/TBT0.
  로컬 warmed-cache 측정이며 실사용자 p75나 cold-load 결과가 아니다.
- 초기 동시 Chrome 실행에서는 테스트 assertion 후 종료 대기가 있어130으로 중단했다.
  최종 단독 재실행은 모든110개 검사와 브라우저 정상 종료까지 확인했다.
  최종 영수증은 `final/serial-verification.log`이고 검토용 원본127장은 덮어쓰지 않았다.
- LSP timeout을 통과로 바꾸지 않았다. strict compiler/ESLint가 통과했다.
  React Doctor의 observer cleanup 경고는 source상 false positive이며,
  React Scan의 production profiling hook 부재로 불필요한 렌더링0을 주장하지 않는다.

## 다음 작업과 경계

현재 공개 UI/UX 후보를 사용자가 실제 화면에서 검토하는 단계다. 최종 시각 승인,
로고 벡터/정확한 색, 사진 권한/추가 촬영, 공개 전 운영 정보 확인은 남아 있다.
후보 구현·기술 검수 완료를 사용자의 최종 디자인 승인으로 기록하지 않는다.

백엔드·관리자·인증·PostgreSQL/Prisma·SQLite 이전·예약/결제/메일과 운영 배포는
시작하지 않았다. 디자인 승인 이후 원본 인수인계의 조사/정책/보안/이전 기록부터 이어간다.
GitHub Actions는 사용/활성화하지 않는다. `.github/workflows/deploy.yml.disabled`의
SHA256 `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`를 보존한다.
배포는 별도 명시적으로 승인한 수동 작업이다. reset/clean/일괄 파일 삭제를 하지 않는다.


## 최신 공개 디자인 재개 위치 — craft revision

후속 UI/UX·와이드·카드·CTA·마키 개선과 SaturdayBlock/Bali/Coconut 비교의 현재 상태는
[2026-09-08-design-craft-next.md](2026-09-08-design-craft-next.md)를 먼저 확인한다.
이 문서의 원문/옛 TODO/부록은 역사 기록으로 보존하며, 현재 빌드와 PASS는 최신 manifest와 대조한다.
