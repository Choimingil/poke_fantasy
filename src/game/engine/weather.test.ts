import { describe, expect, it } from 'vitest';
import type { ArmorKind, Character } from '../types';
import { createCharacter } from './characterFactory';
import { maxHp } from './derivedStats';
import { weatherTurnStartDamage } from './weather';

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
