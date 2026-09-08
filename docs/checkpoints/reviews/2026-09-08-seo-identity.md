# 비트코인 센터 서울 SEO 점검 — 2026-09-08

## 결과와 범위

현재 프리뷰는 한·영 URL, 서버 렌더링 본문, canonical, 상호 hreflang, 실제 사진과 방문 정보의 기초를 갖췄다. 홈/소개 페이지의 제목 중복을 공통 함수에서 고쳤고, 한국어 메타데이터의 브랜드명을 한국어로 통일했다. 홈에는 기존 공개 정보만 담은 Organization JSON-LD를 추가했다.

공개 승인을 받은 사이트에 대한 색인 성과 보고서가 아니다. 프리뷰의 `noindex, nofollow`와 `robots.txt`의 전체 차단은 요청대로 보존했다. 변경 후 빌드 `xUZ_zPOFp3V5-Q5MXcLhJ`에서 Node 22 전체 check·build 및 프로덕션 Playwright 130개가 통과했으며, 그중 SEO 검사 7개도 모두 GREEN이다. 아래 초기 증거는 변경 전 빌드 `AFKk_t8vqWjTq4n4S-G_D`에 속한다.

- 범위: `/ko`, `/en` 및 각 언어의 `about`, `programs`, `experience`, `journal`, `goods`, `visit` 총 14개 공개 페이지.
- 127.0.0.1:3100에서 두 언어의 홈을 Chrome으로 렌더링하여 메타 태그, H1, 링크, 이미지, JSON-LD를 수집했다. 브라우저는 즉시 닫아 root에 넘겼다.
- 이어서 14개 페이지의 원본 HTML·응답, 내부 목적지 14개, 루트/잘못된 경로/후행 슬래시 응답과 사이트맵을 HTTP로 확인했다.
- Search Console, 분석 계정, 운영 서버, 색인 요청, 배포, Actions, DB·인증·결제·메일 작업은 사용하지 않았다. 검색량·현재 순위·유입·필드 Core Web Vitals를 측정했다는 주장은 하지 않는다.

## 지금 확인하고 수정한 항목

| 항목 | 근거와 영향 | 조치 / 우선순위 |
| --- | --- | --- |
| 홈과 소개의 제목 중복 | `/ko`와 `/ko/about`은 모두 `비트코인 센터 서울 \| Bitcoin Center Seoul`, `/en`과 `/en/about`은 모두 `Bitcoin Center Seoul`이었다. 각 언어 7페이지에 고유 제목이 6개뿐이었다. 검색 결과에서 소개와 홈을 구별하기 어렵다. | `pageMetadata()`에서 소개 제목에 기존 내비게이션의 `센터 소개` / `About`을 사용. 현재 수정, 중간 우선순위. |
| 한국어 브랜드 표기의 불필요한 반복 | 한국어 홈·방문 제목은 이미 한국어 전체 이름을 담고 있는데 영어 브랜드가 다시 붙었다. `og:site_name`도 두 언어 모두 영어였다. | `hero.title`을 해당 언어의 브랜드명으로 재사용. 필요한 상세 제목에만 한 번 붙이고 Open Graph에도 동일하게 적용. 현재 수정, 중간 우선순위. |
| 사이트맵과 HTML의 기본 언어 표시 | HTML은 모든 페이지에 `ko`, `en`, `x-default → ko`를 제공했지만 XML은 `ko`, `en`만 제공했다. 양쪽 KO/EN 쌍은 원래도 맞았으므로 hreflang 장애로 판정하지 않는다. | XML에도 같은 `x-default`를 한 줄 추가. 선택적 일관성 보완, 낮은 우선순위. |
| 조직 정보 미표기 | 렌더링된 KO/EN 홈에서 `script[type="application/ld+json"]`가 각각 0개인 것을 확인했다. HTML만 검색한 결과가 아니다. | 두 홈에 같은 `@id`를 사용하는 Organization 정보 추가. 이름·다른 언어 이름·기존 URL·소개·이메일·전화번호만 기존 콘텐츠에서 읽는다. 검색엔진의 조직 식별 보완이며 리치 결과나 순위 상승을 보장하지 않는다. |

Google은 페이지마다 구별되는 간결한 제목, 본문과 맞는 언어, 눈에 띄는 주제목을 권장한다. 두 언어 브랜드의 병기가 그 자체로 페널티라는 뜻은 아니며, 이번 변경은 중복과 언어 일관성을 개선한다. 글자 수 50–60자 같은 관행을 강제 기준으로 적용하지 않았다. [Google 제목 링크 지침](https://developers.google.com/search/docs/appearance/title-link)

각 hreflang 버전이 자신과 상대를 함께 가리키는 것이 핵심이다. HTML·HTTP·사이트맵은 동등한 표기 방식이고, 여러 방식을 함께 쓰는 것 자체에 추가 검색 이점은 없다. `x-default`는 필수 오류 수정이 아니라 이미 선택한 한국어 기본값의 일관성을 유지하는 보완이다. [Google 다국어 페이지 지침](https://developers.google.com/search/docs/specialty/international/localized-versions)

Organization은 홈페이지의 조직 정보를 설명하는 데 사용할 수 있다. 현재 Google 문서는 필수 속성을 따로 두지 않고 적용 가능한 정보를 권장한다. 검증된 법인·사업장 세부 분류, 좌표, 개업일, 소셜 프로필, 가격, 평점, 후기, 행사 날짜를 추측해 넣지 않았다. [Google Organization 지침](https://developers.google.com/search/docs/appearance/structured-data/organization)

## 정상인 기술·페이지 구조

| 검사 | 초기 관측 |
| --- | --- |
| HTTP 상태 | 공개 페이지 14/14가 200. `/fr`, `/ko/missing-page`, `/en/missing-page`는 404. |
| 기본 언어·URL | `/`는 `/ko`로 307. `/ko/`, `/en/`는 각각 슬래시 없는 URL로 308. 소스는 locale prefix를 항상 쓰고 언어 자동 감지를 끈다. |
| canonical | 14/14가 `https://bitcoincenterseoul.com/{locale}[/{section}]`로 언어별 자기 주소를 지정한다. 한국어를 영어로 합치는 canonical은 없다. |
| hreflang | 14/14에 절대 주소의 `ko`, `en`, `x-default`가 있으며 섹션 경로를 보존한다. 두 언어의 대응 페이지가 서로 가리킨다. |
| 제목·설명 | 모든 페이지에 제목과 해당 언어의 설명이 존재했다. 설명은 14개 모두 고유했다. 위의 제목 중복 2쌍만 수정했다. |
| 본문 | 14/14의 원본 HTML에 하나의 H1과 해당 언어 본문이 들어 있다. 홈 두 개는 실제 렌더링에서도 하나의 H1과 완전한 이름을 확인했다. |
| 내부 탐색 | 수집된 공개 내부 목적지 14/14가 200. 주요 6개 상세 페이지는 공유 내비게이션에서 한 번의 링크 이동으로 도달한다. |
| 사진 | 실제 사진에 한·영 대체 텍스트를 제공하고 Next Image로 렌더링한다. 홈 렌더링과 14개 응답에서 이미지 alt를 수집했다. |
| 공유 정보 | Open Graph/Twitter 제목·설명·이미지가 있다. 현재 동일한 라운지 사진을 쓴다. 초기 로컬 OG 이미지 응답은 200 JPEG, 3,143,301 bytes다. |
| sitemap | 200 XML, 공개 14 URL만 포함. 개발용 design-system/관리자/잘못된 경로는 없다. 임의의 `lastmod`, `priority`, `changefreq`를 넣지 않는다. |

브랜드의 시각적 줄바꿈은 `비트코인 센터 / 서울`, `Bitcoin Center / Seoul`로 바뀌어도 된다. DOM과 접근 가능한 이름은 공백을 포함한 `비트코인 센터 서울`, `Bitcoin Center Seoul`로 유지하고 H1을 두 개로 쪼개지 않는다. 변경 후 SEO 브라우저 검사는 14페이지의 H1 개수와 두 홈의 완전한 이름을 확인했다. 줄바꿈의 시각적 배치·접근성·모션 검토는 root의 별도 통합 검사 범위다.

초기 전체 페이지 PNG는 위쪽 메타데이터·브랜드 확인용이다. 스크롤 없이 찍어 아래쪽 지연 로딩 사진이 아직 비어 있을 수 있으므로, 사진 누락이나 전체 시각 완성도를 판단하는 증거로 쓰지 않는다. 모바일·다크모드·모션·레이아웃 검증은 root의 통합 브라우저 범위다.

## 공개 단계에서 처리할 항목

아래는 현재 로컬 프리뷰에서 차단을 해제해야 한다는 뜻이 아니다.

1. **출시 필수: 색인 정책을 명시적으로 전환한다.** `web/src/content/site.ts`, `[locale]/layout.tsx`의 `noindex, nofollow`와 `app/robots.ts`의 전체 차단을 함께 검토한다. 공개할 URL만 허용하고 개발/관리 경로의 제외를 유지한다. 현재 정책이나 일반 환경변수 스위치는 추가·변경하지 않았다. robots.txt가 차단한 URL은 Google이 noindex를 읽을 수 없으므로, 전체 차단과 noindex의 조합을 인터넷에 노출한 프리뷰의 완전한 비공개 보장으로 표현해서는 안 된다. [Google noindex 동작](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

2. **출시 필수: 기존 공개 주소와 실제 목적지를 연결한다.** 현재 프로그램 버튼은 `https://bitcoincenterseoul.com/#events`, 지갑 안내는 `/walletExperence`, 활동 사진은 기존 도메인 루트로 간다. 프리뷰가 기존 사이트를 안내하는 동안 의도된 연결이다. 새 앱이 같은 루트를 대체할 때에는 일정·사진 목적지가 새 화면에서 실제로 이어지는지 확인하고, 발행된 지갑 URL도 유지하거나 영구 리다이렉트해야 한다. 이 점검에서 legacy 앱이나 그 경로를 수정하지 않았다.

3. **출시 필수: 실제 HTTPS 호스트에서 다시 검사한다.** canonical/OG/사이트맵의 도메인과 KO/EN 경로, 리다이렉트, 이미지 정적 파일이 실제 배포 주소에서도 200인지 검증한다. 현재 프리뷰는 배포 예정 도메인을 메타데이터에 사용하므로 로컬 200만으로 운영 주소의 상태를 보장할 수 없다. 공개 승인 후 색인 대상 sitemap을 robots.txt와 Search Console에 연결한다. sitemap에는 검색 결과에 표시할 canonical URL을 포함한다. [Google sitemap 지침](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

4. **출시 검사: 구조화 데이터의 외부 검증과 필드 측정을 수행한다.** 이번에는 로컬 데이터·JSON 출력·화면 일치 검사를 제공한다. Google Rich Results Test/URL Inspection에서 통과했다는 주장은 하지 않는다. 공개 승인 후 실제 URL로 점검하고, 실사용 Core Web Vitals가 쌓인 뒤 평가한다. 구조화 데이터는 보이는 실제 정보와 같아야 하며 올바른 마크업도 검색 노출을 보장하지 않는다. [Google 구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

5. **낮은 우선순위: 전용 공유 이미지가 필요해질 때 최적화한다.** 현재 OG 원본은 약 3.14 MB다. 공유 미리보기의 다운로드량을 줄여야 할 때 같은 실제 사진으로 작은 파생 이미지를 만든다. 일반 페이지의 Next Image 응답 크기나 LCP가 3.14 MB라는 뜻은 아니다. 별도의 이미지 생성이나 새 자산은 이번 작업에 추가하지 않았다.

프로그램·전시·기록·굿즈 페이지는 첫 공개 디자인 단계의 짧은 사실 안내다. 검색 유입 확장은 실제 일정, 지난 행사 기록, 확인된 상품 정보를 제공할 수 있을 때 진행한다. 이를 이유로 현재 날짜·가격·후기나 Event/Product/Article 스키마를 만들어 넣지 않았다.

## 변경 파일과 검사

- `web/src/content/site.ts`: 공통 제목 분기와 언어별 `og:site_name`.
- `web/src/app/sitemap.ts`: 기존 KO/EN 언어쌍에 같은 한국어 `x-default` 추가.
- `web/src/components/seo/organization-json-ld.tsx`: 기존 콘텐츠를 읽는 서버용 조직 정보. `JSON.stringify(...).replace(/</g, "\\u003c")`로 스크립트 태그 탈출을 막는다. 새 의존성 없음.
- `web/src/app/[locale]/page.tsx`: 홈에만 조직 정보 컴포넌트 삽입.
- `web/tests/seo.spec.ts`: 언어별 고유 제목, 실제 렌더링의 canonical/hreflang/noindex/공유 제목, 화면과 조직 정보의 일치, 사이트맵 언어쌍을 검사하는 7개 테스트.

설치된 Next 16.3.4의 다음 문서를 읽고 Metadata API, sitemap `alternates.languages`, 기본 `script` JSON-LD 방식을 사용했다.

- `web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `web/node_modules/next/dist/docs/01-app/02-guides/json-ld.md`

검사 기록:

| 검사 | 결과 |
| --- | --- |
| 초기 실제 Chrome KO/EN 홈 | 200, 언어·H1·메타데이터 확인, JSON-LD 없음 확인. 브라우저 종료 후 root에 반환. |
| 전체 14 페이지·내부 링크 HTTP | 14/14 200, 자기 canonical/상호 hreflang 확인. |
| 수정 전 회귀 검사 | HTTP 테스트 3개가 예상 이유로 실패: 한국어 중복 브랜드, 영어 홈/소개 제목 중복, XML x-default 누락. |
| Node 22.23.2 `tsc --noEmit` | 통과. |
| 변경 TS/TSX/테스트 대상 ESLint | `--max-warnings 0` 통과. |
| 파일 크기·경계 검토 | 수정 파일 모두 68 비어 있지 않은 코드 줄 이하. 서버 콘텐츠만 사용, 타입 단언·새 입력 경계·새 로깅·의존성 없음. |
| 수정 후 전체 check·build | Node 22에서 `next typegen && tsc --noEmit`, `eslint . --max-warnings 0`, Next 16.3.4 프로덕션 build 모두 통과. |
| 수정 후 프로덕션 Playwright | 130/130 통과, SEO 검사 7/7 GREEN. root가 실행한 실제 브라우저 검사의 로그를 확인했다. 이 문서의 초기 캡처를 수정 후 증거로 사용하지 않는다. |

### 통합 GREEN 증거 — 2026-09-08 후속 확인

- 빌드: `xUZ_zPOFp3V5-Q5MXcLhJ`.
- HEAD: `fd7c472d856a257a77bf66766163b3f245a8757f`.
- 소스 fingerprint: `fafeca3b19d9f1e2bd6f8a01f2cb374148eb55d7c9ab7e085bd9dec3d52a8f7d`.
- 증거: `docs/checkpoints/evidence/identity-2026-09-08/final/source-manifest.json`, `check.log`, `build.log`, `playwright.log`.
- manifest의 빌드·HEAD·fingerprint와 현재 `web/.next/BUILD_ID`를 확인했다. SEO 소스 4개, SEO 테스트, 소비하는 `center.ts`의 SHA-256 총 6개가 manifest와 일치한다.
- `playwright.log`의 124–130번 검사가 SEO 7개이며 전부 통과했다. 전체 결과는 `130 passed (1.2m)`이다.

통과한 SEO 동작은 다음과 같다.

1. 두 언어 각각 7페이지의 제목이 모두 다르고, 해당 언어의 전체 브랜드명이 한 번씩 포함된다. 홈 제목은 브랜드명 자체다.
2. 실제 렌더링된 14페이지에서 `html[lang]`, H1 하나, 언어별 자기 canonical, `ko`·`en`·`x-default` 대응 URL이 유지된다. `noindex, nofollow`와 언어별 Open Graph 사이트명, 문서 제목과 같은 Open Graph/Twitter 제목도 확인했다.
3. KO/EN 홈에 JSON-LD가 각각 하나만 존재하고 JSON으로 파싱된다. 동일한 조직 `@id`, 언어별 이름과 다른 언어 이름, URL, 설명, 화면에 표시된 이메일·전화번호가 기대값과 일치한다. 홈의 H1은 공백을 포함한 전체 브랜드명과 일치한다.
4. 사이트맵의 14개 URL 모두 자신과 다른 언어, 같은 한국어 기본 페이지를 가리킨다.

이 후속 확인은 위의 로그·manifest 검토와 보고서 갱신만 수행했다. 제품 소스와 서버는 변경하지 않았고 브라우저도 다시 열지 않았다. 실제 운영 호스트의 색인·외부 Rich Results Test·Search Console·필드 성능은 앞의 공개 단계 범위로 남는다.

재실행: Node 22 환경의 `web/`에서 `npm run test -- tests/seo.spec.ts --workers=1`.

초기 증거 경로: `docs/checkpoints/evidence/identity-2026-09-08/seo-baseline/`.

- `rendered-home.json`, `ko-home.png`, `en-home.png`: 렌더링된 홈의 메타데이터·H1·스키마 결과.
- `routes-http.json` 및 14개 `ko|en-*.html`: 변경 전 전체 공개 응답.
- `robots.txt.txt`, `sitemap.xml.txt`, `root.txt`: 초기 응답 본문·헤더.
- `link-source-audit.json`: 링크 상태, 원본 OG 이미지 크기, 동결된 SEO 소스와 소비 콘텐츠의 SHA-256.
- `red-tests.log`, `red-results/`: 수정 필요성을 재현한 초기 실패 결과.

이 점검에서는 `AGENTS.md`, `web/AGENTS.md`, 현재 `web/DESIGN.md`, `seo-audit`, `schema`, TypeScript 지침을 적용했다. 사용자 지정 Node/npm/Next 스택과 프리뷰 정책을 우선했으며, 전역 디자인 규칙이나 새로운 공개 승인 절차를 도입하지 않았다.
