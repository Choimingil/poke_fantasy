import { PLAYABLE_WEAPON_KINDS } from '../data/weapons';
import { generateCharacter } from './generateCharacter';
import type { Quality, RecruitCandidate } from './types';

/** 명성 구간별 모집 품질. 0–19 일반병사 / 20–49 숙련병 / 50–99 엘리트 / 100+ 영웅급. */
export function qualityForReputation(reputation: number): Quality {
  if (reputation >= 100) return 'hero';
  if (reputation >= 50) return 'elite';
  if (reputation >= 20) return 'veteran';
  return 'recruit';
}

/** 품질별 후보 레벨 범위. */
const QUALITY_LEVEL_RANGE: Record<Quality, [number, number]> = {
  recruit: [1, 8],
  veteran: [8, 18],
  elite: [18, 30],
  hero: [30, 45],
};

const QUALITY_COST_MULT: Record<Quality, number> = {
  recruit: 1, veteran: 1.4, elite: 1.9, hero: 2.6,
};

/** 모집 비용(레벨 × 15 × 품질 배수). */
export function recruitCost(level: number, quality: Quality): number {
  return Math.round(level * 15 * QUALITY_COST_MULT[quality]);
}

function randomLevel(quality: Quality, rng: () => number): number {
  const [lo, hi] = QUALITY_LEVEL_RANGE[quality];
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** 현재 명성 품질로 3~5명의 모집 후보를 생성한다. */
export function rollRecruits(reputation: number, startId: number, rng: () => number = Math.random): { recruits: RecruitCandidate[]; nextId: number } {
  const quality = qualityForReputation(reputation);
  const count = 3 + Math.floor(rng() * 3); // 3~5
  const recruits: RecruitCandidate[] = [];
  let id = startId;
  for (let i = 0; i < count; i++) {
    const kind = PLAYABLE_WEAPON_KINDS[Math.floor(rng() * PLAYABLE_WEAPON_KINDS.length)];
    const level = randomLevel(quality, rng);
    const character = generateCharacter(kind, level, { id: `u${id}`, rng });
    recruits.push({ id: `u${id}`, character, quality, cost: recruitCost(level, quality) });
    id += 1;
  }
  return { recruits, nextId: id };
}
