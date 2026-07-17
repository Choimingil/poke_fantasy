import { describe, expect, it } from 'vitest';
import { ROSTER } from './roster';
import { carryCapacityKg, extraCarriedCount, MAX_EXTRA_CARRIED, meetsEquipLevel, totalEquipmentWeightKg } from '../engine/equipment';

describe('ROSTER 장비 데이터 무결성', () => {
  it('모든 캐릭터의 소지 장비 무게 합이 적재량을 넘지 않는다', () => {
    for (const c of ROSTER) {
      expect(totalEquipmentWeightKg(c)).toBeLessThanOrEqual(carryCapacityKg(c));
    }
  });

  it('기본 장착 장비 외 추가 소지 장비는 2개를 넘지 않는다', () => {
    for (const c of ROSTER) {
      expect(extraCarriedCount(c)).toBeLessThanOrEqual(MAX_EXTRA_CARRIED);
    }
  });

  it('기본 장착 중인 무기/방패/방어구는 모두 캐릭터 레벨로 착용 가능하다', () => {
    for (const c of ROSTER) {
      const equippedWeapon = c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!;
      expect(meetsEquipLevel(c, equippedWeapon.level)).toBe(true);
      if (c.equippedShieldId) {
        const shield = c.inventory.find((w) => w.instanceId === c.equippedShieldId)!;
        expect(meetsEquipLevel(c, shield.level)).toBe(true);
      }
      if (c.equippedArmorId) {
        const armor = c.armor.find((a) => a.instanceId === c.equippedArmorId)!;
        expect(meetsEquipLevel(c, armor.level)).toBe(true);
      }
    }
  });
});
