# Local SVG source library

참조 프로젝트의 SVG 2,402개를 원본 그대로 보관한다. 실제 사이트의 기본 UI 아이콘은 현재 설치된 **Lucide**다. 이 디렉터리는 `public/` 밖에 있으며, 앱에서 가져오지 않은 SVG가 페이지에 자동 포함되거나 공개 정적 URL로 제공되지는 않는다.

| 디렉터리 | 실제 출처 | SVG 수 | SVG 용량 | 원본 표현 |
| --- | --- | ---: | ---: | --- |
| `tailwind-svg/` | Heroicons, 아래 고정 커밋 | 324 | 154,241 bytes | 24×24, `fill="none"`, `stroke="currentColor"`, 선 두께 1.5 |
| `bootstrap-icons-svg/` | Bootstrap Icons v1.13.1 | 2,078 | 1,245,329 bytes | 16×16, `fill="currentColor"` |

`tailwind-svg`는 참조 폴더 이름을 보존한 것이다. 실제 자산은 Tailwind Labs의 **Heroicons 24px outline**이며, Tailwind CSS 설치 파일이 아니다.

## 출처와 라이선스

- Heroicons 전체 324개는 [공식 소스 커밋 `bd6c5c0d5acec14d116da611b4c5044fec1bb7dc`](https://github.com/tailwindlabs/heroicons/tree/bd6c5c0d5acec14d116da611b4c5044fec1bb7dc/optimized/24/outline)와 바이트가 일치한다. v2.2.0 이후 `gift.svg` 정렬 수정이 포함되어 있으므로 묶음을 v2.2.0 원본으로 표기하지 않는다. [공식 MIT 라이선스](https://github.com/tailwindlabs/heroicons/blob/bd6c5c0d5acec14d116da611b4c5044fec1bb7dc/LICENSE)를 [tailwind-svg/LICENSE](tailwind-svg/LICENSE)에 그대로 보관한다.
- Bootstrap Icons 전체 2,078개는 [v1.13.1의 공식 소스 커밋 `ce0e49dd063243118a115f17ad1fe1fe7576d552`](https://github.com/twbs/icons/tree/ce0e49dd063243118a115f17ad1fe1fe7576d552/icons)와 바이트가 일치한다. [공식 MIT 라이선스](https://github.com/twbs/icons/blob/ce0e49dd063243118a115f17ad1fe1fe7576d552/LICENSE)를 [bootstrap-icons-svg/LICENSE](bootstrap-icons-svg/LICENSE)에 그대로 보관한다.

## 화면에서 사용할 때

1. 탐색·메뉴·테마·버튼은 기존 Lucide 체계를 유지한다. 새 SVG가 필요한 화면에서 먼저 해당 파일을 선택하고, 그 화면의 아이콘 표현을 함께 확인한다.
2. 선택한 원본만 컴포넌트의 inline SVG로 옮기거나 필요한 공개 자산으로 복사한다. 전체 묶음의 자동 import, 아이콘 폰트, 런타임 로더는 추가하지 않는다.
3. `viewBox`, path, 원래의 채움/선 방식을 유지한다. Bootstrap 채움 아이콘에 Lucide 선 두께를 일괄 적용하거나 16×16 좌표를 24×24로 바꾸지 않는다. 크기와 색은 적용 화면의 공통 토큰에 맞춘다. `currentColor`로 주변 글자색을 사용하려면 inline SVG여야 하며, 외부 `<img>`에는 부모의 글자색이 전파되지 않는다.
4. React로 옮길 때 필요한 속성명만 JSX 표기로 바꾼다. 장식 아이콘은 `aria-hidden="true"`, `focusable="false"`로 두고, 아이콘만 있는 버튼은 버튼에 동작 이름을 제공한다. 의미를 단독 전달하는 SVG는 접근 가능한 이름을 제공한다.
5. 원본 파일과 LICENSE는 함께 보존한다. 원본 변경이 필요하면 사용처의 별도 복사본에서 변경하고 출처를 남긴다.

## 검증

[verification.json](verification.json)에 파일 수, 바이트 수, 정렬된 파일별 SHA-256 목록의 합성 해시, 공식 소스 일치 수, XML 검사 결과를 기록했다. 복사 원본은 `/Users/max/saturdayblock-web/public/` 아래 두 동명 디렉터리다. 2026-09-08 검사에서 2,402개 모두 XML 파싱에 성공했고 스크립트·이벤트 핸들러·외부 참조·`foreignObject`·DTD/ENTITY 선언은 발견되지 않았다.

저장된 원본의 무결성은 저장소 루트에서 다음으로 다시 확인할 수 있다. 네트워크나 패키지 설치가 필요하지 않다.

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json
root = Path('web/assets/icons')
for collection in json.loads((root / 'verification.json').read_text())['collections']:
    folder = root / collection['collection']
    files = sorted(folder.glob('*.svg'))
    inventory = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in files)
    assert len(files) == collection['localFiles']
    assert sum(p.stat().st_size for p in files) == collection['localBytes']
    assert hashlib.sha256(inventory.encode()).hexdigest() == collection['inventorySha256']
    assert hashlib.sha256((folder / 'LICENSE').read_bytes()).hexdigest() == collection['licenseSha256']
    print(collection['collection'], len(files), 'verified')
PY
```
