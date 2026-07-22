import { describe, expect, it } from 'vitest';
import type { AiBehavior, BattleMap, Character, GridPos } from '../types';
import { createCharacter } from './characterFactory';
import { pickAiAction } from './ai';
import { manhattan } from './grid';

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

function behaviorUnit(id: string, weaponTemplateId: string, pos: GridPos, behavior: AiBehavior, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id, name: id, baseStats: { hp: 40, attack: 200, magicAttack: 200, speed: 20, endurance: 60 },
    sight: 20, starterWeaponTemplateId: weaponTemplateId,
  });
  return { ...c, position: pos, side: 'A', aiBehavior: behavior, ...overrides };
}

describe('적 AI 행동 유형(§39, 4종)', () => {
  const map = makeMap(10, 10);
  const d = (a: GridPos, b: GridPos) => manhattan(a, b);

  it('공격형: 보이는 적에게 접근한다', () => {
    const me = behaviorUnit('me', 'sword_short', { x: 0, y: 0 }, 'aggressive');
    const enemy = behaviorUnit('e', 'sword_short', { x: 6, y: 0 }, 'aggressive', { side: 'B' });
    const action = pickAiAction(me, [me], [enemy], map);
    expect(action.moveTo).toBeDefined();
    expect(d(action.moveTo!, enemy.position)).toBeLessThan(d(me.position, enemy.position));
  });

  it('견제형: 공격은 유지하되 적과 거리를 벌린다(카이팅)', () => {
    const enemy = behaviorUnit('e', 'sword_short', { x: 4, y: 0 }, 'aggressive', { side: 'B' });
    const skirm = behaviorUnit('sk', 'bow_short', { x: 3, y: 0 }, 'skirmisher');
    const aggro = behaviorUnit('ag', 'bow_short', { x: 3, y: 0 }, 'aggressive');
    const skAction = pickAiAction(skirm, [skirm], [enemy], map);
    const agAction = pickAiAction(aggro, [aggro], [enemy], map);
    const skPos = skAction.moveTo ?? skirm.position;
    const agPos = agAction.moveTo ?? aggro.position;
    expect(d(skPos, enemy.position)).toBeGreaterThan(d(agPos, enemy.position));
    expect(skAction.skillId).toBeDefined();
  });

  it('수비형: 멀리 있는 적에게 달려들지 않는다', () => {
    const ally = behaviorUnit('a', 'sword_short', { x: 1, y: 0 }, 'defensive');
    const enemy = behaviorUnit('e', 'sword_short', { x: 8, y: 0 }, 'aggressive', { side: 'B' });
    const def = behaviorUnit('d', 'blunt_mace', { x: 0, y: 0 }, 'defensive');
    const aggro = behaviorUnit('d2', 'blunt_mace', { x: 0, y: 0 }, 'aggressive');
    const defPos = pickAiAction(def, [def, ally], [enemy], map).moveTo ?? def.position;
    const agPos = pickAiAction(aggro, [aggro, ally], [enemy], map).moveTo ?? aggro.position;
    expect(d(defPos, enemy.position)).toBeGreaterThan(d(agPos, enemy.position));
  });

  it('수비형: 적이 위협 반경 안이면 교전한다', () => {
    const enemy = behaviorUnit('e', 'sword_short', { x: 3, y: 0 }, 'aggressive', { side: 'B' });
    const def = behaviorUnit('d', 'blunt_mace', { x: 0, y: 0 }, 'defensive');
    const action = pickAiAction(def, [def], [enemy], map);
    expect(action.moveTo).toBeDefined();
    expect(d(action.moveTo!, enemy.position)).toBeLessThan(d(def.position, enemy.position));
  });

  function healer(): Character {
    const h = createCharacter({
      id: 'h', name: 'h', baseStats: { hp: 40, attack: 50, magicAttack: 200, speed: 20, endurance: 60 },
      sight: 20, starterWeaponTemplateId: 'tome_west', weaponMastery: { tome: 1 }, skillLoadout: ['tome_heal'],
    });
    h.position = { x: 0, y: 0 };
    h.aiBehavior = 'support';
    h.skillUses = { tome_heal: 5 }; // 전투 밖 직접 호출이라 사용 횟수를 초기화
    return h;
  }

  it('지원형: 부상한 아군을 치료한다', () => {
    const h = healer();
    const wounded = behaviorUnit('w', 'sword_short', { x: 1, y: 0 }, 'aggressive');
    wounded.currentHp = 1;
    const enemy = behaviorUnit('e', 'sword_short', { x: 5, y: 5 }, 'aggressive', { side: 'B' });
    const action = pickAiAction(h, [h, wounded], [enemy], map);
    expect(action.skillId).toBe('tome_heal');
    expect(action.targetId).toBe('w');
  });

  it('지원형: 치료할 아군이 없으면 회복 스킬을 쓰지 않는다', () => {
    const h = healer();
    const healthy = behaviorUnit('a', 'sword_short', { x: 1, y: 0 }, 'aggressive');
    const enemy = behaviorUnit('e', 'sword_short', { x: 5, y: 5 }, 'aggressive', { side: 'B' });
    const action = pickAiAction(h, [h, healthy], [enemy], map);
    expect(action.skillId).not.toBe('tome_heal');
  });
});
