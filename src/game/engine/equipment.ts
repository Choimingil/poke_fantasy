import type { Character } from '../types';
import { WEAPON_WEIGHT_KG } from '../data/weapons';
import { armorWeight, getArmor } from '../data/armor';
import { carryCapacityTraitBonus } from './traitEffects';

const BASE_CARRY_KG = 5;
const CARRY_KG_PER_ATTACK = 5; // 근력 5당 적재량 1kg 증가

/** 적재량(kg): 기본 5kg + 근력 5당 1kg + 짐꾼 특성 +2. */
export function carryCapacityKg(c: Character): number {
  return BASE_CARRY_KG + Math.floor(c.baseStats.attack / CARRY_KG_PER_ATTACK) + carryCapacityTraitBonus(c);
}

/** 장착 중이든 아니든, 소지한 모든 무기·방패·방어구 무게의 합. */
export function totalEquipmentWeightKg(c: Character): number {
  const weaponWeight = c.inventory.length * WEAPON_WEIGHT_KG;
  const armorTotal = c.armor.reduce((sum, a) => sum + armorWeight(getArmor(a.templateId).kind), 0);
  return weaponWeight + armorTotal;
}

export const MAX_EXTRA_CARRIED = 2;

/** 기본 장착 장비(무기/방패/방어구) 외에 추가로 들고 있는 장비 개수. */
export function extraCarriedCount(c: Character): number {
  const equippedIds = new Set([c.equippedWeaponId, c.equippedShieldId, c.equippedArmorId].filter((id): id is string => !!id));
  const totalItems = c.inventory.length + c.armor.length;
  return Math.max(0, totalItems - equippedIds.size);
}

/** 무기/방어구의 착용 레벨이 캐릭터 레벨 이하인가(착용 가능 여부). */
export function meetsEquipLevel(c: Character, itemLevel: number): boolean {
  return c.level >= itemLevel;
}
