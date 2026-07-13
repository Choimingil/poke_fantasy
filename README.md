# poke_fantasy

포켓몬식 전투 구조 + RPG 전직 시스템을 결합한 게임 프로토타입. 동양(무협) vs 서양(중세) 두 진영의 전사/법사/격수 직업이 전사(근거리) > 격수(원거리) > 법사(마법) > 전사 상성으로 맞붙는 턴제 전투를 다룹니다.

현재는 전투 코어 시스템(직업/스킬/무기 데이터, 데미지 계산, 턴 순서, 상태이상, 무기 교체)까지 구현되어 있고, 던전 탐색·전직 트리·레이드 등은 아직 없습니다.

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

- `src/game/types.ts` — 직업/스킬/무기/캐릭터 타입 정의
- `src/game/data/` — 직업(jobs), 스킬(skills), 무기(weapons), 샘플 로스터(roster) 데이터
- `src/game/engine/` — 전투 엔진(데미지 계산, 턴 순서, 상태이상, 무기 부가효과, AI, 배틀 상태머신)
- `src/App.tsx` — 전투 엔진을 테스트해볼 수 있는 간단한 UI
