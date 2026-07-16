import type { Character, StatBlock } from '../types';
import { PROMOTION_LEVEL_INTERVAL } from '../data/promotions';

/** 처치 경험치/레벨업 곡선 — 명세에 수치가 없어 새로 설계한 placeholder */
const KILL_XP_BASE = 15;
const KILL_XP_PER_VICTIM_LEVEL = 5;

export function xpForKill(victimLevel: number): number {
  return KILL_XP_BASE + victimLevel * KILL_XP_PER_VICTIM_LEVEL;
}

function xpToNextLevel(level: number): number {
  return 20 + level * 10;
}

const STAT_GROWTH_PER_LEVEL: StatBlock = { hp: 4, attack: 1, magicAttack: 1, defense: 1, speed: 0.5 };

export interface LevelUpResult {
  characterId: string;
  newLevel: number;
  promotionPointsGained: number;
}

/** 처치 경험치를 지급하고 레벨업(다단계 가능)을 처리한다. 최후의 일격을 가한 캐릭터만 호출해야 한다. */
export function grantXp(c: Character, xp: number): LevelUpResult[] {
  const results: LevelUpResult[] = [];
  c.xp += xp;
  while (c.xp >= xpToNextLevel(c.level)) {
    c.xp -= xpToNextLevel(c.level);
    c.level += 1;
    for (const key of Object.keys(STAT_GROWTH_PER_LEVEL) as (keyof StatBlock)[]) {
      c.baseStats[key] += STAT_GROWTH_PER_LEVEL[key];
    }
    const gained = c.level % PROMOTION_LEVEL_INTERVAL === 0 ? 1 : 0;
    c.unspentPromotions += gained;
    results.push({ characterId: c.id, newLevel: c.level, promotionPointsGained: gained });
  }
  return results;
}
