import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { carryCapacityKg, meetsEquipLevel, totalEquipmentWeightKg } from './equipment';
import { weaponPower } from '../data/weapons';
import { armorDefense } from '../data/armor';

function makeCharacter(attack: number) {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    level: 10,
    baseStats: { hp: 100, attack, magicAttack: 10, defense: 10, speed: 10 },
    rawMove: 2,
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
    starterArmorKind: 'leather',
  });
}

describe('carryCapacityKg', () => {
  it('기본 적재량은 5kg이다', () => {
    expect(carryCapacityKg(makeCharacter(0))).toBe(5);
  });

  it('근력 5당 적재량이 1kg 증가한다', () => {
    expect(carryCapacityKg(makeCharacter(25))).toBe(10);
    expect(carryCapacityKg(makeCharacter(27))).toBe(10); // 나머지는 버림(floor)
  });
});

describe('totalEquipmentWeightKg', () => {
  it('무기(1kg)와 방어구 무게(가죽 1kg)를 합산한다', () => {
    const c = makeCharacter(0);
    expect(totalEquipmentWeightKg(c)).toBe(2); // sword_short 1kg + armor_leather 1kg
  });
});

describe('meetsEquipLevel', () => {
  it('캐릭터 레벨이 장비 레벨 이상이면 착용 가능하다', () => {
    const c = makeCharacter(0);
    expect(meetsEquipLevel(c, 10)).toBe(true);
    expect(meetsEquipLevel(c, 20)).toBe(false);
  });
});

describe('weaponPower', () => {
  it('착용 레벨 / 2가 공격력이다', () => {
    expect(weaponPower(10, 'sword')).toBe(5);
    expect(weaponPower(100, 'sword')).toBe(50);
  });

  it('단검은 3/4 배율이 적용된다', () => {
    expect(weaponPower(100, 'dagger')).toBe(37.5);
  });
});

describe('armorDefense', () => {
  it('같은 레벨 무기 공격력에 종류별 배수를 곱한다', () => {
    expect(armorDefense(100, 'cloth')).toBeCloseTo(50 * 0.7);
    expect(armorDefense(100, 'leather')).toBeCloseTo(50 * 0.9);
    expect(armorDefense(100, 'mail')).toBeCloseTo(50 * 1.1);
    expect(armorDefense(100, 'plate')).toBeCloseTo(50 * 1.3);
  });
});
