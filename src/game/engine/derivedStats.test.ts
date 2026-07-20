import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { mentalResistChance, evasionChance, maxHp } from './derivedStats';

function makeCharacter(magicAttack: number, speed: number, level = 10, hp = 5) {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    level,
    baseStats: { hp, attack: 5, magicAttack, speed, endurance: 5 },
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
  it('회피율 = 스피드 / 1000 (스피드 1당 0.1%p), 레벨차는 반영하지 않는다', () => {
    const defender = makeCharacter(5, 200, 10);
    expect(evasionChance(defender)).toBeCloseTo(0.2); // 200/1000
  });

  it('최대 30%로 제한된다', () => {
    const fast = makeCharacter(5, 500, 10);
    expect(evasionChance(fast)).toBe(0.3); // 500/1000=0.5 이지만 상한 0.3
  });
});

describe('maxHp', () => {
  it('최대 체력 = 20 + 체력 × 3 + 레벨 × 2', () => {
    const c = makeCharacter(5, 5, 10, 30);
    expect(maxHp(c)).toBe(20 + 30 * 3 + 10 * 2); // 130
  });
});
