import type { Character } from '../types';

/** 능력치 정규화 분모: 최대 레벨 100 x 레벨당 3포인트 + 초기값 5 */
const STAT_NORM = 100 * 3 + 5;

/** 정신력: 상대의 능력치 감소·부가효과를 무시할 확률(지력 기반, 최대 70%). */
export function mentalResistChance(c: Character): number {
  return (c.baseStats.magicAttack / STAT_NORM) * 0.7;
}

/** 회피율: 공격을 받지 않고 회피할 확률(스피드 + 레벨차 기반, [0,1] 클램프). */
export function evasionChance(defender: Character, attacker: Character): number {
  const chance = defender.baseStats.speed / STAT_NORM / 2 + (defender.level - attacker.level) / 100;
  return Math.max(0, Math.min(1, chance));
}
