import type { Character } from '../types';
import { getWeapon } from '../data/weapons';

/** 장착 중인 주무기를 인벤토리의 다른 무기로 변경한다(방패 제외). 양손무기로 바꾸면 장착 중이던 방패는 해제된다. */
export function equipWeapon(c: Character, instanceId: string): void {
  const instance = c.inventory.find((w) => w.instanceId === instanceId);
  if (!instance) throw new Error(`Weapon instance not found in inventory: ${instanceId}`);
  const template = getWeapon(instance.templateId);
  if (template.kind === 'shield') throw new Error('equipWeapon cannot equip a shield; use equipShield');
  c.equippedWeaponId = instanceId;
  if (template.handedness === 'twoHanded') c.equippedShieldId = undefined;
}

export function equipShield(c: Character, instanceId: string): void {
  const instance = c.inventory.find((w) => w.instanceId === instanceId);
  if (!instance) throw new Error(`Shield instance not found in inventory: ${instanceId}`);
  const template = getWeapon(instance.templateId);
  if (template.kind !== 'shield') throw new Error('equipShield requires a shield-kind weapon instance');
  const mainWeapon = getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId);
  if (mainWeapon.handedness === 'twoHanded') throw new Error('Cannot equip a shield while a two-handed weapon is equipped');
  c.equippedShieldId = instanceId;
}

export function unequipShield(c: Character): void {
  c.equippedShieldId = undefined;
}
