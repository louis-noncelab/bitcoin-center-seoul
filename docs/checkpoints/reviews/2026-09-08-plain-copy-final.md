# 2026-09-08 문구 최종 교정

상태: 소스 교정·대상 파일 ESLint·변경 범위 검증 완료. 새 빌드와 화면 검증은 총괄이 수행한다.

## 검수 범위

- `bcs-voice/SKILL.md` 전체 985행을 1–250, 251–500, 501–750, 751–1020행으로 나눠 다시 읽었다.
- 현재 `center.ts`의 한국어·영어 전체와 `home.tsx`, `section-content.tsx`, 헤더·푸터의 실제 문구 조합을 읽었다.
- 이미 승인된 UI 문구의 후속 교정이다. 새로운 캠페인 문구, 문체 변경, 운영 약속은 만들지 않았다.
- 수정 파일은 `web/src/content/center.ts`와 이 문서뿐이다. 센터명과 제목, 표시상 줄 나눔, SEO 생성부, 스타일은 다른 담당자의 소유다.
- 검수 시작 시 총괄이 제공한 기존 빌드: `AFKk_t8vqWjTq4n4S-G_D`. 아래 수정은 이 빌드 이후 소스 변경이므로 해당 빌드의 화면 검증 결과를 재사용하지 않는다.

## 수정한 문장 5개

| 필드 | 이전 | 이후 | 이유 |
| --- | --- | --- | --- |
| `ko.programs.categories[1].description` | 비트코인 입문, 백서와 프로토콜, 셀프 커스터디, 개발자 과정을 다룹니다. | 비트코인 입문, 백서와 프로토콜, 셀프 커스터디, 개발 강의를 엽니다. | 강의가 다시 ‘과정을 다룬다’는 겹친 표현을 정리했다. 기존 강의 주제는 유지했다. |
| `en.hero.introduction` | The center hosts Bitcoin classes and meetups. Visitors can browse books and art and try hardware wallets. | The center hosts Bitcoin classes and meetups. Visitors can browse the books, see the artwork and try hardware wallets. | 책·작품·기기에 맞는 동사를 사용했다. |
| `en.programs.introduction` | Courses cover Bitcoin fundamentals through development. Check the event notices for the schedule. | Courses cover Bitcoin basics and development. Check the event notices for the schedule. | `fundamentals through development`의 어색한 연결을 고쳤다. 일정 확인 방법은 유지했다. |
| `en.experience.introduction` | Browse Bitcoin books and art, or try hardware wallets in the demo area. | Bitcoin books and art are on display. You can try hardware wallets in the demo area. | 전시와 체험 내용을 직접 안내하고 불필요한 양자 선택 표현을 뺐다. |
| `en.experience.areas[1].description` | The demo area has several hardware wallets and instructions for test use. | The demo area has several hardware wallets and instructions for testing them. | `test use`라는 직역 조합을 고쳤다. 여러 지갑과 테스트 안내가 있다는 내용은 유지했다. |

그 외 문장은 기능·전시물·강의·방문 정보를 이미 구체적으로 설명하고 있어 유지했다. `센터 한쪽`, `마포`/`Mapo`, 과장된 커뮤니티·금융 홍보 문구는 현재 콘텐츠에 없다. 억지로 친근한 해요체를 추가하지 않았다.

## 사실과 구조 보존

수정 전후 콘텐츠 객체를 현재 TypeScript로 각각 읽어 말단 필드와 값 전체를 비교했다.

- 한영 각각 91개 필드 경로가 동일하다. 총 182개 필드 중 지정한 설명 5개만 바뀌었고 177개는 값까지 동일하다.
- 센터명·모든 제목·내비게이션·카테고리·journal ID·기존 기록 항목은 동일하다.
- `visit` 객체 전체가 수정 전과 깊은 비교에서 동일하다. 주소, 운영시간, 공휴일 휴무, 대관 중 이용 제한, 지하철 출구·도보 시간, 연락처, 지도 링크를 바꾸지 않았다.
- 모든 `href`가 동일하다. 기존 `/walletExperence` 주소도 유지했다.
- 새로운 행사·날짜·가격·상품·재고·서비스·직원 응대·자산 취급 약속은 추가하지 않았다.

## 검증과 소스 확정

- 변경 범위 비교: exit 0.
- 한영 필드 경로 비교와 `visit` 전체 비교: exit 0.
- `마포`/`Mapo` 잔여 문자열 검사: 0건.
- `web/`에서 `./node_modules/.bin/eslint src/content/center.ts`: exit 0.
- 문장 편집만 수행했으므로 새 테스트나 실행 로직을 추가하지 않았다. 브라우저·빌드·서버는 담당 범위에 따라 실행하지 않았다.

`center.ts` SHA256:

- 수정 전: `4a2c52d7200b1c1cca8556666adb688776c05e19fe61270c56e9d2b81c331965`
- 확정 소스: `03cb04f46ac4e6fc82bab392fb3ad2b3d63cc1770f2392ca715c11b4288f7a3c`

총괄과 SEO 담당자에게 확정 소스와 제목·연락처 구조 불변을 전달했다. 이 교정 담당자는 추가 소스 수정을 하지 않는다.
