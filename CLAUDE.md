# poke_fantasy — 작업 지침 (Claude)

## 문서 자동 갱신 (사용자가 말하지 않아도 매번 수행)

코드/기획/밸런스/UI를 바꾸는 **모든 작업마다**, 사용자가 따로 요청하지 않아도 다음 두 문서를 함께 갱신한다:

- **`DESIGN.md`** — 게임 기획·상세 사양의 정본. 항상 "현재 상태"를 반영하도록 최신화(바뀐 규칙을 해당 섹션에 반영).
- **`BALANCE.md`** — 시간순 패치 로그. 이번 변경 요약 항목을 맨 앞(원칙 문단 아래)에 추가.

즉, 변경 → 코드 수정 → **DESIGN.md/BALANCE.md 갱신** → 검증/배포를 한 세트로 처리한다.

## 검증 · 배포 루틴

1. `git checkout package-lock.json` 후 스테이징(불필요한 lock 변경 방지).
2. `npm run verify`(typecheck·test·lint·knip) + `npm run build` 통과 확인.
3. 개발 브랜치 `claude/character-image-replacement-ejgklw`에 커밋.
4. master로 `--ff-only` 병합 후 두 브랜치 모두 push(Vercel 자동 배포).

## 표준 원칙

- 플레이어에게만 적용되는 규칙은 상대 AI에게도 자동으로 대칭 적용한다.
- 거리 체계: 시야·이동·사거리·기술 범위/반경은 마름모(맨해튼). 예외는 보호 반경(마름모 1칸)뿐 — 새 규칙 추가 시 이 원칙을 따른다.
- 스탯/밸런스/타일/시야 변경은 반드시 DESIGN.md와 BALANCE.md에 반영한다.
- 브라우저 스크린샷 도구(Playwright)는 미설치. 검증은 typecheck·vitest·build로 대체하고, 시각적 변경은 그 한계를 사용자에게 알린다.
