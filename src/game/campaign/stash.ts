import type { ArmorInstance, Character, WeaponInstance } from '../types';
import { getWeapon } from '../data/weapons';
import { getUsableSkillIds } from '../data/promotions';
import { meetsEquipLevel } from '../engine/equipment';
import { sellValue } from './gold';
import type { Campaign as C } from './types';

/** 상점 상품을 구매해 보관함(stash)에 넣는다(골드 부족 시 변화 없음). */
export function buyShopItem(campaign: C, itemId: string): C {
  const item = campaign.shop.find((s) => s.id === itemId);
  if (!item || campaign.gold < item.price) return campaign;
  const instanceId = `i${campaign.nextId}`;
  const stash = { weapons: [...campaign.stash.weapons], armor: [...campaign.stash.armor] };
  if (item.slot === 'armor') {
    stash.armor.push({ instanceId, templateId: item.templateId, level: item.level });
  } else {
    stash.weapons.push({ instanceId, templateId: item.templateId, level: item.level, element: item.element, procEffect: item.procEffect });
  }
  return {
    ...campaign,
    gold: campaign.gold - item.price,
    stash,
    shop: campaign.shop.filter((s) => s.id !== itemId),
    nextId: campaign.nextId + 1,
  };
}

export function sellStashWeapon(campaign: C, instanceId: string): C {
  const w = campaign.stash.weapons.find((x) => x.instanceId === instanceId);
  if (!w) return campaign;
  return {
    ...campaign,
    gold: campaign.gold + sellValue(w.level),
    stash: { ...campaign.stash, weapons: campaign.stash.weapons.filter((x) => x.instanceId !== instanceId) },
  };
}

export function sellStashArmor(campaign: C, instanceId: string): C {
  const a = campaign.stash.armor.find((x) => x.instanceId === instanceId);
  if (!a) return campaign;
  return {
    ...campaign,
    gold: campaign.gold + sellValue(a.level),
    stash: { ...campaign.stash, armor: campaign.stash.armor.filter((x) => x.instanceId !== instanceId) },
  };
}

function refreshLoadout(char: Character): void {
  const kind = getWeapon(char.inventory.find((w) => w.instanceId === char.equippedWeaponId)!.templateId).kind;
  const pool = getUsableSkillIds(char, kind);
  char.skillLoadout = char.skillLoadout.filter((id) => pool.includes(id));
}

/** 보관함 무기를 캐릭터에 장착(현재 무기와 교체). 착용 레벨 미달 시 변화 없음. */
export function equipStashWeapon(campaign: C, charId: string, instanceId: string): C {
  const char = campaign.roster.find((c) => c.id === charId);
  const w = campaign.stash.weapons.find((x) => x.instanceId === instanceId);
  if (!char || !w || !meetsEquipLevel(char, w.level)) return campaign;
  const tpl = getWeapon(w.templateId);
  if (tpl.kind === 'shield') return equipStashShield(campaign, charId, instanceId);

  const stashWeapons: WeaponInstance[] = campaign.stash.weapons.filter((x) => x.instanceId !== instanceId);
  const oldWeapon = char.inventory.find((i) => i.instanceId === char.equippedWeaponId);
  char.inventory = char.inventory.filter((i) => i.instanceId !== char.equippedWeaponId).concat(w);
  if (oldWeapon) stashWeapons.push(oldWeapon);
  char.equippedWeaponId = w.instanceId;
  // 양손 무기로 바꾸면 방패는 보관함으로.
  if (tpl.handedness === 'twoHanded' && char.equippedShieldId) {
    const sh = char.inventory.find((i) => i.instanceId === char.equippedShieldId);
    if (sh) {
      char.inventory = char.inventory.filter((i) => i.instanceId !== sh.instanceId);
      stashWeapons.push(sh);
    }
    char.equippedShieldId = undefined;
  }
  refreshLoadout(char);
  return { ...campaign, stash: { ...campaign.stash, weapons: stashWeapons } };
}

/** 보관함 방패를 캐릭터에 장착(양손 무기·미달 시 불가). equipStashWeapon이 방패를 라우팅한다. */
function equipStashShield(campaign: C, charId: string, instanceId: string): C {
  const char = campaign.roster.find((c) => c.id === charId);
  const sh = campaign.stash.weapons.find((x) => x.instanceId === instanceId);
  if (!char || !sh || !meetsEquipLevel(char, sh.level)) return campaign;
  if (getWeapon(sh.templateId).kind !== 'shield') return campaign;
  const mainWeapon = getWeapon(char.inventory.find((i) => i.instanceId === char.equippedWeaponId)!.templateId);
  if (mainWeapon.handedness === 'twoHanded') return campaign; // 양손 무기와 병용 불가

  const stashWeapons: WeaponInstance[] = campaign.stash.weapons.filter((x) => x.instanceId !== instanceId);
  const oldShield = char.equippedShieldId ? char.inventory.find((i) => i.instanceId === char.equippedShieldId) : undefined;
  char.inventory = char.inventory.filter((i) => i.instanceId !== char.equippedShieldId).concat(sh);
  if (oldShield) stashWeapons.push(oldShield);
  char.equippedShieldId = sh.instanceId;
  return { ...campaign, stash: { ...campaign.stash, weapons: stashWeapons } };
}

/** 보관함 방어구를 캐릭터에 장착(현재 방어구와 교체). */
export function equipStashArmor(campaign: C, charId: string, instanceId: string): C {
  const char = campaign.roster.find((c) => c.id === charId);
  const a = campaign.stash.armor.find((x) => x.instanceId === instanceId);
  if (!char || !a || !meetsEquipLevel(char, a.level)) return campaign;

  const stashArmor: ArmorInstance[] = campaign.stash.armor.filter((x) => x.instanceId !== instanceId);
  const oldArmor = char.equippedArmorId ? char.armor.find((i) => i.instanceId === char.equippedArmorId) : undefined;
  char.armor = char.armor.filter((i) => i.instanceId !== char.equippedArmorId).concat(a);
  if (oldArmor) stashArmor.push(oldArmor);
  char.equippedArmorId = a.instanceId;
  return { ...campaign, stash: { ...campaign.stash, armor: stashArmor } };
}
