import type { Element, Skill } from '../types';

const ENCHANT_ELEMENTS: { element: Exclude<Element, 'none'>; name: string }[] = [
  { element: 'fire', name: '불' },
  { element: 'water', name: '물' },
  { element: 'wood', name: '나무' },
  { element: 'steel', name: '강철' },
  { element: 'earth', name: '땅' },
];

const COMMON_SKILLS: Skill[] = [
  // 주먹: 사용 가능한 기술이 없을 때 자동으로 쓰이는 기본 공격(선택 목록에는 노출되지 않음).
  { id: 'fist', name: '주먹', weaponKind: 'common', category: 'attack', damageType: 'physical', power: 50, accuracy: 100, targetMode: 'enemy', range: 1 },
  { id: 'power_strike', name: '강타', weaponKind: 'common', category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon' },
  { id: 'incantation', name: '주술', weaponKind: 'common', category: 'attack', damageType: 'magic', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', element: 'weaponElement' },
  { id: 'protect', name: '보호', weaponKind: 'common', category: 'guard', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', areaRadius: 1 },
  { id: 'taunt', name: '도발', weaponKind: 'common', category: 'debuff', damageType: 'none', power: 0, accuracy: 90, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'rockfall', name: '낙석', weaponKind: 'common', category: 'attack', damageType: 'physical', power: 200, accuracy: 100, targetMode: 'tile', maxUses: 2, requiresTerrain: 'hill' },
  ...ENCHANT_ELEMENTS.map(({ element, name }): Skill => ({
    id: `enchant_${element}`,
    name: `마법부여-${name}`,
    weaponKind: 'common',
    category: 'buff',
    damageType: 'none',
    power: 0,
    accuracy: 100,
    targetMode: 'self',
    maxUses: 3,
    element,
  })),
  { id: 'river_surge', name: '급류', weaponKind: 'common', category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self' },
  { id: 'climb', name: '등반', weaponKind: 'common', category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self' },
  { id: 'far_sight', name: '천리안', weaponKind: 'common', category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self' },
  { id: 'forest_vision', name: '투시', weaponKind: 'common', category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self' },
  { id: 'quick_swap', name: '빠른교체', weaponKind: 'common', category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', maxUses: 3 },
];

// 검(r1): 반월참 / 일섬 / 섬광참
const SWORD_SKILLS: Skill[] = [
  { id: 'sword_crescent', name: '반월참', weaponKind: 'sword', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', coneArc: true, maxUses: 3 },
  { id: 'sword_flash', name: '일섬', weaponKind: 'sword', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 95, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'sword_blink', name: '섬광참', weaponKind: 'sword', requiredTier: 3, category: 'attack', damageType: 'physical', power: 150, accuracy: 90, targetMode: 'enemy', range: 2, maxUses: 2 },
];

// 둔기(r1): 다리 타격 / 밀쳐내기 / 광역보호
const BLUNT_SKILLS: Skill[] = [
  { id: 'blunt_leghit', name: '다리 타격', weaponKind: 'blunt', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 5 },
  { id: 'blunt_shove', name: '밀쳐내기', weaponKind: 'blunt', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 100, targetMode: 'enemy', range: 'weapon', knockback: true, maxUses: 3 },
  { id: 'blunt_wideguard', name: '광역보호', weaponKind: 'blunt', requiredTier: 3, category: 'guard', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', maxUses: 2 },
];

// 창(r1): 꿰뚫기 / 봉쇄 / 돌진
const SPEAR_SKILLS: Skill[] = [
  { id: 'spear_pierce', name: '꿰뚫기', weaponKind: 'spear', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', pierceBehind: true, maxUses: 5 },
  { id: 'spear_lock', name: '봉쇄', weaponKind: 'spear', requiredTier: 2, category: 'debuff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'spear_charge', name: '돌진', weaponKind: 'spear', requiredTier: 3, category: 'attack', damageType: 'physical', power: 180, accuracy: 90, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
];

// 활(r2): 천궁 / 도약사격 / 저격
const BOW_SKILLS: Skill[] = [
  { id: 'bow_skyshot', name: '천궁', weaponKind: 'bow', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', hillRangeBonus: 1, maxUses: 5 },
  { id: 'bow_leapshot', name: '도약사격', weaponKind: 'bow', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 100, targetMode: 'enemy', range: 'weapon', followupMoveRadius: 1, maxUses: 3 },
  { id: 'bow_snipe', name: '저격', weaponKind: 'bow', requiredTier: 3, category: 'attack', damageType: 'physical', power: 150, accuracy: 95, targetMode: 'anyInSight', range: 5, ignoresRange: true, maxUses: 3 },
];

// 석궁(r2): 철갑사격 / 관통사격 / 치명사격
const CROSSBOW_SKILLS: Skill[] = [
  { id: 'xbow_ap', name: '철갑사격', weaponKind: 'crossbow', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', ignoreDefenseRatio: 0.2, maxUses: 5 },
  { id: 'xbow_pierceshot', name: '관통사격', weaponKind: 'crossbow', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 95, targetMode: 'enemy', range: 'weapon', pierceBehind: true, maxUses: 3 },
  { id: 'xbow_lethal', name: '치명사격', weaponKind: 'crossbow', requiredTier: 3, category: 'attack', damageType: 'physical', power: 0, accuracy: 90, targetMode: 'enemy', range: 'weapon', fixedDamagePercent: 25, maxUses: 1 },
];

// 마법서(r1): 치료 / 정화 / 재행동 — 주변 1칸 아군 대상
const TOME_SKILLS: Skill[] = [
  { id: 'tome_heal', name: '치료', weaponKind: 'tome', requiredTier: 1, category: 'heal', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 1, maxUses: 5 },
  { id: 'tome_purify', name: '정화', weaponKind: 'tome', requiredTier: 2, category: 'utility', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 1, maxUses: 3 },
  { id: 'tome_recast', name: '재행동', weaponKind: 'tome', requiredTier: 3, category: 'utility', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 1, maxUses: 1 },
];

// 지팡이(r2): 원소탄 / 약화 / 원소폭풍 — 이름·속성은 장착 지팡이 element로 자동 변환
const STAFF_SKILLS: Skill[] = [
  { id: 'staff_bolt', name: '원소탄', weaponKind: 'staff', requiredTier: 1, category: 'attack', damageType: 'magic', power: 120, accuracy: 100, targetMode: 'enemy', range: 'weapon', element: 'weaponElement', maxUses: 5 },
  { id: 'staff_weaken', name: '약화', weaponKind: 'staff', requiredTier: 2, category: 'debuff', damageType: 'none', power: 0, accuracy: 95, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'staff_meteor', name: '원소폭풍', weaponKind: 'staff', requiredTier: 3, category: 'attack', damageType: 'magic', power: 150, accuracy: 90, targetMode: 'tile', range: 'weapon', areaRadius: 1, element: 'weaponElement', maxUses: 3 },
];

// 단검(r1): 기습 / 은신 / 축지
const DAGGER_SKILLS: Skill[] = [
  { id: 'dagger_ambush', name: '기습', weaponKind: 'dagger', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', followupMoveRadius: 2, maxUses: 5 },
  { id: 'dagger_stealth', name: '은신', weaponKind: 'dagger', requiredTier: 2, category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', maxUses: 2 },
  { id: 'dagger_warp', name: '축지', weaponKind: 'dagger', requiredTier: 3, category: 'utility', damageType: 'none', power: 0, accuracy: 100, targetMode: 'allyAdjacentTile', maxUses: 1 },
];

// 투척(r2): 맹독 / 분신 / 쇄상
const THROWN_SKILLS: Skill[] = [
  { id: 'thrown_poison', name: '맹독', weaponKind: 'thrown', requiredTier: 1, category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 5 },
  { id: 'thrown_clone', name: '분신', weaponKind: 'thrown', requiredTier: 2, category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', maxUses: 3 },
  { id: 'thrown_chain', name: '쇄상', weaponKind: 'thrown', requiredTier: 3, category: 'attack', damageType: 'physical', power: 150, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 1 },
];

export const SKILLS: Skill[] = [
  ...COMMON_SKILLS,
  ...SWORD_SKILLS,
  ...BLUNT_SKILLS,
  ...SPEAR_SKILLS,
  ...BOW_SKILLS,
  ...CROSSBOW_SKILLS,
  ...TOME_SKILLS,
  ...STAFF_SKILLS,
  ...DAGGER_SKILLS,
  ...THROWN_SKILLS,
];

export function getSkill(id: string): Skill {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}

/** 장착 지팡이 속성별 원소 기술 표시 이름(초급 원소탄 / 고급 원소폭풍). */
const STAFF_SKILL_ELEMENT_NAMES: Record<string, Record<Exclude<Element, 'none'>, string>> = {
  staff_bolt: { fire: '화염탄', water: '물대포', wood: '가시덩굴', steel: '강철탄', earth: '암석탄' },
  staff_meteor: { fire: '운석우', water: '해일', wood: '나뭇잎폭풍', steel: '강철우', earth: '지진' },
};

/** 지팡이 원소 기술은 장착 속성에 따라 이름이 바뀐다(예: 불 → 화염탄). 그 외 기술은 기본 이름. */
export function skillDisplayName(skill: Skill, element?: Element): string {
  const table = STAFF_SKILL_ELEMENT_NAMES[skill.id];
  if (table && element && element !== 'none') return table[element];
  return skill.name;
}

export type SkillTypeLabel = '물리' | '마법' | '변화';

/**
 * 기술 타입: 물리(근력 주스탯) / 마법(지력 주스탯) / 변화(위력 없음·부가효과).
 * - 주술 + 지팡이·마법서 전용 기술 = 마법
 * - 그 외 위력이 있는 기술(고정 피해 포함) = 물리
 * - 그 외 위력이 없는 기술 = 변화
 */
export function skillTypeLabel(skill: Skill): SkillTypeLabel {
  if (skill.id === 'incantation' || skill.weaponKind === 'staff' || skill.weaponKind === 'tome') return '마법';
  const hasPower = skill.power > 0 || skill.fixedDamagePercent !== undefined;
  return hasPower ? '물리' : '변화';
}
