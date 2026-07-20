import type { ArmorInstance, Character, WeaponInstance } from '../types';
import { getWeapon } from '../data/weapons';
import { getUsableSkillIds } from '../data/promotions';
import { partyHasLegendaryEquipped } from '../data/equipGrade';
import { MAX_ENHANCE, enhanceCost } from '../data/enhance';
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
    stash.armor.push({ instanceId, templateId: item.templateId, level: item.level, grade: item.grade, options: item.options });
  } else {
    stash.weapons.push({ instanceId, templateId: item.templateId, level: item.level, element: item.element, procEffect: item.procEffect, grade: item.grade, options: item.options });
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

/** 장비 1단계 강화(§32): 골드+재료 소모, 실패 없음. 로스터 장착/소지 또는 보관함 장비 대상. */
export function enhanceEquip(campaign: C, instanceId: string): C {
  let inst: WeaponInstance | ArmorInstance | undefined;
  let owner: Character | undefined;
  for (const c of campaign.roster) {
    inst = c.inventory.find((w) => w.instanceId === instanceId) ?? c.armor.find((a) => a.instanceId === instanceId);
    if (inst) { owner = c; break; }
  }
  if (!inst) inst = campaign.stash.weapons.find((w) => w.instanceId === instanceId) ?? campaign.stash.armor.find((a) => a.instanceId === instanceId);
  if (!inst) return campaign;
  const cur = inst.enhanceLevel ?? 0;
  if (cur >= MAX_ENHANCE) return campaign; // 레벨별 상한(현재 일괄 5)
  const cost = enhanceCost(inst.level, cur, owner?.traitId === 'thrifty'); // 절약가 -15%
  if (campaign.gold < cost.gold || (campaign.materials ?? 0) < cost.materials) return campaign;
  inst.enhanceLevel = cur + 1; // 인스턴스를 직접 갱신(roster/stash가 참조를 공유)
  return { ...campaign, gold: campaign.gold - cost.gold, materials: (campaign.materials ?? 0) - cost.materials };
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
  // 전설 장비는 파티 내 하나만 장착 가능(§31).
  if (w.grade === 'legendary' && partyHasLegendaryEquipped(campaign.roster, w.templateId, charId)) return campaign;
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
  if (sh.grade === 'legendary' && partyHasLegendaryEquipped(campaign.roster, sh.templateId, charId)) return campaign;
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
  if (a.grade === 'legendary' && partyHasLegendaryEquipped(campaign.roster, a.templateId, charId)) return campaign;

  const stashArmor: ArmorInstance[] = campaign.stash.armor.filter((x) => x.instanceId !== instanceId);
  const oldArmor = char.equippedArmorId ? char.armor.find((i) => i.instanceId === char.equippedArmorId) : undefined;
  char.armor = char.armor.filter((i) => i.instanceId !== char.equippedArmorId).concat(a);
  if (oldArmor) stashArmor.push(oldArmor);
  char.equippedArmorId = a.instanceId;
  return { ...campaign, stash: { ...campaign.stash, armor: stashArmor } };
}
