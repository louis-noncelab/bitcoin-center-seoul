# Bitcoin Center Seoul — 이름·색상·SEO 후속 작업

이 문서는 이름·색상·SEO 단계의 기록이다. 이후 승인된 추가 개선의 최신 재개 지점은 [사진 구성·모션 인수인계](2026-09-08-scenes-next.md)다. 원본 33요청·15답변·TODO10개·11하위작업·폰트/SVG/디렉터리 구조 요청은 [원본 인수인계](2026-09-08-codex.md)와 [시작 프롬프트](2026-09-08-codex-start.md)에 보존한다. [직전 공개 디자인 기록](2026-09-08-design-craft-next.md)의 완료 상태를 이어받았으며, 전체 조사를 다시 시작하지 않는다.

## 현재 상태

후속 구현·로컬 검증·독립 코드/시각/SEO 검토를 완료했다. 사용자 디자인 채택, 운영 공개 승인, 백엔드 구현 완료를 뜻하지 않는다.

- 폴더: `/Users/max/noncelab/center/bitcoin-center-seoul`
- 브랜치: `redesign/center-web`
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`; 새 커밋·스테이징 없음.
- 빌드: `xUZ_zPOFp3V5-Q5MXcLhJ`
- 소스 fingerprint: `fafeca3b19d9f1e2bd6f8a01f2cb374148eb55d7c9ab7e085bd9dec3d52a8f7d`
- 미리보기: `http://127.0.0.1:3100/ko`, `/en`; `npm run start` 실행 세션44623. 작업 Mac의 로컬 주소이며 원격 모바일 공개 주소가 아니다. 기존 세션5292는 정상 종료했다.
- Node: `/opt/homebrew/opt/node@22/bin`을 PATH 앞에 추가한다. npm만 사용한다.

## 사용자 피드백과 적용한 판단

사용자는 직전 결과가 많이 나아졌다고 평가한 뒤 이름의 파란색, 서울의 강조와 줄바꿈, 남은 AI 같은 표현 및 SEO를 점검해 달라고 했다. 새로운 전면 재설계 요청으로 해석하지 않았다.

- **이름은 단색.** 홈 제목·내비 이름·푸터 이름의 파란색을 제거했다. 실제 라운지 사진에 이미 파란색이 강하게 존재한다. 이름에 색을 하나 더 나누는 것보다 전체를 읽기 쉽다. 장식용 주황 마침표도 제거했다.
- **서울은 굵기로 강조.** Pretendard 이름500/서울650, 같은 글자 크기다. `비트코인 센터`와 `서울`, `Bitcoin Center`와 `Seoul`을 의미 단위로 묶고 실제 공백으로 연결했다. 공간이 부족하면 서울 앞에서 줄바꿈한다. 375px 한국어는 한 줄, 영어는 서울 앞에서 두 줄이다. 1280px 히어로는 두 언어 모두 서울이 다음 줄이다. 무조건 두 줄로 만들지 않는다. 과도한 글자 확대에서는 잘림을 막기 위해 첫 묶음도 단어 사이에서 예외적으로 줄바꿈할 수 있다.
- **파란색의 역할을 제한.** 일반 정보 아이콘과 섹션 화살표의 파란색도 제거했다. 실제 링크·선택된 메뉴/탭·상호작용에는 유지한다. 밑줄·배경·초점 표시를 함께 제공한다. 전부 회색으로 바꾸는 대안도 비교했으나, 현재 위치 구분에 도움이 되는 기능적 파란색을 추천·적용했다. 사용자에게 전체 팔레트 폐기 승인을 받았다고 기록하지 않는다.
- **모션.** 고정된 두 줄을 각각 움직이던 이름 애니메이션을 하나의 H1에 적용했다. 500ms 동안 이름 전체가 함께 들어온다. 기존 내비·탭·섹션·사진·마키 모션과 reduced-motion 처리는 보존했다.
- **문구.** `center.ts`의 182개 필드 중 설명5개만 다듬었다. 전시·체험을 실제 방문 행동으로 설명하고 중복·번역투를 줄였다. 연락처·주소·운영시간·링크·ID·행사 사실은 변경하지 않았다.
- **SEO.** 홈/소개의 중복 제목을 수정하고, 언어별 브랜드명을 메타·공유 제목에 일관되게 적용했다. 사이트맵의 `x-default`를 기존 HTML의 한국어 기본값과 맞췄다. 홈페이지에 기존 이름·소개·웹주소·이메일·전화만 사용하는 Organization JSON-LD를 추가했다. 단일 H1과 전체 이름의 공백은 유지한다.

## 검증과 정확한 범위

모든 아래 결과는 위 빌드와 소스에 속한다. 이전 `AFKk_t8vqWjTq4n4S-G_D`의 성능·시각 결과를 새 빌드의 증거로 재사용하지 않았다.

| 검사 | 결과 |
| --- | --- |
| Node22 check/build, 변경 TS/TSX 진단 | 통과, 진단 오류0 |
| 프로덕션 Playwright | 130/130 통과, SEO7개 포함. 변경하지 않은 개발 전용 라우팅 테스트1개는 프로덕션 대상에서 제외. |
| 일반 경로 캡처 | 한영 × 두 테마 ×375/768/1280 ×8페이지 =96장 |
| 이름 배치 | 한영 × 두 테마 ×320/375/768/960/1024/1280/3440 =28사례, 정상 크기 이름 분리·넘침 없음 |
| 이름 글자200% 확대 | 320px4사례에서 잘림·헤더 겹침 없음. 브랜드 글자만 확대한 표적 검사이며 전체 텍스트 확대 적합성을 단정하지 않는다. |
| 와이드·마키 | 배치20, 정적 fallback6, loop/pause/hover/reduced/no-JS 검증. 두 hydration 사례의 마키 높이 변화0. |
| 실제 이동·모션 | 경로5, 모션 기록18, 내비 이동 후 scrollY0, 한 번의 H1 모션·reduced 전환 확인 |
| 접근성·좁은 화면 | axe32사례 위반0·미확정0,320px16경로 넘침0 |
| HTTP·의존성 | HTTP7검사, 브라우저 외부 요청0, npm audit 취약점0 |
| 기록 | 소스/설정/자산/테스트2565파일, 원본 사진7개, 새 캡처233장의 SHA-256 검증 |

태블릿 다크 캡처 두 장의 굿즈 사진이 좁게 보인다는 초기 시각 의견은 동일 PNG를 각각 다시 열었을 때 재현되지 않아 철회됐다. 추가로 실제 브라우저에서 테마를 전환했다. 한영/두 테마 모두 사진706.5625×302.8125px, 완전한 이미지 디코딩, 가로 넘침0이었다. 제품 소스 수정으로 해결한 버그라고 기록하지 않는다.

와이드 hydration 관측 중 한 데스크톱 사례에서 글꼴 정착에 따른 작은 layout-shift0.000228이 기록됐다. 마키 높이 변화는0이다. 이 실행에서 전체 CLS0, Lighthouse100 또는 실사용 성능 측정을 주장하지 않는다.

증거: `docs/checkpoints/evidence/identity-2026-09-08/final/`의 `source-manifest.json`, `verification-summary.json`, `preservation.json`, check/build/playwright 로그, identity/manual/wide JSON 및 PNG. `comparison/`은 이전 빌드에 임시 CSS/DOM을 적용한 비교안으로 최종 구현 증거가 아니다.

## 담당별 산출물

- Root: 브랜드 소스·토큰·스타일·DESIGN, 통합 빌드/브라우저/검증/인수인계.
- editorial_art_direction: [이름·색상 전문가 의견](../checkpoints/reviews/2026-09-08-brand-typography.md), [최종 시각 검토](../checkpoints/reviews/2026-09-08-identity-visual-review.md), APPROVE.
- plain_language_copy: `center.ts`만 수정, [전후 문구 보고서](../checkpoints/reviews/2026-09-08-plain-copy-final.md).
- seo_identity: 메타/사이트맵/홈 JSON-LD/SEO 테스트, [SEO 결과와 공개 단계 목록](../checkpoints/reviews/2026-09-08-seo-identity.md), GREEN.
- craft_code_review: 읽기 전용 [코드 검토](../checkpoints/reviews/2026-09-08-identity-code-review.md), CLEAR/APPROVE.

## 보존과 남은 작업

직전 인수인계의 TODO10개 및 디렉터리·gitignore 작업은 공개 시안 범위에서 완료 상태를 유지한다. 이번 피드백 항목의 로컬 구현·검증도 완료했다. 아래 후속 범위는 이번 완료와 구분한다.

- 사용자 최종 시각 채택은 에이전트 승인과 별개다. 새 피드백이 오면 현재 시안을 기준으로 필요한 부분만 이어간다.
- 운영 공개 전 `noindex/nofollow`와 robots 차단의 전환, 실제 HTTPS canonical/OG/sitemap, 기존 `#events`·`/walletExperence`·활동 사진 목적지 연결을 검토한다. 지금은 프리뷰 제외 정책을 보존했다. Search Console·실제 순위·외부 Rich Results Test는 수행하지 않았다.
- 백엔드·관리자·인증·DB 이전·결제·운영 배포는 시작하지 않았다. 사용자 지시로 중지한 터널/원격 공개를 다시 열지 않는다.
- 기존 dirty/untracked 파일 보존. raw 증거와 생성물은 `.gitignore`로 제외하고 소스·검토 문서·라이선스를 남긴다. Pretendard92subset/OFL, Heroicons324+Bootstrap2078/MIT, 실제 UI Lucide,7원본 사진은 보존했다.
- GitHub Actions 절대 금지. `.github/workflows/deploy.yml.disabled` SHA-256은 `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`. 활성 yml/yaml 워크플로 없음.

새 코드를 수정하면 이 빌드의 검증 결과를 그대로 완료 근거로 쓰지 말고 변경 범위에 맞게 새 결과를 남긴다.

## 이후 대화 — 전체 디자인 인상에 대한 질문
사용자는 개선을 긍정적으로 평가한 뒤, 전체 인상만으로 방문·참여·소장 욕구가 생기는지와 세계 최상위 센터 홈페이지가 될 잠재력을 물었다. 상점/밋업 신청 페이지를 지금 만들라는 뜻이 아니라고 명확히 정정했다. 구현을 새로 시작하지 않았다. [최종 디자인 의견](../checkpoints/reviews/2026-09-08-overall-design-impression.md)을 읽고, 별도의 기능 개발 승인으로 해석하지 않는다.
