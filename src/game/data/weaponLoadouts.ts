import { getJob } from './jobs';
import { ROSTER } from './roster';

/** jobId -> 추가 등록 무기 id 목록(최대 2개). 기본 장착 무기 외에 인벤토리에서 등록. */
export type WeaponLoadoutMap = Record<string, string[]>;

/** TRPG 무기 후보(근거리=검 / 원거리=활 / 마법=지팡이). */
export const TRPG_WEAPON_IDS = ['trpg_sword', 'trpg_bow', 'trpg_staff'] as const;

/** 직업의 기본 장착 무기(직업 타입 기준). */
export function baseWeaponId(jobId: string): string {
  const t = getJob(jobId).type;
  return t === 'melee' ? 'trpg_sword' : t === 'ranged' ? 'trpg_bow' : 'trpg_staff';
}

/** 추가 무기 슬롯 수. */
export const EXTRA_WEAPON_SLOTS = 2;

const STORAGE_KEY = 'poke_fantasy_weapon_loadouts_v1';

/** 기본값: 기본 무기 외 나머지 2종을 추가 등록(기존 교체 동작 유지). */
function defaultWeaponLoadouts(): WeaponLoadoutMap {
  const map: WeaponLoadoutMap = {};
  for (const c of ROSTER) {
    const base = baseWeaponId(c.jobId);
    map[c.jobId] = TRPG_WEAPON_IDS.filter((w) => w !== base).slice(0, EXTRA_WEAPON_SLOTS);
  }
  return map;
}

export function loadWeaponLoadouts(): WeaponLoadoutMap {
  const defaults = defaultWeaponLoadouts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as WeaponLoadoutMap) };
  } catch {
    return defaults;
  }
}

export function saveWeaponLoadouts(map: WeaponLoadoutMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage 미지원 환경은 무시 */
  }
}
