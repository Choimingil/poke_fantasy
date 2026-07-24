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

  it('물은 넘어서 이동할 수 없지만 언덕은 통과할 수 있다', () => {
    const water = makeMap({ '3,2': 'water' });
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    const wk = new Set(computeReachableTiles(water, unit, [unit], 3).map(posKey));
    expect(wk.has(posKey({ x: 3, y: 2 }))).toBe(true); // 물까지는 도달(비용2)
    expect(wk.has(posKey({ x: 4, y: 2 }))).toBe(false); // 물 너머는 불가

    const hill = makeMap({ '3,2': 'hill' });
    const hk = new Set(computeReachableTiles(hill, unit, [unit], 3).map(posKey));
    expect(hk.has(posKey({ x: 4, y: 2 }))).toBe(true); // 언덕은 통과 가능(고지대)
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
  // 지구력 60 → 기본 이동력 (60/30)+1 = 3.
  const MOVE3_STATS = { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 60 };

  it('legHit 상태는 이동력을 magnitude만큼 감소시킨다', () => {
    const unit = makeUnit({ position: { x: 2, y: 2 }, baseStats: MOVE3_STATS });
    unit.statusEffects.push({ type: 'legHit', turnsRemaining: 3, magnitude: -0.5 });
    expect(effectiveMove(unit)).toBe(2.5);
  });

  it('둔화(moveDown) 상태는 magnitude만큼 이동력을 감소시킨다', () => {
    const unit = makeUnit({ baseStats: MOVE3_STATS });
    unit.statusEffects.push({ type: 'moveDown', turnsRemaining: 2, magnitude: 2 });
    expect(effectiveMove(unit)).toBe(1);
  });

  it('effectiveMove는 지형·날씨의 영향을 받지 않는다(진입 비용으로 처리)', () => {
    const unit = makeUnit({ baseStats: MOVE3_STATS });
    expect(effectiveMove(unit)).toBe(3);
  });
});

describe('computeReachableTiles - 지형·날씨 진입 비용', () => {
  it('물 진입 비용은 2, 급류는 1로 줄인다', () => {
    const map = makeMap({ '3,2': 'water' });
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    expect(new Set(computeReachableTiles(map, unit, [unit], 2).map(posKey)).has(posKey({ x: 3, y: 2 }))).toBe(true); // 비용2, 예산2
    // 급류: 물 비용 1 → 예산 1로도 도달
    unit.statusEffects.push({ type: 'riverSurge', turnsRemaining: 3 });
    expect(new Set(computeReachableTiles(map, unit, [unit], 1).map(posKey)).has(posKey({ x: 3, y: 2 }))).toBe(true);
  });

  it('눈 날씨는 평지 진입 비용을 2로 올린다', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    expect(new Set(computeReachableTiles(map, unit, [unit], 2, 'clear').map(posKey)).has(posKey({ x: 4, y: 2 }))).toBe(true);
    const snow = new Set(computeReachableTiles(map, unit, [unit], 2, 'snow').map(posKey));
    expect(snow.has(posKey({ x: 4, y: 2 }))).toBe(false); // 눈: 평지 비용2 → 2칸엔 예산4 필요
    expect(snow.has(posKey({ x: 3, y: 2 }))).toBe(true); // 1칸(비용2)은 가능
  });

  it('예산이 부족해도 인접한 진입 가능 타일로는 이동할 수 있다(최소 1칸)', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    const reachable = computeReachableTiles(map, unit, [unit], 0); // 예산 0
    expect(reachable.length).toBeGreaterThanOrEqual(1);
  });

  it('예산 부족 시엔 진입 가능한 사방 인접 타일을 모두 후보로 준다(한 방향만 아님)', () => {
    const map = makeMap();
    const unit = makeUnit({ position: { x: 2, y: 2 } });
    // 눈 속 평지는 진입 비용 2 → 예산 1로는 어떤 타일도 도달 불가 → 폴백 발동.
    const snow = new Set(computeReachableTiles(map, unit, [unit], 1, 'snow').map(posKey));
    // 사방(위·아래·좌·우) 모두 진입 가능해야 한다 — 앞으로만 이동하는 버그 방지.
    expect(snow.has(posKey({ x: 2, y: 1 }))).toBe(true);
    expect(snow.has(posKey({ x: 2, y: 3 }))).toBe(true);
    expect(snow.has(posKey({ x: 1, y: 2 }))).toBe(true);
    expect(snow.has(posKey({ x: 3, y: 2 }))).toBe(true);
  });
});
