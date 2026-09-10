# SVG 원본 도입 기록 — 2026-09-08

완료: 사용자가 요청한 Tailwind·Bootstrap SVG 두 묶음을 `web/assets/icons/`에 실제 로컬 자산으로 가져왔다. 기본 화면의 Lucide 아이콘은 유지하며, 새 소스 라이브러리에서 선택한 SVG를 이후 사용처에 적용할 수 있다.

## 파일과 검증 결과

| 항목 | Heroicons (`tailwind-svg/`) | Bootstrap Icons (`bootstrap-icons-svg/`) |
| --- | ---: | ---: |
| SVG 파일 | 324 | 2,078 |
| SVG 합계 바이트 | 154,241 | 1,245,329 |
| 로컬 참조 파일과 바이트 일치 | 324 / 324 | 2,078 / 2,078 |
| 고정 공식 커밋과 바이트 일치 | 324 / 324 | 2,078 / 2,078 |
| XML 파싱 실패 | 0 | 0 |
| 정적 SVG 안전성 검사 발견 사항 | 0 | 0 |
| 원본 viewBox | 24×24 | 16×16 |

두 묶음 총 2,402개, 1,399,570 bytes다. 라이선스와 안내 문서 용량은 표의 SVG 바이트 합계에서 제외했다. 복사 원본의 이름과 내용을 변경하지 않았고 의존성, 생성기, 런타임 래퍼는 추가하지 않았다.

검사는 모든 파일을 대상으로 수행했다. SVG 네임스페이스와 루트, 사용 요소, 속성을 XML 파서로 확인했고 DTD/ENTITY 선언, script 및 예상하지 않은 요소, 외부 네임스페이스, `on*` 이벤트 속성, 외부 href/src, CSS `url()`, `@import`, 실행형·외부 URL을 확인했다. 실제 요소는 `svg`, `path`, `rect`, `circle`만 있었으며 외부 참조와 능동 콘텐츠가 없었다. 이 결과는 가져온 고정 파일에 대한 검사이며 이후 수정 파일의 검증을 대신하지 않는다.

실제 Chrome에서 각 묶음의 `arrow-up-right.svg`, `wallet.svg`, Heroicons의 `gift.svg`, Bootstrap의 `currency-bitcoin.svg` 총 6개를 inline SVG로 열어 확인했다. 48×48 표시 크기에서 모든 경로가 정상 렌더링되었고 `currentColor` 적용과 원래 선/채움 표현을 시각적으로 확인했다. 페이지 오류는 0건이었다. README의 로컬 무결성 재검증 명령도 실제 실행해 두 묶음 모두 통과했다.

## 확인한 공식 출처

- **Heroicons:** [24px outline 커밋 `bd6c5c0d5acec14d116da611b4c5044fec1bb7dc`](https://github.com/tailwindlabs/heroicons/tree/bd6c5c0d5acec14d116da611b4c5044fec1bb7dc/optimized/24/outline), [MIT LICENSE](https://github.com/tailwindlabs/heroicons/blob/bd6c5c0d5acec14d116da611b4c5044fec1bb7dc/LICENSE). `tailwind-svg`는 참조 디렉터리 이름이며 실제 자산 출처는 Heroicons다. 최초 비교한 [v2.2.0 커밋 `0435d4ca364a608cc75e2f8683d374e55abbae26`](https://github.com/tailwindlabs/heroicons/tree/0435d4ca364a608cc75e2f8683d374e55abbae26/optimized/24/outline)에서는 323개가 일치하고 `gift.svg`만 달랐다. 해당 차이는 [공식 gift 정렬 수정 커밋](https://github.com/tailwindlabs/heroicons/commit/bd6c5c0d5acec14d116da611b4c5044fec1bb7dc)과 일치하며, 이 커밋의 전체 324개가 현재 참조 원본과 일치한다. 따라서 정확한 버전명 대신 확인한 커밋 스냅샷으로 기록한다.
- **Bootstrap Icons:** [v1.13.1 커밋 `ce0e49dd063243118a115f17ad1fe1fe7576d552`](https://github.com/twbs/icons/tree/ce0e49dd063243118a115f17ad1fe1fe7576d552/icons), [MIT LICENSE](https://github.com/twbs/icons/blob/ce0e49dd063243118a115f17ad1fe1fe7576d552/LICENSE). 공식 커밋의 파일 목록과 2,078개 SVG 바이트가 모두 일치한다.

각 공식 커밋의 LICENSE를 해당 디렉터리에 그대로 복사했다. 전체 일치 확인은 로컬 참조와 공식 소스 사이의 내용 일치를 입증하며, 참조 프로젝트가 과거에 어느 명령으로 다운로드했는지까지 단정하지 않는다.

## 이어받을 때

- 사용 규칙과 무결성 재검증 명령: [SVG 라이브러리 README](../../web/assets/icons/README.md)
- 기계 판독 검증 기록: [verification.json](../../web/assets/icons/verification.json)
- 라이브러리는 `web/assets/icons/`에 보관한다. 현재 앱의 소스 import, 공개 경로, 스타일, 패키지 파일은 변경하지 않았다.
- 원본의 선/채움과 좌표계는 유지한다. 전체 파일을 공통 선 두께로 일괄 변형하지 않는다. 접근성 이름과 실제 화면의 아이콘 일관성은 개별 적용 시 확인한다.
- 이번 검증은 자산 도입 범위다. 새 SVG를 화면에 적용한 것으로 보고하거나 UI 빌드·배포를 수행하지 않았다.
