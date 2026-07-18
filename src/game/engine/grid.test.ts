import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { canEnterTile, chebyshev, computeReachableTiles, effectiveMove, lineCrossesRock, posKey } from './grid';

function makeMap(terrainOverrides: Record<string, BattleMap['tiles'][number][number]['terrain']> = {}): BattleMap {
  const tiles = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) row.push({ terrain: terrainOverrides[`${x},${y}`] ?? 'plain' });
    tiles.push(row);
  }
  return { width: 5, height: 5, tiles };
}

function makeUnit(overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id: overrides.id ?? 'unit',
    name: 'unit',
    baseStats: { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 10 },
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
  return { ...c, ...overrides };
}

describe('chebyshev', () => {
  it('대각선 이동도 1칸으로 계산한다', () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 2, y: 1 })).toBe(2);
  });
});

describe('computeReachableTiles', () => {
  it('평지에서는 예산 범위 내 마름모(맨해튼 거리) 타일에 도달 가능하다', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    const reachable = computeReachableTiles(map, unit, [unit], 2);
    const keys = new Set(reachable.map(posKey));
    expect(keys.has(posKey({ x: 4, y: 2 }))).toBe(true); // 직선 2칸 (맨해튼 2)
    expect(keys.has(posKey({ x: 3, y: 3 }))).toBe(true); // 대각선 1칸 (맨해튼 2, 비용 2)
    expect(keys.has(posKey({ x: 4, y: 4 }))).toBe(false); // 대각선 2칸 (맨해튼 4) — 사각형이면 도달했을 위치
    expect(keys.has(posKey({ x: 2, y: 2 }))).toBe(false); // 시작 타일은 제외
  });

  it('언덕은 진입 가능하지만 바위는 진입할 수 없다', () => {
    const map = makeMap({ '3,2': 'hill', '2,3': 'rock' });
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    expect(canEnterTile(map, unit, { x: 3, y: 2 }, [unit])).toBe(true); // 언덕 진입 가능
    expect(canEnterTile(map, unit, { x: 2, y: 3 }, [unit])).toBe(false); // 바위 진입 불가
  });

  it('물·언덕은 넘어서 이동할 수 없다(경로 종착)', () => {
    // (2,2) 시작 → 오른쪽으로 (3,2) 언덕, (4,2) 그 너머. 예산 3이어도 언덕 너머는 못 감.
    const map = makeMap({ '3,2': 'hill' });
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    const keys = new Set(computeReachableTiles(map, unit, [unit], 3).map(posKey));
    expect(keys.has(posKey({ x: 3, y: 2 }))).toBe(true); // 언덕까지는 도달
    expect(keys.has(posKey({ x: 4, y: 2 }))).toBe(false); // 언덕 너머는 불가
  });

  it('다른 유닛이 점유한 타일에는 진입할 수 없다', () => {
    const map = makeMap();
    const unit = makeUnit({ id: 'a', position: { x: 2, y: 2 } });
    const blocker = makeUnit({ id: 'b', position: { x: 3, y: 2 } });
    expect(canEnterTile(map, unit, { x: 3, y: 2 }, [unit, blocker])).toBe(false);
  });
});

describe('lineCrossesRock', () => {
  it('사이에 바위가 있으면 true, 없거나 인접이면 false', () => {
    const map = makeMap({ '3,2': 'rock' });
    expect(lineCrossesRock(map, { x: 2, y: 2 }, { x: 4, y: 2 })).toBe(true); // 사이에 바위
    expect(lineCrossesRock(map, { x: 2, y: 2 }, { x: 2, y: 5 })).toBe(false); // 다른 방향
    expect(lineCrossesRock(map, { x: 2, y: 2 }, { x: 3, y: 2 })).toBe(false); // 인접(사이 없음)
  });
});

describe('effectiveMove', () => {
  // 지구력 60 → 기본 이동력 (60/30)+1 = 3, 기존 rawMove:3 기준과 동일하게 맞춘 값.
  const MOVE3_STATS = { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 60 };

  it('legHit 상태는 이동력을 magnitude만큼 감소시킨다', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 }, baseStats: MOVE3_STATS });
    unit.statusEffects.push({ type: 'legHit', turnsRemaining: 3, magnitude: -0.5 });
    expect(effectiveMove(unit, map)).toBe(2.5);
  });

  it('물 타일은 이동력을 감소시키고 급류가 이를 상쇄한다', () => {
    const map = makeMap({ '2,2': 'water' });
    const onWater = makeUnit({ position: { x: 2, y: 2 }, baseStats: MOVE3_STATS });
    expect(effectiveMove(onWater, map)).toBe(2); // 물 -1

    onWater.statusEffects.push({ type: 'riverSurge', turnsRemaining: 3 });
    expect(effectiveMove(onWater, map)).toBe(3); // -1 +1

    const onLand = makeUnit({ position: { x: 0, y: 0 }, baseStats: MOVE3_STATS });
    onLand.statusEffects.push({ type: 'riverSurge', turnsRemaining: 3 });
    expect(effectiveMove(onLand, map)).toBe(3);
  });
});
