# .gitignore 정리 — 2026-09-08

작업 브랜치: `redesign/center-web`. 커밋 대상에서 로컬 산출물을 제외하고 기존 세션 내보내기를 보존했다.

## 변경 범위

- 루트 `.gitignore`: `/.codegraph`, `/.claude/settings.local.json`, `/.local/`, `/OmO-session-*.html`, `/docs/checkpoints/evidence/` 추가.
- `.codegraph`는 로컬 OmO 인덱스를 가리키는 심볼릭 링크다. 디렉터리 전용 패턴이 되지 않도록 끝의 `/`를 생략했다.
- `web/.gitignore`의 Next.js, Playwright, TypeScript 증분 빌드, 환경변수 규칙은 이미 적용되어 있어 그대로 사용한다.
- HTML·PNG·JSON 전체를 숨기는 확장자 규칙은 추가하지 않았다. 소스, 정적 자산, 테스트, 검토 문서는 Git에 추가할 수 있다.

## 세션 파일 이동 영수증

- 원래 위치: `OmO-session-2026-09-08T08-16-29-843Z_01a08017-0e93-7fb6-a1ed-93a427df99eb.html`
- 보관 위치: `.local/session-exports/OmO-session-2026-09-08T08-16-29-843Z_01a08017-0e93-7fb6-a1ed-93a427df99eb.html`
- 크기: **1,285,423 bytes**
- 이동 전후 SHA-256: `b5a79c7e9bd7b66b94e51cc781b0c2dd9191b8becb14476f7263711a4e28177c`
- 기존 파일이 변경되었거나 보관 위치에 파일이 있으면 중단하도록 확인한 뒤 이동했다. 원래 위치에는 파일이 남지 않았다.

## 검증

`git check-ignore --quiet --no-index`로 **31개 제외 경로와 64개 추가 가능 경로**를 검증했다. 후자는 당시의 모든 `web/src/`, `web/tests/`, evidence 밖의 Markdown 문서를 포함한다. `git diff --check -- .gitignore web/.gitignore`도 통과했다.

| 대상 | 결과 |
| --- | --- |
| 로컬 인덱스·설정·세션 보관·원본 QA 산출물 | 루트 `.gitignore` 규칙으로 제외 |
| `web/.next/`, `web/out/`, Playwright 보고서·결과, `*.tsbuildinfo` | 기존 `web/.gitignore` 규칙으로 제외 |
| 의존성·빌드·로그·환경변수·PEM 키·DB·런타임 업로드 | 기존 규칙으로 제외 |
| `.env.example`, 루트와 web의 `package-lock.json`, 앱 소스·테스트·검토 문서 | Git에 추가 가능 |
| `.github/workflows/deploy.yml.disabled` | Git에 추가 가능, 내용 해시 보존 |

비활성 배포 파일 SHA-256: `f8fd129d1b8d7deaba2198518fb7b8b84cf2b4ade001f184825d9f2f5844853d`.

주요 규칙은 저장소 루트에서 다시 확인할 수 있다. 경로 탐색용 문자열이며 파일을 만들지 않는다.

```sh
git check-ignore -v --no-index .codegraph .claude/settings.local.json .local/session-exports/saved.html OmO-session-example.html docs/checkpoints/evidence/report.json web/.next/cache/example web/playwright-report/index.html web/test-results/trace.zip web/tsconfig.tsbuildinfo
```

## 로컬 자료와 과거 잔여 파일

`docs/checkpoints/evidence/`는 스크린샷, Lighthouse HTML·JSON, 원시 로그, 임시 감사 스크립트와 컴파일 결과, 이전 실행 자료의 **로컬 보관 위치**다. 최초 조사에서 이곳의 미추적 커밋 후보는 341개, 180,080,532 bytes였다(이미 무시되던 로그 제외). 병행 QA로 수량은 달라질 수 있다. 실제 폴더와 자료는 그대로 보존했고, 테스트가 계속 같은 위치에 결과를 쓸 수 있다. 재실행 가능한 테스트는 `web/tests/`, 사람의 검토 문서는 `docs/checkpoints/reviews/`에 두며 Git 대상에서 제외하지 않는다.

이미 추적 중인 과거 파일 `events.db`와 `bun.lockb`는 수정하거나 제거하지 않았다. `.gitignore`는 이미 추적 중인 파일을 숨기지 않는다. 런타임 `data/`, 업로드, 의존성, 활성 미리보기의 `.next/`도 정리 대상으로 삭제하지 않았다.
