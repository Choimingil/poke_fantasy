import type { Character, WeaponKind } from '../types';
import { SKILLS } from './skills';

export const PROMOTION_LEVEL_INTERVAL = 5;
export const MAX_TIER = 6;
export const MAX_LOADOUT = 4;
/** 사용 가능한 기술이 하나도 없을 때 자동으로 쓰이는 기본 공격 id */
export const FALLBACK_SKILL_ID = 'fist';

interface Tier1Bonus {
  powerBonusPercent?: number;
  accuracyBonus?: number;
}

/** 티어1 숙련도 보너스. 수치는 밸런싱 이전 placeholder. */
export const TIER1_BONUS: Partial<Record<WeaponKind, Tier1Bonus>> = {
  sword: { powerBonusPercent: 10 },
  blunt: { accuracyBonus: 5 },
  bow: { accuracyBonus: 10 },
  staff: { powerBonusPercent: 10 },
  tome: { powerBonusPercent: 10 },
};

export type Tier5Passive = 'lowHpPowerSurge' | 'ironStance' | 'hawkeye' | 'elementalWard' | 'archiveOfKnowledge';

/** 티어5 무기별 전직 패시브. 명세에 없어 새로 설계한 placeholder. */
const TIER5_PASSIVES: Partial<Record<WeaponKind, Tier5Passive>> = {
  sword: 'lowHpPowerSurge', // 체력 30% 이하일 때 검 스킬 위력 +20%
  blunt: 'ironStance', // 둔기 장착 중 방어력 +15%
  bow: 'hawkeye', // 활 장착 중 시야 +1
  staff: 'elementalWard', // 방어 시 0.7배(속성 강점) 페널티 무시
  tome: 'archiveOfKnowledge', // 마법서 스킬 최대 사용횟수 +1
};

export function masteryTier(c: Character, kind: WeaponKind): number {
  return c.weaponMastery[kind] ?? 0;
}

export function hasTier5Passive(c: Character, kind: WeaponKind, passive: Tier5Passive): boolean {
  return masteryTier(c, kind) >= 5 && TIER5_PASSIVES[kind] === passive;
}

export function spendPromotion(c: Character, kind: WeaponKind): boolean {
  if (c.unspentPromotions <= 0) return false;
  const current = masteryTier(c, kind);
  if (current >= MAX_TIER) return false;
  c.weaponMastery[kind] = current + 1;
  c.unspentPromotions -= 1;
  return true;
}

/** 장착 무기 종류 + 해당 티어를 기준으로 지금 사용 가능한 스킬 id 목록 (공통 스킬은 항상 포함) */
export function getUsableSkillIds(c: Character, equippedKind: WeaponKind): string[] {
  const tier = masteryTier(c, equippedKind);
  return SKILLS.filter((s) => s.weaponKind === 'common' || s.weaponKind === equippedKind)
    .filter((s) => s.id !== FALLBACK_SKILL_ID) // 주먹은 선택 목록/기본 로드아웃에서 제외(폴백 전용)
    .filter((s) => !s.requiredTier || s.requiredTier <= tier)
    .map((s) => s.id);
}

/**
 * 전투에서 실제로 선택 가능한 스킬 목록. 로드아웃 스킬 중 사용 가능한 것이 하나도 없으면
 * 기본 공격(주먹) 하나로 대체된다.
 */
export function getBattleSkillIds(c: Character, equippedKind: WeaponKind, hasUses: (id: string) => boolean): string[] {
  const ids = getLoadoutSkillIds(c, equippedKind).filter(hasUses);
  return ids.length > 0 ? ids : [FALLBACK_SKILL_ID];
}

/**
 * 실제 전투에 들고 갈 스킬 id 목록: 사용 가능한 스킬 중 캐릭터의 로드아웃(최대 4개)에 포함된 것만.
 * 로드아웃이 비어있으면(미설정) 사용 가능한 스킬의 앞 4개를 기본으로 사용한다.
 * 플레이어와 AI 모두 이 목록을 통해 스킬을 사용하므로 대칭 적용된다.
 */
export function getLoadoutSkillIds(c: Character, equippedKind: WeaponKind): string[] {
  const pool = getUsableSkillIds(c, equippedKind);
  if (!c.skillLoadout || c.skillLoadout.length === 0) return pool.slice(0, MAX_LOADOUT);
  return pool.filter((id) => c.skillLoadout.includes(id)).slice(0, MAX_LOADOUT);
}

export function initSkillUses(c: Character, equippedKind: WeaponKind): Record<string, number> {
  const uses: Record<string, number> = {};
  for (const id of getUsableSkillIds(c, equippedKind)) {
    const skill = SKILLS.find((s) => s.id === id)!;
    let max = skill.maxUses;
    if (max !== undefined && skill.weaponKind === 'tome' && hasTier5Passive(c, 'tome', 'archiveOfKnowledge')) {
      max += 1;
    }
    if (max !== undefined) uses[id] = max;
  }
  return uses;
}
