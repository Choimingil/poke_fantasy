import { getJob } from './jobs';
import { ROSTER } from './roster';

/** 분배 능력치 값(각 스탯의 현재 수치). */
export interface StatAlloc {
  hp: number;
  attack: number; // 근력
  magic: number; // 지력
  endurance: number;
  speed: number;
}

export interface Progress {
  level: number;
  xp: number; // 현재 레벨에서 누적한 경험치
  alloc: StatAlloc;
}

export type ProgressMap = Record<string, Progress>;

const MAX_LEVEL = 100;
const POINTS_PER_LEVEL = 3;
const STAT_BASE = 5;
const START_LEVEL = 50;

/** 레벨 50 기준 직업 타입별 기본 분배(= 이전 TEST_BUILD). */
const DEFAULT_BY_TYPE: Record<'melee' | 'ranged' | 'magic', StatAlloc> = {
  melee: { hp: 37, attack: 70, magic: 5, endurance: 55, speed: 5 },
  ranged: { hp: 37, attack: 55, magic: 5, endurance: 45, speed: 30 },
  magic: { hp: 37, attack: 5, magic: 85, endurance: 27, speed: 18 },
};

/** 다음 레벨까지 필요한 경험치. 처치 경험치는 상대 레벨×30(engine에서 산정). */
export function xpForNext(level: number): number {
  return level * 100;
}

/** 이미 분배에 쓴 포인트 수. */
function usedPoints(alloc: StatAlloc): number {
  return alloc.hp + alloc.attack + alloc.magic + alloc.endurance + alloc.speed - STAT_BASE * 5;
}
/** 아직 분배하지 않고 남은 포인트. */
export function pendingPoints(p: Progress): number {
  return POINTS_PER_LEVEL * (p.level - 1) - usedPoints(p.alloc);
}

const STORAGE_KEY = 'poke_fantasy_progression_v1';

function defaults(): ProgressMap {
  const map: ProgressMap = {};
  for (const c of ROSTER) {
    map[c.jobId] = { level: START_LEVEL, xp: 0, alloc: { ...DEFAULT_BY_TYPE[getJob(c.jobId).type] } };
  }
  return map;
}

export function loadProgress(): ProgressMap {
  const d = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return d;
    return { ...d, ...(JSON.parse(raw) as ProgressMap) };
  } catch {
    return d;
  }
}

export function saveProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage 미지원 환경은 무시 */
  }
}

/** 획득 경험치를 적용해 레벨업 처리한 새 Progress 반환(포인트는 pending으로 누적). */
export function applyXp(p: Progress, gained: number): Progress {
  let { level, xp } = p;
  xp += gained;
  while (level < MAX_LEVEL && xp >= xpForNext(level)) {
    xp -= xpForNext(level);
    level += 1;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { level, xp, alloc: { ...p.alloc } };
}
