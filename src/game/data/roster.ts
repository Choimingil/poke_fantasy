import { createCharacter, type CreateCharacterOptions } from '../engine/characterFactory';
import type { Character } from '../types';

// 테스트 로스터: 캐릭터별로 서로 다른 무기를 하나씩 들고, 그 무기를 6차 전직(티어6)한 레벨 30.
// 능력치 5종은 전원 기본 5에서 시작해 레벨업마다 3포인트씩 분배 → 레벨 30(29회) = 87포인트,
// 각 캐릭터의 5개 능력치 합은 5x5 + 87 = 112(주스탯은 무기에 맞춤). 장비·전직도 레벨 30 기준.
const LV = 30;
const ROSTER_DEFS: CreateCharacterOptions[] = [
  {
    id: 'sword', name: '강도현', spriteJob: 'east_duelist', gender: 'male', level: LV,
    baseStats: { hp: 30, attack: 40, magicAttack: 5, speed: 20, endurance: 17 }, sight: 5,
    starterWeaponTemplateId: 'sword_short', starterWeaponLevel: LV,
    starterShieldTemplateId: 'shield_round', starterShieldLevel: LV, starterArmorKind: 'mail', starterArmorLevel: LV,
    weaponMastery: { sword: 6 }, skillLoadout: ['power_strike', 'sword_crescent', 'sword_flash', 'sword_blink'],
    // 상위 레벨(Lv.40) 무기 — 인벤토리 착용 레벨 잠금 UI 테스트용.
    extraWeaponTemplateIds: [{ templateId: 'blunt_mace', level: 40 }],
  },
  {
    id: 'blunt', name: '백건우', spriteJob: 'west_knight', gender: 'male', level: LV,
    baseStats: { hp: 34, attack: 38, magicAttack: 5, speed: 15, endurance: 20 }, sight: 5,
    starterWeaponTemplateId: 'blunt_maul', starterWeaponLevel: LV, starterArmorKind: 'plate', starterArmorLevel: LV,
    weaponMastery: { blunt: 6 }, skillLoadout: ['power_strike', 'blunt_leghit', 'blunt_shove', 'blunt_wideguard'],
  },
  {
    id: 'spear', name: '서지훈', spriteJob: 'east_general', gender: 'male', level: LV,
    baseStats: { hp: 28, attack: 42, magicAttack: 5, speed: 20, endurance: 17 }, sight: 5,
    starterWeaponTemplateId: 'spear_a', starterWeaponLevel: LV, starterArmorKind: 'mail', starterArmorLevel: LV,
    weaponMastery: { spear: 6 }, skillLoadout: ['power_strike', 'spear_pierce', 'spear_lock', 'spear_charge'],
  },
  {
    id: 'bow', name: '윤재하', spriteJob: 'east_archer', gender: 'male', level: LV,
    baseStats: { hp: 20, attack: 40, magicAttack: 5, speed: 32, endurance: 15 }, sight: 5,
    starterWeaponTemplateId: 'bow_long', starterWeaponLevel: LV, starterArmorKind: 'leather', starterArmorLevel: LV,
    weaponMastery: { bow: 6 }, skillLoadout: ['power_strike', 'bow_skyshot', 'bow_leapshot', 'bow_snipe'],
    extraWeaponTemplateIds: [{ templateId: 'bow_short', level: LV }],
  },
  {
    id: 'crossbow', name: '한도영', spriteJob: 'west_berserker', gender: 'male', level: LV,
    baseStats: { hp: 24, attack: 44, magicAttack: 5, speed: 24, endurance: 15 }, sight: 5,
    starterWeaponTemplateId: 'crossbow_a', starterWeaponLevel: LV, starterArmorKind: 'leather', starterArmorLevel: LV,
    weaponMastery: { crossbow: 6 }, skillLoadout: ['power_strike', 'xbow_ap', 'xbow_pierceshot', 'xbow_lethal'],
  },
  {
    id: 'dagger', name: '류시아', spriteJob: 'west_ranger', gender: 'female', level: LV,
    baseStats: { hp: 20, attack: 38, magicAttack: 5, speed: 37, endurance: 12 }, sight: 5,
    starterWeaponTemplateId: 'dagger_a', starterWeaponLevel: LV, starterArmorKind: 'leather', starterArmorLevel: LV,
    weaponMastery: { dagger: 6 }, skillLoadout: ['power_strike', 'dagger_ambush', 'dagger_stealth', 'dagger_warp'],
  },
  {
    id: 'thrown', name: '오세준', spriteJob: 'east_strategist', gender: 'male', level: LV,
    baseStats: { hp: 22, attack: 40, magicAttack: 5, speed: 30, endurance: 15 }, sight: 5,
    starterWeaponTemplateId: 'thrown_a', starterWeaponLevel: LV, starterWeaponProcEffect: 'bleed', starterArmorKind: 'leather', starterArmorLevel: LV,
    weaponMastery: { thrown: 6 }, skillLoadout: ['power_strike', 'thrown_poison', 'thrown_clone', 'thrown_chain'],
  },
  {
    id: 'staff_fire', name: '임하늘', spriteJob: 'west_witch', gender: 'female', level: LV,
    baseStats: { hp: 22, attack: 5, magicAttack: 45, speed: 20, endurance: 20 }, sight: 5,
    starterWeaponTemplateId: 'staff_east', starterWeaponLevel: LV, starterWeaponElement: 'fire', starterArmorKind: 'cloth', starterArmorLevel: LV,
    weaponMastery: { staff: 6 }, skillLoadout: ['incantation', 'staff_bolt', 'staff_weaken', 'staff_meteor'],
  },
  {
    id: 'staff_water', name: '문서준', spriteJob: 'east_shaman', gender: 'male', level: LV,
    baseStats: { hp: 24, attack: 5, magicAttack: 43, speed: 20, endurance: 20 }, sight: 5,
    starterWeaponTemplateId: 'staff_west', starterWeaponLevel: LV, starterWeaponElement: 'water', starterArmorKind: 'cloth', starterArmorLevel: LV,
    weaponMastery: { staff: 6 }, skillLoadout: ['incantation', 'staff_bolt', 'staff_weaken', 'staff_meteor'],
  },
  {
    id: 'tome', name: '정유안', spriteJob: 'west_priest', gender: 'female', level: LV,
    baseStats: { hp: 24, attack: 5, magicAttack: 42, speed: 22, endurance: 19 }, sight: 5,
    starterWeaponTemplateId: 'tome_east', starterWeaponLevel: LV, starterWeaponProcEffect: 'crit', starterArmorKind: 'cloth', starterArmorLevel: LV,
    weaponMastery: { tome: 6 }, skillLoadout: ['incantation', 'tome_heal', 'tome_purify', 'tome_recast'],
  },
];

// 세션 동안 유지되는 편집 가능한 캐릭터 인스턴스(인벤토리에서 무기/스킬 등을 여기서 직접 수정).
export const ROSTER: Character[] = ROSTER_DEFS.map((entry) => createCharacter(entry));

function getRosterCharacter(id: string): Character {
  const c = ROSTER.find((e) => e.id === id);
  if (!c) throw new Error(`Unknown roster entry: ${id}`);
  return c;
}

/** 인벤토리에서 편집된 로스터 인스턴스를 전투용으로 복제한다(고유 id 부여로 양 팀 중복 선택 대비). */
export function cloneForBattle(id: string, uniqueId: string): Character {
  const src = getRosterCharacter(id);
  const clone = structuredClone(src);
  clone.id = uniqueId;
  return clone;
}
