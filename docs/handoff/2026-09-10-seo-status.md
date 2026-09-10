# 2026-09-10 SEO 점검

대상은 `web/`의 로컬 개편 사이트이며, 배포된 기존 사이트의 검색 순위나 Search Console 데이터는 확인하지 않았다. 검사 빌드: `iHmBnsdQz9rZI3AF1BTdU`.

## 확인 결과

실제 Chrome으로 사이트맵 124개 URL과 한국어·영어 활동 기록 2페이지를 포함한 126개 페이지를 확인했다. 모두 200 응답이며 제목, 설명, canonical, 이미지 alt 속성 누락과 중복 H1은 없었다. 각 페이지의 canonical 및 ko/en/x-default 연결, 페이지네이션의 독립 canonical이 정상이다. 없는 글과 지원하지 않는 언어 경로는 404를 반환한다.

이번 변경으로 마크다운 본문을 그대로 메타 설명에 넣지 않고 일반 텍스트로 추출한다. 설명은 최대 200 Unicode 코드포인트와 생략 기호 한 글자다. UTF-16 길이 검사에서 200을 넘는 68건도 실제로는 이 상한 이내이며, 설명에 본문 전체가 들어가지는 않는다. 구글이 정한 고정 설명 길이는 없고 실제 검색 설명은 다르게 구성될 수 있다. [Google 설명 문서](https://developers.google.com/search/docs/appearance/snippet)

## 관리자 검색 제외

관리자 공통 레이아웃에 `noindex, nofollow`를 고정했다. `/admin`, `/ko/admin`, `/en/admin` 하위 경로와 `/api/admin`에는 같은 내용의 `X-Robots-Tag` 응답 헤더도 적용한다. 관리자 URL은 사이트맵에 포함하지 않는다. 로그인과 API 권한 검사는 별도로 유지한다.

현재 검토 빌드는 공개 페이지까지 `noindex`이며 robots.txt도 전체 수집을 막는다. 공개 배포 시에는 공개 페이지의 색인 허용을 별도로 준비해야 한다. 관리자 URL의 `noindex`를 검색 로봇이 읽으려면 해당 URL을 robots.txt로 막지 않아야 한다. robots.txt 차단만으로 검색 결과에서 URL이 사라지는 것은 아니다. [Google noindex 문서](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

이미 검색에 나타나는 기존 관리자 URL은 이번 로컬 변경만으로 없어지지 않는다. 실제 배포된 응답에 검색 제외가 반영된 후 재수집을 기다리거나, 빠른 제거가 필요하면 소유자의 Search Console에서 임시 삭제를 요청하고 영구 제외 설정도 유지해야 한다. 이번 작업에서 배포나 삭제 요청은 실행하지 않았다. [Google 삭제 문서](https://developers.google.com/search/docs/crawling-indexing/remove-information)

## 공개 배포 전 보완할 항목

- 센터 주소·운영시간을 포함한 적절한 LocalBusiness 구조화 데이터와 행사별 Event 데이터를 검토한다. 현재는 홈의 Organization만 있다. 검색 결과 확장 표시가 보장되는 것은 아니다. [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Event](https://developers.google.com/search/docs/appearance/structured-data/event)
- 활동 기록과 행사 상세의 공유 이미지를 각 글의 대표 사진으로 연결한다. 현재는 모든 페이지가 동일한 라운지 사진을 사용한다.
- 가져온 행사 14개와 하이라이트 40개에는 아직 직접 지정한 슬러그가 없다. 관리자에서 슬러그를 정하면 기존 번호 URL은 새 주소로 연결된다. 숫자 URL 자체가 자동 감점 요인은 아니지만 설명적인 주소가 읽기 편하다. [URL 구조](https://developers.google.com/search/docs/crawling-indexing/url-structure)
- Search Console, 네이버 서치어드바이저, 실제 유입·검색 순위와 현장 Core Web Vitals를 공개 배포 후 확인한다. 현재 자료만으로 점수를 만들거나 성과를 보장하지 않는다.

언어는 명시적인 `/ko`·`/en` 주소, 저장한 선택, 브라우저 언어, 한국어 기본값 순으로 적용한다. 접속 국가로 언어를 강제하지 않는다.

로컬 증거: `web/.local/seo-status-20260910/audit.json`, `audit-final.log`; 통합 검사와 전체 화면 증거는 `web/.local/ui-refinements-20260910/`.
