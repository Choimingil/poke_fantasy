import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { effectiveMove } from './grid';
import { weatherMoveModifier, weatherTurnStartDamage } from './weather';

function makeMap(): BattleMap {
  const tiles = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) row.push({ terrain: 'plain' as const });
    tiles.push(row);
  }
  return { width: 5, height: 5, tiles };
}

function makeUnit(weaponTemplateId: string, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id: overrides.id ?? 'unit',
    name: 'unit',
    baseStats: { hp: 160, attack: 10, magicAttack: 10, speed: 10, endurance: 60 }, // raw move 3
    sight: 3,
    starterWeaponTemplateId: weaponTemplateId,
  });
  return { ...c, ...overrides, position: overrides.position ?? { x: 2, y: 2 } };
}

describe('weatherMoveModifier', () => {
  it('비는 중장(근접) 계열의 이동력만 -0.5', () => {
    expect(weatherMoveModifier(makeUnit('sword_short'), 'rain')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit('bow_short'), 'rain')).toBe(0);
  });

  it('눈은 경장(원거리·마법) 계열의 이동력만 -0.5', () => {
    expect(weatherMoveModifier(makeUnit('bow_short'), 'snow')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit('sword_short'), 'snow')).toBe(0);
  });

  it('맑음/폭염은 이동 페널티가 없다', () => {
    expect(weatherMoveModifier(makeUnit('sword_short'), 'clear')).toBe(0);
    expect(weatherMoveModifier(makeUnit('bow_short'), 'heatwave')).toBe(0);
  });

  it('effectiveMove에 날씨 보정이 반영된다', () => {
    const map = makeMap();
    const melee = makeUnit('sword_short');
    expect(effectiveMove(melee, map, 'rain')).toBe(2.5);
    expect(effectiveMove(melee, map, 'clear')).toBe(3);
  });
});

describe('weatherTurnStartDamage (폭염)', () => {
  it('폭염이 아니면 피해가 없다', () => {
    const unit = makeUnit('sword_short');
    expect(weatherTurnStartDamage(unit, 'clear', () => 0)).toBe(0);
    expect(unit.currentHp).toBe(unit.baseStats.hp);
  });

  it('폭염에서 저항에 실패하면 최대 체력 1/16 피해', () => {
    const unit = makeUnit('sword_short'); // magicAttack 10 → 저항확률 0.25
    // rng=0.99 → 저항 실패
    const dmg = weatherTurnStartDamage(unit, 'heatwave', () => 0.99);
    expect(dmg).toBe(Math.round(160 / 16)); // 10
    expect(unit.currentHp).toBe(150);
  });

  it('정신력(마법공격력)이 높으면 확률적으로 저항한다', () => {
    const mage = makeUnit('staff_east', { baseStats: { hp: 160, attack: 10, magicAttack: 36, speed: 10, endurance: 10 } });
    // magicAttack 36 → 저항확률 min(0.7, 0.9)=0.7. rng=0.1 < 0.7 → 저항 성공
    const dmg = weatherTurnStartDamage(mage, 'heatwave', () => 0.1);
    expect(dmg).toBe(0);
    expect(mage.currentHp).toBe(160);
  });
});
