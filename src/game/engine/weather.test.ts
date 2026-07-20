import { describe, expect, it } from 'vitest';
import type { ArmorKind, BattleMap, Character } from '../types';
import { createCharacter } from './characterFactory';
import { effectiveMove } from './grid';
import { maxHp } from './derivedStats';
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

function makeUnit(armorKind: ArmorKind | undefined, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id: overrides.id ?? 'unit',
    name: 'unit',
    baseStats: { hp: 160, attack: 10, magicAttack: 10, speed: 10, endurance: 60 }, // raw move 3
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
    starterArmorKind: armorKind,
  });
  return { ...c, ...overrides, position: overrides.position ?? { x: 2, y: 2 } };
}

describe('weatherMoveModifier', () => {
  it('비는 중장(중갑·판금) 착용 시에만 -0.5', () => {
    expect(weatherMoveModifier(makeUnit('plate'), 'rain')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit('mail'), 'rain')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit('leather'), 'rain')).toBe(0);
  });

  it('눈은 경장(천·가죽·미착용) 착용 시에만 -0.5', () => {
    expect(weatherMoveModifier(makeUnit('leather'), 'snow')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit(undefined), 'snow')).toBe(-0.5);
    expect(weatherMoveModifier(makeUnit('plate'), 'snow')).toBe(0);
  });

  it('맑음/폭염은 이동 페널티가 없다', () => {
    expect(weatherMoveModifier(makeUnit('plate'), 'clear')).toBe(0);
    expect(weatherMoveModifier(makeUnit('leather'), 'heatwave')).toBe(0);
  });

  it('effectiveMove에 날씨 보정이 반영된다(판금 + 비)', () => {
    const map = makeMap();
    const heavy = makeUnit('plate');
    expect(effectiveMove(heavy, map, 'rain')).toBe(2.5);
    expect(effectiveMove(heavy, map, 'clear')).toBe(3);
  });
});

describe('weatherTurnStartDamage (폭염)', () => {
  it('폭염이 아니면 피해가 없다', () => {
    const unit = makeUnit(undefined);
    expect(weatherTurnStartDamage(unit, 'clear', () => 0)).toBe(0);
    expect(unit.currentHp).toBe(maxHp(unit));
  });

  it('폭염에서 저항에 실패하면 최대 체력 1/16 피해', () => {
    const unit = makeUnit(undefined); // magicAttack 10 → 저항확률 0.25
    // rng=0.99 → 저항 실패
    const full = maxHp(unit); // 520
    const dmg = weatherTurnStartDamage(unit, 'heatwave', () => 0.99);
    expect(dmg).toBe(Math.round(full / 16)); // 33
    expect(unit.currentHp).toBe(full - dmg);
  });

  it('정신력(마법공격력)이 높으면 확률적으로 저항한다', () => {
    const mage = makeUnit(undefined, { baseStats: { hp: 160, attack: 10, magicAttack: 36, speed: 10, endurance: 10 } });
    // magicAttack 36 → 저항확률 min(0.7, 0.9)=0.7. rng=0.1 < 0.7 → 저항 성공
    const dmg = weatherTurnStartDamage(mage, 'heatwave', () => 0.1);
    expect(dmg).toBe(0);
    expect(mage.currentHp).toBe(maxHp(mage));
  });
});
