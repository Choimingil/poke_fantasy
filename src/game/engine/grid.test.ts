import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { canEnterTile, chebyshev, computeReachableTiles, effectiveMove, posKey } from './grid';

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
    baseStats: { hp: 100, attack: 10, magicAttack: 10, defense: 10, speed: 10 },
    rawMove: 2,
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
  it('평지에서는 예산 범위 내 모든 타일(체비셰프 거리)에 도달 가능하다', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 0, y: 0 } });
    const reachable = computeReachableTiles(map, unit, [unit], 2);
    const keys = new Set(reachable.map(posKey));
    expect(keys.has(posKey({ x: 2, y: 0 }))).toBe(true); // 2칸 거리
    expect(keys.has(posKey({ x: 4, y: 4 }))).toBe(false); // 2칸 초과(체비셰프 거리 4)
    expect(keys.has(posKey({ x: 0, y: 0 }))).toBe(false); // 시작 타일은 제외
  });

  it('언덕 타일은 등반 상태 없이는 진입할 수 없다', () => {
    const map = makeMap({ '3,2': 'hill' });
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    expect(canEnterTile(map, unit, { x: 3, y: 2 }, [unit])).toBe(false);

    unit.statusEffects.push({ type: 'climbing', turnsRemaining: 3 });
    expect(canEnterTile(map, unit, { x: 3, y: 2 }, [unit])).toBe(true);
  });

  it('다른 유닛이 점유한 타일에는 진입할 수 없다', () => {
    const map = makeMap();
    const unit = makeUnit({ id: 'a', position: { x: 2, y: 2 } });
    const blocker = makeUnit({ id: 'b', position: { x: 3, y: 2 } });
    expect(canEnterTile(map, unit, { x: 3, y: 2 }, [unit, blocker])).toBe(false);
  });
});

describe('effectiveMove', () => {
  it('legHit 상태는 이동력을 magnitude만큼 감소시킨다', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 }, rawMove: 3 });
    unit.statusEffects.push({ type: 'legHit', turnsRemaining: 3, magnitude: -0.5 });
    expect(effectiveMove(unit, map)).toBe(2.5);
  });

  it('급류 상태는 물 타일 위에 있을 때만 이동력 +1', () => {
    const map = makeMap({ '2,2': 'water' });
    const onWater = makeUnit({ position: { x: 2, y: 2 }, rawMove: 3 });
    onWater.statusEffects.push({ type: 'riverSurge', turnsRemaining: 3 });
    expect(effectiveMove(onWater, map)).toBe(4);

    const onLand = makeUnit({ position: { x: 0, y: 0 }, rawMove: 3 });
    onLand.statusEffects.push({ type: 'riverSurge', turnsRemaining: 3 });
    expect(effectiveMove(onLand, map)).toBe(3);
  });
});
