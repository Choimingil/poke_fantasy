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
];

const SWORD_SKILLS: Skill[] = [
  { id: 'sword_draw', name: '발도', weaponKind: 'sword', requiredTier: 2, category: 'attack', damageType: 'physical', power: 80, accuracy: 100, targetMode: 'selfRadius', areaRadius: 1, maxUses: 3 },
  { id: 'sword_awaken', name: '각성', weaponKind: 'sword', requiredTier: 4, category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 2, maxUses: 3 },
  { id: 'sword_flurry', name: '고속연타', weaponKind: 'sword', requiredTier: 6, category: 'attack', damageType: 'physical', power: 80, hits: 3, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
];

const BLUNT_SKILLS: Skill[] = [
  { id: 'blunt_leghit', name: '다리 타격', weaponKind: 'blunt', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'blunt_unity', name: '단결', weaponKind: 'blunt', requiredTier: 4, category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 2, maxUses: 3 },
  { id: 'blunt_crush', name: '분쇄', weaponKind: 'blunt', requiredTier: 6, category: 'attack', damageType: 'physical', power: 240, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
];

const BOW_SKILLS: Skill[] = [
  { id: 'bow_flame', name: '화공', weaponKind: 'bow', requiredTier: 2, category: 'attack', damageType: 'physical', power: 120, accuracy: 90, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'bow_pinpoint', name: '급소', weaponKind: 'bow', requiredTier: 4, category: 'buff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'self', maxUses: 3 },
  { id: 'bow_snipe', name: '저격', weaponKind: 'bow', requiredTier: 6, category: 'attack', damageType: 'physical', power: 180, accuracy: 100, targetMode: 'anyInSight', ignoresRange: true, maxUses: 3 },
];

/** 지팡이 초급/고급 스킬은 이름/속성이 장착 지팡이의 element에 따라 자동으로 정해지므로 스킬 id는 하나씩만 존재한다. */
const STAFF_SKILLS: Skill[] = [
  { id: 'staff_bolt', name: '원소탄', weaponKind: 'staff', requiredTier: 2, category: 'attack', damageType: 'magic', power: 120, accuracy: 90, targetMode: 'enemy', range: 'weapon', element: 'weaponElement', maxUses: 3 },
  { id: 'staff_weaken', name: '약화', weaponKind: 'staff', requiredTier: 4, category: 'debuff', damageType: 'none', power: 0, accuracy: 100, targetMode: 'enemy', range: 'weapon', maxUses: 3 },
  { id: 'staff_burst', name: '원소폭풍', weaponKind: 'staff', requiredTier: 6, category: 'attack', damageType: 'magic', power: 120, accuracy: 90, targetMode: 'tile', range: 'weapon', areaRadius: 1, element: 'weaponElement', maxUses: 3 },
];

const TOME_SKILLS: Skill[] = [
  { id: 'tome_heal', name: '치료', weaponKind: 'tome', requiredTier: 2, category: 'heal', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 2, maxUses: 5 },
  { id: 'tome_refresh', name: '원기회복', weaponKind: 'tome', requiredTier: 4, category: 'utility', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 2, maxUses: 3 },
  { id: 'tome_recast', name: '재행동', weaponKind: 'tome', requiredTier: 6, category: 'utility', damageType: 'none', power: 0, accuracy: 100, targetMode: 'ally', areaRadius: 2, maxUses: 2 },
];

export const SKILLS: Skill[] = [
  ...COMMON_SKILLS,
  ...SWORD_SKILLS,
  ...BLUNT_SKILLS,
  ...BOW_SKILLS,
  ...STAFF_SKILLS,
  ...TOME_SKILLS,
];

export function getSkill(id: string): Skill {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}
