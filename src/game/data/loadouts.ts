import { ROSTER } from './roster';

/** jobId -> 장착 기술 id 목록 */
export type LoadoutMap = Record<string, string[]>;

const STORAGE_KEY = 'poke_fantasy_loadouts_v1';

/** 로스터 기본 기술 구성을 초기값으로 사용한다. */
function defaultLoadouts(): LoadoutMap {
  const map: LoadoutMap = {};
  for (const c of ROSTER) map[c.jobId] = [...c.skills];
  return map;
}

export function loadLoadouts(): LoadoutMap {
  const defaults = defaultLoadouts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as LoadoutMap;
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

export function saveLoadouts(map: LoadoutMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage 미지원 환경은 무시 */
  }
}
