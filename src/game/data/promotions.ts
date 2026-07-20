import type { Character, WeaponKind } from '../types';
import { SKILLS } from './skills';

/** 전직 포인트 지급 간격(레벨). 10레벨마다 전직 포인트 1을 지급한다. */
export const PROMOTION_LEVEL_INTERVAL = 10;
/** 전직은 3단계로 간소화(1차=초급기술, 2차=교체 무료+중급기술, 3차=패시브+고급기술). */
export const MAX_TIER = 3;
/** 무기 전직 패시브는 3차 전직(최종 티어)에서 습득한다. */
const PASSIVE_TIER = 3;
/** 2차 전직 이상이면 그 무기로 교체할 때 행동을 소모하지 않는다. */
export const FREE_SWAP_TIER = 2;
export const MAX_LOADOUT = 4;
/** 사용 가능한 기술이 하나도 없을 때 자동으로 쓰이는 기본 공격 id */
export const FALLBACK_SKILL_ID = 'fist';

export type WeaponPassive =
  | 'sprint' // 검 질주: 일반 이동 2칸 이상 후 공격 시 기술 위력 1.2배
  | 'guardian' // 둔기 경호: 인접 1칸 아군 피격 시 대신 피격(1회/라운드)
  | 'counter' // 창 반격: 사거리 내 적의 직접공격에 피해를 입으면 기본 공격 0.5배로 반격(1회/라운드)
  | 'hawkeye' // 활 매의눈: 시야 +1
  | 'steadyAim' // 석궁 정조준: 이번 턴 일반 이동을 안 했으면 급소 확률 2배
  | 'meditation' // 마법서 명상: 사용횟수 2회 이상 마법서 기술 20% 미소모(1회/라운드)
  | 'amplify' // 지팡이 증폭: 속성 약점 배율 1.3→1.6
  | 'adaptation' // 단검 적응력: 자연지형 이동감소 무시, 바위 통과 가능(정지 불가)
  | 'pincer'; // 투척 협공: 사거리 내 적이 다른 아군에게 직접공격당하면 0.5배 추가공격(1회/라운드)

/** 무기별 3차 전직 패시브. */
const WEAPON_PASSIVES: Partial<Record<WeaponKind, WeaponPassive>> = {
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

const PASSIVE_LABEL: Record<WeaponPassive, string> = {
  sprint: '질주', guardian: '경호', counter: '반격', hawkeye: '매의눈', steadyAim: '정조준',
  meditation: '명상', amplify: '증폭', adaptation: '적응력', pincer: '협공',
};

/** 무기 종류의 3차 전직 패시브 한글 이름(없으면 null). */
export function weaponPassiveLabel(kind: WeaponKind): string | null {
  const p = WEAPON_PASSIVES[kind];
  return p ? PASSIVE_LABEL[p] : null;
}

export function masteryTier(c: Character, kind: WeaponKind): number {
  return c.weaponMastery[kind] ?? 0;
}

/** 해당 무기를 3차 전직(패시브 티어) 이상 했고, 그 무기의 전직 패시브가 지정한 것과 일치하는지. */
export function hasWeaponPassive(c: Character, kind: WeaponKind, passive: WeaponPassive): boolean {
  return masteryTier(c, kind) >= PASSIVE_TIER && WEAPON_PASSIVES[kind] === passive;
}

export function spendPromotion(c: Character, kind: WeaponKind): boolean {
  if (c.unspentPromotions <= 0) return false;
  const current = masteryTier(c, kind);
  if (current >= MAX_TIER) return false;
  c.weaponMastery[kind] = current + 1;
  c.unspentPromotions -= 1;
  return true;
}

// ---- 무기 숙련도(전직과 별개) ----

/** 무기 숙련도 4단계: 초보/숙련/전문/달인. 각 단계의 공격 피해 최소 난수값 하한. */
const PROFICIENCY_FLOORS = [0.7, 0.8, 0.9, 1.0];
/** 각 숙련도 단계에 도달하는 데 필요한 누적 숙련 경험치. */
const PROFICIENCY_THRESHOLDS = [0, 10, 30, 60];
export const PROFICIENCY_STAGE_LABEL = ['초보', '숙련', '전문', '달인'];
/** 한 번의 기술 사용에서 얻을 수 있는 숙련 경험치 상한(범위 공격 다중 명중도 최대 2배까지). */
export const PROFICIENCY_MAX_GAIN_PER_SKILL = 2;

function proficiencyExp(c: Character, kind: WeaponKind): number {
  return c.weaponProficiency?.[kind] ?? 0;
}

/** 누적 숙련 경험치에 따른 숙련도 단계(0=초보 ~ 3=달인). */
export function proficiencyStage(c: Character, kind: WeaponKind): number {
  const exp = proficiencyExp(c, kind);
  let stage = 0;
  for (let i = 0; i < PROFICIENCY_THRESHOLDS.length; i++) {
    if (exp >= PROFICIENCY_THRESHOLDS[i]) stage = i;
  }
  return stage;
}

/** 숙련도 단계에 따른 피해 랜덤 하한(초보 0.7 ~ 달인 1.0). */
export function proficiencyFloor(c: Character, kind: WeaponKind): number {
  return PROFICIENCY_FLOORS[proficiencyStage(c, kind)];
}

/** 해당 무기로 적에게 직접 피해를 줄 때 숙련 경험치를 누적한다. */
export function gainProficiencyExp(c: Character, kind: WeaponKind, amount: number): void {
  if (amount <= 0) return;
  c.weaponProficiency = { ...(c.weaponProficiency ?? {}), [kind]: proficiencyExp(c, kind) + amount };
}

/** 생성 시점 레벨에 맞춰 대략적인 숙련 경험치를 부여(전투로 벌기 전 기본치). */
export function seededProficiencyExp(level: number): number {
  const stage = Math.min(PROFICIENCY_THRESHOLDS.length - 1, Math.floor(level / 20));
  return PROFICIENCY_THRESHOLDS[stage];
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
