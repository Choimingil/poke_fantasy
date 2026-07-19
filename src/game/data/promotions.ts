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

export type Tier5Passive =
  | 'sprint' // 검 질주: 일반 이동 2칸 이상 후 공격 시 기술 위력 1.2배
  | 'guardian' // 둔기 경호: 인접 1칸 아군 피격 시 대신 피격(1회/라운드)
  | 'counter' // 창 반격: 사거리 내 적의 직접공격에 피해를 입으면 기본 공격 0.5배로 반격(1회/라운드)
  | 'hawkeye' // 활 매의눈: 시야 +1
  | 'steadyAim' // 석궁 정조준: 이번 턴 일반 이동을 안 했으면 급소 확률 2배
  | 'meditation' // 마법서 명상: 사용횟수 2회 이상 마법서 기술 20% 미소모(1회/라운드)
  | 'amplify' // 지팡이 증폭: 속성 약점 배율 1.3→1.6
  | 'adaptation' // 단검 적응력: 자연지형 이동감소 무시, 바위 통과 가능(정지 불가)
  | 'pincer'; // 투척 협공: 사거리 내 적이 다른 아군에게 직접공격당하면 0.5배 추가공격(1회/라운드)

/** 티어5 무기별 전직 패시브. */
const TIER5_PASSIVES: Partial<Record<WeaponKind, Tier5Passive>> = {
  sword: 'sprint',
  blunt: 'guardian',
  spear: 'counter',
  bow: 'hawkeye',
  crossbow: 'steadyAim',
  tome: 'meditation',
  staff: 'amplify',
  dagger: 'adaptation',
  thrown: 'pincer',
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
    if (skill.maxUses !== undefined) uses[id] = skill.maxUses;
  }
  return uses;
}
