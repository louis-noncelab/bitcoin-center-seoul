# 다음 세션 시작점 — 공개 디자인 후보

원본 인수인계 `2026-09-08-codex.md`(부록 포함994행)와 `2026-09-08-codex-start.md`(69행)는 역사 기록으로 보존했다. 그 안의 사용자 지시, 원본33개 요청, 답변15개, 하위작업11개, 마지막 TODO10개를 이어받는다. 과거 완료/진행 표시는 아래 최신 기록과 실제 파일로 대조한다.

## 최신 위치

- 작업 폴더 `/Users/max/noncelab/center/bitcoin-center-seoul`
- 브랜치 `redesign/center-web`
- HEAD `fd7c472d856a257a77bf66766163b3f245a8757f`, 커밋/스테이징 없음.
- 실제 공개 프론트엔드는 `web/`에 있다. 기존 Vite/Express/SQLite 앱과 업로드는 보존했다.
- 공개 후보: `http://127.0.0.1:3100/ko`, `/en`. 각각 about/programs/experience/journal/goods/visit의6개 영역이 있다.
- 서체·아이콘·토큰 비교: `/ko/design-system`, `/en/design-system`.
- production build `VW6RTRHWutxOd2NMwW_H2`. 프로세스 번호는 재사용하지 말고 포트/작업 경로부터 확인한다.

## 이번 추가 지시와 결과

- **Pretendard를 한영 제목/본문 기본으로 적용했다.** 공식 v1.3.9 Unicode subset92개와 OFL을 로컬 보관한다. source CSS import로 빌드에 실제 font faces/파일이 포함된다. `@import url('/fonts/...')`만 쓰던 방식은 컴파일에서 누락돼 폐기했다. 브라우저의 실제 custom Pretendard glyph를 확인했고 모든 화면 테스트에 로드된 폰트 검사를 추가했다.
- Manrope/Noto는 비교 화면의 A/B 대안으로만 남아 있다. C Pretendard가 현재 기본이며, 폰트 질문을 처음부터 다시 열지 않는다.
- Tailwind(Heroicons)324개 + Bootstrap2078개 **SVG2,402개를 `web/assets/icons/`에 실제로 들여왔다.** 각 공식 고정 커밋과 바이트 일치, MIT 포함, 정적 XML 검사0문제. 폴더 README와 verification.json이 출처·사용 기준·재검증 방법을 담는다. 화면 UI는 Lucide outline 체계를 유지한다.
- `.gitignore`에 로컬 인덱스/개인 설정/보관 폴더/세션 내보내기/원시 QA 자료 제외를 추가했다. 세션 HTML은 `.local/session-exports/`, 완전한2MB 폰트는 `.local/font-source/`에 해시를 보존해 이동했다. 기존 파일을 초기화하거나 tracked 과거 DB/lockfile을 삭제하지 않았다.

## 검증과 이어갈 작업

- **최신 상태와 단계:** `docs/checkpoints/2026-09-08-public-design.md`
- **종합 검사·한계:** `docs/checkpoints/2026-09-08-validation.md`
- **독립 리뷰:** `docs/checkpoints/reviews/`
- **디자인 계약/구조:** `web/DESIGN.md`, `web/README.md`
- **사진/카피, 폰트/SVG 출처:** `docs/design/`
- 현재 build에서102개 테스트/57.7초/정상exit0, 96장 화면, 상태8장, axe32건 위반0, 320px reflow16건 overflow0, 사진DPR1/2의24측정 통과. 실제 Chrome 한영 h1/p의 Pretendard와 방문/언어/테마/메뉴 동작을 총괄이 확인했다.
- Lighthouse32회는 성능/접근성/권장사항100, SEO66–69로 완료했다(로컬 재방문/noindex 조건). 최종 독립 종합 검토도 **PASS/APPROVE/블로커0**: 현재147소스/96페이지/8상태 해시 및 PNG104장을 전부 직접 확인했다. `docs/checkpoints/reviews/review-current-final.md`와 최신 종합 검사 기록을 우선한다. 과거 PASS나 이전 font-fallback build의 성공을 최신 검증으로 쓰지 않는다.
- 모든 raw evidence는 `docs/checkpoints/evidence/`에 **로컬 보존하지만 Git에서는 제외**한다. source-manifest.json에147소스/96페이지/8상태 해시가 있다. 다른 복제본에서 raw 자료가 없으면 보고서만으로 재검증했다고 주장하지 않는다. 재실행 가능한 검사는 `web/tests/`에 있다.

## 실행

Node22와 npm을 사용한다. 현재3100 preview가 있으면 중복 실행하지 않는다. dev와build는 동시에 실행하지 않는다.

```sh
cd /Users/max/noncelab/center/bitcoin-center-seoul/web
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run check
npm run build
npm run start
# 별도 터미널, 이미 서버가 켜져 있을 때:
npm run test -- --workers=1 tests/home.spec.ts tests/public-site.spec.ts tests/image-quality.spec.ts
```

개발 도구200을 기대하는 routing.spec는 dev 환경에서만 실행한다. production의 dev-tools404는 별도로 확인했다. 병렬4worker에서는 모든 assertion이 통과한 뒤 Chrome fixture 종료 대기가 있었으므로 기록한 순차 실행을 사용한다. 현재 순차 실행은 정상 종료한다. LSP tool timeout은 clean으로 표시하지 않고 직접 strict tsc/ESLint/build 결과를 사용했다.

## 다음 결정과 엄격한 경계

실제 시안에 대한 사용자의 새 피드백을 공개 디자인에 반영하는 단계다. 최종 전체 시각 승인, 로고 벡터/정확한 색, 사진 구성/권한/추가 촬영, 공개 전 운영 정보와 문구 확인은 남아 있다. 기존에 답한 방향을 다시 조사하거나 질문하지 않는다.

백엔드·관리자·인증·PostgreSQL/Prisma·SQLite 이전·예약/결제/메일·운영 배포는 아직 착수하지 않았다. 디자인 승인 후 원본 인수인계의 정책/보안/DB 이전 기록을 출발점으로 이어간다. 이번 공개 후보 완성을 그 영역의 완료로 표시하지 않는다.

**GitHub Actions는 절대 사용/활성화하지 않는다.** `.github/workflows/deploy.yml.disabled` SHA-256 `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`를 보존한다. 원래 workflow의 삭제 상태, 기존 AGENTS.md 변경, 미추적 web/docs를 reset/clean하지 않는다. 배포는 별도 명시적으로 승인한 수동 작업이다.


---

## 이후 사용자 피드백과 최신 재개 위치

이 문서 본문과 부록은 역사 기록이다. 이후 공개 UI/UX 재수정, 담백한 한영 문구,
마포 표현 제거, 내비 스크롤 복구의 최신 상태는
[2026-09-08-design-revision-next.md](2026-09-08-design-revision-next.md)와
[진행 기록](../checkpoints/2026-09-08-design-revision.md)을 우선 확인한다.
옛 후보의 PASS를 새 디자인의 검증이나 사용자 승인으로 재사용하지 않는다.
