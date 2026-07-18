import { createCharacter, type CreateCharacterOptions } from '../engine/characterFactory';
import type { Character } from '../types';

// 능력치 5종(체력/근력/지력/스피드/지구력)은 전원 기본 5에서 시작해 레벨업마다 3포인트씩 분배된다.
// 로스터는 레벨 10(9회 레벨업 = 27포인트)으로 시작하므로 각 캐릭터의 5개 능력치 합은 5x5+27=52.
const ROSTER_DEFS: CreateCharacterOptions[] = [
  {
    id: 'sword_a', name: '환도무사', spriteJob: 'east_duelist', gender: 'male', level: 10,
    baseStats: { hp: 14, attack: 15, magicAttack: 5, speed: 10, endurance: 8 }, sight: 5,
    starterWeaponTemplateId: 'sword_short', starterShieldTemplateId: 'shield_round', starterArmorKind: 'mail',
    // blunt_mace는 Lv.20(캐릭터 레벨 10 미만) — 인벤토리에서 착용 레벨 잠금 UI 테스트용.
    extraWeaponTemplateIds: [{ templateId: 'blunt_mace', level: 20 }],
    extraArmorTemplateIds: [{ kind: 'leather' }],
  },
  {
    id: 'sword_b', name: '대검전사', spriteJob: 'west_berserker', gender: 'male', level: 10,
    baseStats: { hp: 16, attack: 18, magicAttack: 5, speed: 6, endurance: 7 }, sight: 5,
    starterWeaponTemplateId: 'sword_great', starterArmorKind: 'plate',
    extraWeaponTemplateIds: [{ templateId: 'blunt_maul' }],
    extraArmorTemplateIds: [{ kind: 'leather' }],
  },
  {
    id: 'blunt_a', name: '철퇴호위', spriteJob: 'west_knight', gender: 'male', level: 10,
    // 판금(5kg)+방패(1kg)+무기(1kg)만으로 이미 7kg — 근력을 높여 적재량을 확보하고 여분 방어구는 뺐다.
    baseStats: { hp: 18, attack: 17, magicAttack: 5, speed: 7, endurance: 5 }, sight: 5,
    starterWeaponTemplateId: 'blunt_mace', starterShieldTemplateId: 'shield_tower', starterArmorKind: 'plate',
    extraWeaponTemplateIds: [{ templateId: 'sword_short' }],
  },
  {
    id: 'blunt_b', name: '대곤파괴자', spriteJob: 'east_general', gender: 'male', level: 10,
    baseStats: { hp: 17, attack: 16, magicAttack: 5, speed: 5, endurance: 9 }, sight: 5,
    starterWeaponTemplateId: 'blunt_maul', starterArmorKind: 'mail',
    extraWeaponTemplateIds: [{ templateId: 'sword_great' }],
    extraArmorTemplateIds: [{ kind: 'leather' }],
  },
  {
    id: 'bow_a', name: '각궁사수', spriteJob: 'east_archer', gender: 'male', level: 10,
    baseStats: { hp: 10, attack: 14, magicAttack: 5, speed: 15, endurance: 8 }, sight: 5,
    starterWeaponTemplateId: 'bow_short', starterArmorKind: 'leather',
    extraWeaponTemplateIds: [{ templateId: 'bow_long' }, { templateId: 'sword_short' }],
  },
  {
    id: 'bow_b', name: '장궁저격수', spriteJob: 'west_ranger', gender: 'female', level: 10,
    baseStats: { hp: 9, attack: 13, magicAttack: 5, speed: 17, endurance: 8 }, sight: 5,
    starterWeaponTemplateId: 'bow_long', starterArmorKind: 'leather',
    extraWeaponTemplateIds: [{ templateId: 'bow_short' }],
    extraArmorTemplateIds: [{ kind: 'cloth' }],
  },
  {
    id: 'staff_a', name: '화염술사', spriteJob: 'west_witch', gender: 'female', level: 10,
    baseStats: { hp: 10, attack: 5, magicAttack: 19, speed: 10, endurance: 8 }, sight: 5,
    starterWeaponTemplateId: 'staff_east', starterWeaponElement: 'fire', starterArmorKind: 'cloth',
    extraWeaponTemplateIds: [{ templateId: 'tome_east' }],
    extraArmorTemplateIds: [{ kind: 'leather' }],
  },
  {
    id: 'staff_b', name: '대지술사', spriteJob: 'east_shaman', gender: 'male', level: 10,
    baseStats: { hp: 11, attack: 5, magicAttack: 17, speed: 8, endurance: 11 }, sight: 5,
    starterWeaponTemplateId: 'staff_west', starterWeaponElement: 'earth', starterArmorKind: 'cloth',
    extraWeaponTemplateIds: [{ templateId: 'tome_west' }],
    extraArmorTemplateIds: [{ kind: 'leather' }],
  },
  {
    id: 'tome_a', name: '사제', spriteJob: 'west_priest', gender: 'female', level: 10,
    baseStats: { hp: 11, attack: 5, magicAttack: 16, speed: 11, endurance: 9 }, sight: 5,
    starterWeaponTemplateId: 'tome_east', starterWeaponProcEffect: 'crit', starterArmorKind: 'cloth',
    extraWeaponTemplateIds: [{ templateId: 'staff_east' }],
  },
  {
    id: 'tome_b', name: '현자', spriteJob: 'east_strategist', gender: 'male', level: 10,
    baseStats: { hp: 9, attack: 5, magicAttack: 18, speed: 11, endurance: 9 }, sight: 5,
    starterWeaponTemplateId: 'tome_west', starterWeaponProcEffect: 'focus', starterArmorKind: 'leather',
    extraWeaponTemplateIds: [{ templateId: 'staff_west' }],
  },
];

// 세션 동안 유지되는 편집 가능한 캐릭터 인스턴스(인벤토리에서 무기/스킬 등을 여기서 직접 수정).
export const ROSTER: Character[] = ROSTER_DEFS.map((entry) => createCharacter(entry));

export function getRosterCharacter(id: string): Character {
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
