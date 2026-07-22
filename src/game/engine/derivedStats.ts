import type { Character } from '../types';
import { effectiveBaseStat, maxHpTraitMult } from './traitEffects';
import { equippedOptionTotal } from '../data/equipGrade';

/** 능력치 정규화 분모: 최대 레벨 100 x 레벨당 3포인트 + 초기값 5 */
const STAT_NORM = 100 * 3 + 5;

/** 부상(§42) 중인 캐릭터의 최대 체력 배수(전투 시작 HP 감소). */
export const INJURED_HP_MULT = 0.7;

/** 최대 체력 = (20 + 체력 × 3 + 레벨 × 2) × 특성 배수(강인한 체질 +10%) + 장비 옵션 보너스. 부상 시 ×0.7(§42). */
export function maxHp(c: Character): number {
  const base = Math.round((20 + effectiveBaseStat(c, 'hp') * 3 + c.level * 2) * maxHpTraitMult(c)) + equippedOptionTotal(c, 'maxHp');
  return c.injured ? Math.max(1, Math.round(base * INJURED_HP_MULT)) : base;
}

/** 정신력: 상대의 능력치 감소·부가효과를 무시할 확률(지력 + 장비 옵션, 최대 70%). */
export function mentalResistChance(c: Character): number {
  return Math.min(0.7, (effectiveBaseStat(c, 'magicAttack') / STAT_NORM) * 0.7 + equippedOptionTotal(c, 'mentalResist'));
}

/** 회피율: 스피드 / 1000 (스피드 1당 0.1%p) + 장비 옵션(회피). 최대 30%로 제한하며 레벨차는 반영하지 않는다. */
export function evasionChance(defender: Character): number {
  return Math.max(0, Math.min(0.3, effectiveBaseStat(defender, 'speed') / 1000 + equippedOptionTotal(defender, 'evasion')));
}
