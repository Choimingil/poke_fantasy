# poke_fantasy

무기 종류에 따라 전직이 결정되는 그리드 전술 전투 프로토타입. 10x10 타일 맵(평지/숲/언덕/물/바위) 위에서 팀당 최대 4명이 이동과 스킬을 사용해 전투합니다.

핵심 시스템: 5속성(불/물/나무/강철/땅) 상성, 무기 종류별 6단계 전직 트리, 처치 경험치/레벨업, 인벤토리 장비/기술 로드아웃 세팅. 시야·이동·사거리·범위는 마름모(맨해튼) 거리 기준.

## 문서

- **[DESIGN.md](./DESIGN.md)** — 게임 기획·상세 사양의 정본(현재 상태 반영).
- **[BALANCE.md](./BALANCE.md)** — 시간순 패치 로그.
- **[CLAUDE.md](./CLAUDE.md)** — 작업 지침(문서 자동 갱신·배포 루틴). 변경 시 DESIGN.md와 BALANCE.md를 항상 함께 갱신한다.

## 개발

```bash
npm install
npm run dev       # 개발 서버
npm run test      # vitest 단위 테스트
npm run typecheck # tsc 타입체크
npm run lint      # oxlint
npm run unused    # knip 미사용 코드 검사
npm run verify    # 위 네 가지를 한 번에
```

## 구조

- `src/game/types.ts` — 캐릭터/무기/스킬/맵/타일 타입 정의
- `src/game/data/` — 무기(weapons), 스킬(skills), 전직(promotions), 로스터(roster), 맵(maps) 데이터
- `src/game/engine/` — 전투 엔진: 그리드/이동/시야(grid, vision), 속성 상성(elements), 데미지(damage), 상태이상(status), 턴 순서(turnOrder), 스킬 처리(skills/), AI(ai), 레벨업(leveling), 배틀 상태머신(battle), 인벤토리(inventory)
- `src/App.tsx` — 화면 라우터(홈/팀 선택 → 전투, 별도 인벤토리 → 결과)
- `src/components/` — 전투 화면(GridBattleScreen/BoardGrid/UnitToken), 상단 순서 바(InitiativeBar), 버프 칩(StatusChips), 인벤토리/팀 선택/결과 화면
