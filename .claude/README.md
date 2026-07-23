# .claude — 리포 내장 스킬/커맨드/에이전트

Claude Code on the web(원격 클라우드) 세션은 환경변수 `SKIP_PLUGIN_MARKETPLACE=true`
때문에 `settings.json`의 외부 GitHub 마켓플레이스 플러그인을 자동 설치하지 않는다.
매 세션 자동으로 쓰기 위해, 그 플러그인들의 스킬/커맨드/에이전트를 리포에 직접 내장했다.
리포가 클론될 때 함께 올라와 세션 시작 시 로드된다.

## 출처 (원본 플러그인)

| 원본 | 내장 위치 | 비고 |
|------|-----------|------|
| `forrestchang/andrej-karpathy-skills` | `skills/karpathy-guidelines` | 순수 스킬 |
| `nextlevelbuilder/ui-ux-pro-max-skill` | `skills/{design,design-system,brand,slides,banner-design,ui-ux-pro-max,ui-styling}` | 순수 스킬. `ui-ux-pro-max/SKILL.md`의 스크립트 경로는 `${CLAUDE_PROJECT_DIR}` 기준으로 수정함 |
| `JuliusBrussee/caveman` | `skills/caveman*`, `skills/cavecrew`, `agents/cavecrew-*`, `commands/caveman*` | **온디맨드**. 라이프사이클 훅은 배선하지 않음(기본 모드 `full`이 매 세션 강제 전환되는 것을 방지). `/caveman`으로 필요할 때만 켠다. 보조 스크립트는 `vendor/caveman/src/hooks/` |
| `thepushkarp/handoff` | `commands/{create,resume}`, `vendor/handoff/scripts/` | **상시 훅**. `settings.json`의 PreCompact/SessionStart/UserPromptSubmit/Stop에 배선. 훅 스크립트는 `${CLAUDE_PLUGIN_ROOT}`를 vendor 경로로 지정해 호출 |

## 갱신 방법

원본 플러그인이 업데이트되면 아래로 다시 받아 해당 폴더를 덮어쓰면 된다.

```
claude plugin marketplace add <owner/repo>
claude plugin install <plugin@marketplace>
# 이후 ~/.claude/plugins/cache/... 의 skills/commands/agents를 이 폴더로 복사
```
