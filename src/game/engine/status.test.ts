import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { applyBleedDamage, applyStatus, applyTileBurnDamage, getStatus, consumeShock, applyDamageOverTime, tickMapStatus, tickStatusAtTurnStart } from './status';

function makeCharacter(): Character {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    baseStats: { hp: 160, attack: 10, magicAttack: 10, speed: 10, endurance: 10 },
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
}

function makeMap(terrain: BattleMap['tiles'][number][number]['terrain'] = 'plain'): BattleMap {
  return { width: 1, height: 1, tiles: [[{ terrain }]] };
}

describe('applyStatus', () => {
  it('상태를 새로 부여한다', () => {
    const c = makeCharacter();
    const applied = applyStatus(c, 'guarding', { turnsRemaining: 2, magnitude: 1 });
    expect(applied).toBe(true);
    expect(getStatus(c, 'guarding')?.turnsRemaining).toBe(2);
  });

  it('noStack 옵션이 있으면 이미 걸려있는 상태를 갱신하지 않는다', () => {
    const c = makeCharacter();
    applyStatus(c, 'legHit', { turnsRemaining: 1, magnitude: -1, noStack: true });
    const secondApplied = applyStatus(c, 'legHit', { turnsRemaining: 3, magnitude: -1, noStack: true });
    expect(secondApplied).toBe(false);
    expect(getStatus(c, 'legHit')?.turnsRemaining).toBe(1);
  });
});

describe('tickStatusAtTurnStart', () => {
  it('지속시간을 1 감소시키고 0이 되면 만료 처리한다', () => {
    const c = makeCharacter();
    applyStatus(c, 'farSight', { turnsRemaining: 1 });
    const result = tickStatusAtTurnStart(c);
    expect(result.expired).toContain('farSight');
    expect(c.statusEffects).toHaveLength(0);
  });

  it('지속시간이 남아있으면 만료되지 않는다', () => {
    const c = makeCharacter();
    applyStatus(c, 'farSight', { turnsRemaining: 2 });
    const result = tickStatusAtTurnStart(c);
    expect(result.expired).toHaveLength(0);
    expect(getStatus(c, 'farSight')?.turnsRemaining).toBe(1);
  });
});

describe('applyTileBurnDamage', () => {
  it('화염 타일 위의 캐릭터는 최대체력의 1/4만큼 피해를 입는다', () => {
    const c = makeCharacter();
    const map = makeMap('plain');
    map.tiles[0][0].status = { type: 'burning', turnsRemaining: 2 };
    const damage = applyTileBurnDamage(c, map);
    expect(damage).toBe(130); // 최대체력 520(=20+160*3+10*2)의 1/4
    expect(c.currentHp).toBe(390);
  });

  it('화염 타일이 아니면 피해가 없다', () => {
    const c = makeCharacter();
    const map = makeMap('plain');
    expect(applyTileBurnDamage(c, map)).toBe(0);
    expect(c.currentHp).toBe(520);
  });
});

describe('applyBleedDamage', () => {
  it('출혈 상태의 캐릭터는 매 턴 최대체력의 1/8만큼 피해를 입는다', () => {
    const c = makeCharacter();
    applyStatus(c, 'bleeding', { turnsRemaining: 2 });
    expect(applyBleedDamage(c)).toBe(65); // 최대체력 520의 1/8
    expect(c.currentHp).toBe(455);
  });

  it('출혈이 아니면 피해가 없다', () => {
    const c = makeCharacter();
    expect(applyBleedDamage(c)).toBe(0);
  });
});

describe('consumeShock', () => {
  it('충격 상태가 아니면 false', () => {
    const c = makeCharacter();
    expect(consumeShock(c)).toBe(false);
  });

  it('충격 상태면 true를 반환하고 그 상태를 소모(제거)한다', () => {
    const c = makeCharacter();
    applyStatus(c, 'shocked', { turnsRemaining: 2 });
    expect(consumeShock(c)).toBe(true);
    expect(getStatus(c, 'shocked')).toBeUndefined();
  });
});

describe('applyDamageOverTime', () => {
  it('출혈+맹독 합산 지속피해는 한 턴에 최대체력의 20%를 넘지 않는다', () => {
    const c = makeCharacter(); // hp160 → 최대체력 520, 20% = 104
    applyStatus(c, 'bleeding', { turnsRemaining: 2 });
    applyStatus(c, 'poisoned', { turnsRemaining: 2 });
    // 출혈 65 + 맹독 65 = 130 이지만 상한 104로 제한.
    expect(applyDamageOverTime(c)).toBe(104);
    expect(c.currentHp).toBe(520 - 104);
  });
});

describe('tickMapStatus', () => {
  it('화염 지속시간이 끝나면 상태가 사라지고, 숲이었다면 평지로 바뀐다', () => {
    const map = makeMap('forest');
    map.tiles[0][0].status = { type: 'burning', turnsRemaining: 1 };
    tickMapStatus(map);
    expect(map.tiles[0][0].status).toBeUndefined();
    expect(map.tiles[0][0].terrain).toBe('plain');
  });

  it('화염 지속시간이 남아있으면 지형은 그대로다', () => {
    const map = makeMap('forest');
    map.tiles[0][0].status = { type: 'burning', turnsRemaining: 2 };
    tickMapStatus(map);
    expect(map.tiles[0][0].status?.turnsRemaining).toBe(1);
    expect(map.tiles[0][0].terrain).toBe('forest');
  });
});
