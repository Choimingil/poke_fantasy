import type { Character } from '../types';
import { getWeapon } from '../data/weapons';
import { meetsEquipLevel } from './equipment';

/** 장착 중인 주무기를 인벤토리의 다른 무기로 변경한다(방패 제외). 양손무기로 바꾸면 장착 중이던 방패/보조무기는 해제된다.
 * 단검이 아닌 무기로 바꾸면 보조 슬롯에 있던 단검(이도류)도 함께 해제된다.
 * 캐릭터 레벨이 무기 착용 레벨 미만이면 장착에 실패한다(false 반환). */
export function equipWeapon(c: Character, instanceId: string): boolean {
  const instance = c.inventory.find((w) => w.instanceId === instanceId);
  if (!instance) throw new Error(`Weapon instance not found in inventory: ${instanceId}`);
  const template = getWeapon(instance.templateId);
  if (template.kind === 'shield') throw new Error('equipWeapon cannot equip a shield; use equipShield');
  if (!meetsEquipLevel(c, instance.level)) return false;
  c.equippedWeaponId = instanceId;
  const offhand = c.inventory.find((w) => w.instanceId === c.equippedShieldId);
  if (template.handedness === 'twoHanded' || (offhand && getWeapon(offhand.templateId).kind === 'dagger' && template.kind !== 'dagger')) {
    c.equippedShieldId = undefined;
  }
  return true;
}

export function equipShield(c: Character, instanceId: string): boolean {
  const instance = c.inventory.find((w) => w.instanceId === instanceId);
  if (!instance) throw new Error(`Shield instance not found in inventory: ${instanceId}`);
  const template = getWeapon(instance.templateId);
  if (template.kind !== 'shield') throw new Error('equipShield requires a shield-kind weapon instance');
  const mainWeapon = getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId);
  if (mainWeapon.handedness === 'twoHanded') throw new Error('Cannot equip a shield while a two-handed weapon is equipped');
  if (!meetsEquipLevel(c, instance.level)) return false;
  c.equippedShieldId = instanceId;
  return true;
}

/**
 * 단검 이도류: 주무기가 단검일 때만 보조 슬롯에 단검을 하나 더 장착할 수 있다(단검 2개 착용).
 * 다른 무기(방패 포함)와는 병용할 수 없다.
 */
export function equipOffhandDagger(c: Character, instanceId: string): boolean {
  const instance = c.inventory.find((w) => w.instanceId === instanceId);
  if (!instance) throw new Error(`Dagger instance not found in inventory: ${instanceId}`);
  const template = getWeapon(instance.templateId);
  if (template.kind !== 'dagger') throw new Error('equipOffhandDagger requires a dagger-kind weapon instance');
  const mainWeapon = getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId);
  if (mainWeapon.kind !== 'dagger') throw new Error('Offhand dagger requires a dagger equipped in the main hand');
  if (!meetsEquipLevel(c, instance.level)) return false;
  c.equippedShieldId = instanceId;
  return true;
}

export function unequipShield(c: Character): void {
  c.equippedShieldId = undefined;
}

/** 방어구를 장착한다. 캐릭터 레벨이 방어구 착용 레벨 미만이면 실패한다(false 반환). */
export function equipArmor(c: Character, instanceId: string): boolean {
  const instance = c.armor.find((a) => a.instanceId === instanceId);
  if (!instance) throw new Error(`Armor instance not found in inventory: ${instanceId}`);
  if (!meetsEquipLevel(c, instance.level)) return false;
  c.equippedArmorId = instanceId;
  return true;
}

export function unequipArmor(c: Character): void {
  c.equippedArmorId = undefined;
}
