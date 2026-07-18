import type { Character, StatKey } from '../types';
import { PROMOTION_LEVEL_INTERVAL } from '../data/promotions';

export const MAX_LEVEL = 100;
export const STAT_POINTS_PER_LEVEL = 3;

/** 처치 경험치/레벨업 곡선 — 명세에 수치가 없어 새로 설계한 placeholder */
const KILL_XP_BASE = 15;
const KILL_XP_PER_VICTIM_LEVEL = 5;

export function xpForKill(victimLevel: number): number {
  return KILL_XP_BASE + victimLevel * KILL_XP_PER_VICTIM_LEVEL;
}

function xpToNextLevel(level: number): number {
  return 20 + level * 10;
}

export interface LevelUpResult {
  characterId: string;
  newLevel: number;
  promotionPointsGained: number;
  statPointsGained: number;
}

/** 처치 경험치를 지급하고 레벨업(다단계 가능, 최대 레벨 100)을 처리한다. 최후의 일격을 가한 캐릭터만 호출해야 한다. */
export function grantXp(c: Character, xp: number): LevelUpResult[] {
  const results: LevelUpResult[] = [];
  if (c.level >= MAX_LEVEL) return results;
  c.xp += xp;
  while (c.level < MAX_LEVEL && c.xp >= xpToNextLevel(c.level)) {
    c.xp -= xpToNextLevel(c.level);
    c.level += 1;
    c.unspentStatPoints += STAT_POINTS_PER_LEVEL;
    const gained = c.level % PROMOTION_LEVEL_INTERVAL === 0 ? 1 : 0;
    c.unspentPromotions += gained;
    results.push({ characterId: c.id, newLevel: c.level, promotionPointsGained: gained, statPointsGained: STAT_POINTS_PER_LEVEL });
  }
  return results;
}

/** 레벨업으로 쌓인 포인트를 능력치 하나에 1점 분배한다. 포인트가 없으면 false. */
export function spendStatPoint(c: Character, stat: StatKey): boolean {
  if (c.unspentStatPoints <= 0) return false;
  c.baseStats[stat] += 1;
  c.unspentStatPoints -= 1;
  return true;
}
