# poke_fantasy

무기 종류에 따라 전직이 결정되는 그리드 전술 전투 프로토타입. 10x10 타일 맵(평지/숲/언덕/물) 위에서 팀당 최대 4명이 이동과 스킬을 사용해 전투합니다.

핵심 시스템: 5속성(불/물/나무/강철/땅) 상성, 무기 종류별(검/둔기/활/지팡이/마법서/방패) 6단계 전직 트리, 처치 경험치/레벨업, 인벤토리 장비 교체. 창/석궁/단검/투척무기는 타입 정의만 예약되어 있고 아직 구현되지 않았습니다.

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
- `src/App.tsx` — 화면 라우터(팀 선택 → 인벤토리 → 그리드 전투 → 결과)
