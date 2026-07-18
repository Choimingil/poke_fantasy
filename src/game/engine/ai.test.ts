import { describe, expect, it } from 'vitest';
import type { BattleMap } from '../types';
import { createCharacter } from './characterFactory';
import { pickAiAction } from './ai';

function makeMap(width: number, height: number): BattleMap {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) row.push({ terrain: 'plain' as const });
    tiles.push(row);
  }
  return { width, height, tiles };
}

function makeUnit(id: string, position: { x: number; y: number }) {
  const c = createCharacter({
    id,
    name: id,
    baseStats: { hp: 100, attack: 20, magicAttack: 10, speed: 10, endurance: 60 }, // raw move ~3
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
  c.position = position;
  return c;
}

describe('pickAiAction - 시야 밖 이동', () => {
  it('시야 안에 적이 없고 목격 기록도 없으면 맵 중앙을 향해 이동한다', () => {
    const map = makeMap(10, 10);
    const unit = makeUnit('a', { x: 0, y: 0 });
    const enemy = makeUnit('b', { x: 9, y: 9 }); // sight 3보다 훨씬 멀어 안 보임
    const action = pickAiAction(unit, [unit], [enemy], map);
    expect(action.skillId).toBeUndefined();
    expect(action.moveTo).toBeDefined();
    // 맵 중앙(5,5) 방향으로, 시작점보다 중앙에 더 가까워야 한다
    const distBefore = Math.abs(unit.position.x - 5) + Math.abs(unit.position.y - 5);
    const distAfter = Math.abs(action.moveTo!.x - 5) + Math.abs(action.moveTo!.y - 5);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('시야 밖이어도 이전에 확인한 적의 마지막 위치를 향해 이동한다', () => {
    const map = makeMap(10, 10);
    const unit = makeUnit('a', { x: 0, y: 0 });
    const enemy = makeUnit('b', { x: 9, y: 9 }); // 지금은 시야 밖
    const knownPositions = { b: { x: 4, y: 0 } }; // 예전에 (4,0)에서 목격
    const action = pickAiAction(unit, [unit], [enemy], map, 'clear', 'day', knownPositions);
    expect(action.skillId).toBeUndefined();
    expect(action.moveTo).toBeDefined();
    const distBefore = Math.abs(unit.position.x - 4) + Math.abs(unit.position.y - 0);
    const distAfter = Math.abs(action.moveTo!.x - 4) + Math.abs(action.moveTo!.y - 0);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('시야 안에 적이 있으면 예상 위치가 아니라 실제 위치로 이동/공격한다', () => {
    const map = makeMap(10, 10);
    const unit = makeUnit('a', { x: 0, y: 0 });
    const enemy = makeUnit('b', { x: 1, y: 0 }); // 사거리/시야 안
    const action = pickAiAction(unit, [unit], [enemy], map);
    expect(action.skillId).toBeDefined();
    expect(action.targetId).toBe('b');
  });
});
