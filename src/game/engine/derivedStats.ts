import type { Character } from '../types';
import { effectiveBaseStat, maxHpTraitMult } from './traitEffects';

/** 능력치 정규화 분모: 최대 레벨 100 x 레벨당 3포인트 + 초기값 5 */
const STAT_NORM = 100 * 3 + 5;

/** 최대 체력 = (20 + 체력 × 3 + 레벨 × 2) × 특성 배수(강인한 체질 +10%). */
export function maxHp(c: Character): number {
  return Math.round((20 + effectiveBaseStat(c, 'hp') * 3 + c.level * 2) * maxHpTraitMult(c));
}

/** 정신력: 상대의 능력치 감소·부가효과를 무시할 확률(지력 기반, 최대 70%). */
export function mentalResistChance(c: Character): number {
  return (effectiveBaseStat(c, 'magicAttack') / STAT_NORM) * 0.7;
}

/** 회피율: 스피드 / 1000 (스피드 1당 0.1%p). 최대 30%로 제한하며 레벨차는 반영하지 않는다. */
export function evasionChance(defender: Character): number {
  return Math.max(0, Math.min(0.3, effectiveBaseStat(defender, 'speed') / 1000));
}
