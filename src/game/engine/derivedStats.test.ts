import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { mentalResistChance, evasionChance } from './derivedStats';

function makeCharacter(magicAttack: number, speed: number, level = 10) {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    level,
    baseStats: { hp: 5, attack: 5, magicAttack, speed, endurance: 5 },
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
}

describe('mentalResistChance', () => {
  it('지력 305에서 최대 70%에 도달한다', () => {
    const c = makeCharacter(305, 5);
    expect(mentalResistChance(c)).toBeCloseTo(0.7);
  });

  it('지력이 낮으면 저항 확률도 낮다', () => {
    const c = makeCharacter(30.5, 5);
    expect(mentalResistChance(c)).toBeCloseTo(0.07);
  });
});

describe('evasionChance', () => {
  it('같은 레벨끼리는 스피드만으로 회피율이 결정된다', () => {
    const attacker = makeCharacter(5, 5, 10);
    const defender = makeCharacter(5, 305, 10);
    expect(evasionChance(defender, attacker)).toBeCloseTo(0.5); // (305/305)/2
  });

  it('레벨차가 크면 회피율이 늘어나거나 줄어든다', () => {
    const lowLevelAttacker = makeCharacter(5, 5, 1);
    const highLevelDefender = makeCharacter(5, 5, 50);
    const chance = evasionChance(highLevelDefender, lowLevelAttacker);
    expect(chance).toBeGreaterThan(0.4); // 레벨차(49)/100 만큼 가산
  });

  it('0~1 범위로 클램프된다', () => {
    const attacker = makeCharacter(5, 5, 1);
    const defender = makeCharacter(5, 5, 100);
    expect(evasionChance(defender, attacker)).toBeLessThanOrEqual(1);
    expect(evasionChance(attacker, defender)).toBeGreaterThanOrEqual(0);
  });
});
