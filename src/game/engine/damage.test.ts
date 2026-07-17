import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { getSkill } from '../data/skills';
import { getWeapon, weaponPower as calcWeaponPower } from '../data/weapons';
import { createCharacter } from './characterFactory';
import { calculateDamage } from './damage';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const SWORD_POWER = calcWeaponPower(10, 'sword');

function makeCharacter(id: string, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id,
    name: id,
    baseStats: { hp: 100, attack: 50, magicAttack: 30, defense: 30, speed: 10 },
    rawMove: 2,
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
  return { ...c, ...overrides };
}

describe('calculateDamage', () => {
  it('최소 데미지는 1 이상이다', () => {
    const attacker = makeCharacter('atk', { baseStats: { hp: 100, attack: 1, magicAttack: 1, defense: 10, speed: 10 } });
    const defender = makeCharacter('def', { baseStats: { hp: 100, attack: 10, magicAttack: 10, defense: 999, speed: 10 } });
    const result = calculateDamage({
      attacker,
      defender,
      skill: getSkill('power_strike'),
      weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none',
      defenderElement: 'none',
      statSource: 'attack',
      rng: sequenceRng([0.99, 0.5]),
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('속성 약점(1.3배)은 강점(0.7배)보다 데미지가 약 1.86배 크다', () => {
    const attacker = makeCharacter('atk');
    const defender = makeCharacter('def');
    const favorable = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'fire', defenderElement: 'earth', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    const unfavorable = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'earth', defenderElement: 'fire', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    const ratio = favorable.damage / unfavorable.damage;
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.0);
  });

  it('무속성은 상성의 영향을 받지 않는다', () => {
    const attacker = makeCharacter('atk');
    const defender = makeCharacter('def');
    const neutral = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'fire', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    const noElement = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    expect(neutral.damage).toBe(noElement.damage);
  });

  it('방패 방어 보너스는 방어력에 그대로 더해진다', () => {
    const attacker = makeCharacter('atk');
    const defender = makeCharacter('def');
    const withoutShield = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    const withShield = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', defenderExtraDefense: 30, rng: sequenceRng([0.99, 0.5]),
    });
    expect(withShield.damage).toBeLessThan(withoutShield.damage);
  });

  it('combined statSource는 근력+지력 합산치를 주능력치로 사용한다(마법부여)', () => {
    const attacker = makeCharacter('atk', { baseStats: { hp: 100, attack: 50, magicAttack: 30, defense: 30, speed: 10 } });
    const defender = makeCharacter('def');
    const attackOnly = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', rng: sequenceRng([0.99, 0.5]),
    });
    const combined = calculateDamage({
      attacker, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: SWORD_POWER,
      attackerElement: 'none', defenderElement: 'none', statSource: 'combined', rng: sequenceRng([0.99, 0.5]),
    });
    expect(combined.damage).toBeGreaterThan(attackOnly.damage);
  });
});
