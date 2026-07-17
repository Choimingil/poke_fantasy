import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { effectiveSight, isVisibleTo, FOREST_CONCEALMENT_RADIUS } from './vision';

function makeMap(terrainOverrides: Record<string, BattleMap['tiles'][number][number]['terrain']> = {}): BattleMap {
  const tiles = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 8; x++) row.push({ terrain: terrainOverrides[`${x},${y}`] ?? 'plain' });
    tiles.push(row);
  }
  return { width: 8, height: 8, tiles };
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

describe('effectiveSight', () => {
  it('천리안 상태면 시야가 +1 된다', () => {
    const unit = makeUnit({ sight: 3 });
    expect(effectiveSight(unit)).toBe(3);
    unit.statusEffects.push({ type: 'farSight', turnsRemaining: 3 });
    expect(effectiveSight(unit)).toBe(4);
  });

  it('밤에는 시야 -2, 비/눈은 추가 -1', () => {
    const unit = makeUnit({ sight: 5 });
    expect(effectiveSight(unit, { time: 'night' })).toBe(3); // 5-2
    expect(effectiveSight(unit, { time: 'day', weather: 'rain' })).toBe(4); // 5-1
    expect(effectiveSight(unit, { time: 'night', weather: 'snow' })).toBe(2); // 5-2-1
    expect(effectiveSight(unit, { time: 'day', weather: 'clear' })).toBe(5);
  });

  it('시야는 최소 1 이하로 내려가지 않는다', () => {
    const unit = makeUnit({ sight: 2 });
    expect(effectiveSight(unit, { time: 'night', weather: 'rain' })).toBe(1); // 2-3 -> 1
  });
});

describe('isVisibleTo', () => {
  it('시야 범위를 벗어나면 보이지 않는다', () => {
    const map = makeMap();
    const viewer = makeUnit({ id: 'v', position: { x: 0, y: 0 }, sight: 2 });
    const target = makeUnit({ id: 't', position: { x: 5, y: 5 } });
    expect(isVisibleTo(viewer, target, map)).toBe(false);
  });

  it('숲 타일의 대상은 투시 없이는 근접 반경 밖에서 보이지 않는다', () => {
    const map = makeMap({ '3,0': 'forest' });
    const viewer = makeUnit({ id: 'v', position: { x: 0, y: 0 }, sight: 5 });
    const target = makeUnit({ id: 't', position: { x: 3, y: 0 } });
    expect(isVisibleTo(viewer, target, map)).toBe(false); // 거리 3 > 은신 반경

    const closeViewer = makeUnit({ id: 'v2', position: { x: 2, y: 0 }, sight: 5 });
    expect(isVisibleTo(closeViewer, target, map)).toBe(true); // 거리 1 <= FOREST_CONCEALMENT_RADIUS

    viewer.statusEffects.push({ type: 'forestVision', turnsRemaining: 3 });
    expect(isVisibleTo(viewer, target, map)).toBe(true); // 투시 보유 시 숲 은신 무시

    expect(FOREST_CONCEALMENT_RADIUS).toBeGreaterThan(0);
  });
});
