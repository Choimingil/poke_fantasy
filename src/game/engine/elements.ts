import type { Element } from '../types';

const BEATS: Record<Exclude<Element, 'none'>, Exclude<Element, 'none'>> = {
  fire: 'earth',
  earth: 'steel',
  steel: 'wood',
  wood: 'water',
  water: 'fire',
};

/**
 * 속성 우열 배율. 동속성 보너스(STAB)는 없음 — 오직 상성 유불리만 데미지에 영향을 준다.
 * attacker가 defender를 이기면(=defender가 약점) 1.3배, defender가 attacker를 이기면 0.7배, 그 외 1배.
 */
export function elementMultiplier(attacker: Element, defender: Element): number {
  if (attacker === 'none' || defender === 'none') return 1;
  if (BEATS[attacker] === defender) return 1.3;
  if (BEATS[defender] === attacker) return 0.7;
  return 1;
}

/** element가 약점으로 삼는(=element가 이기는) 상대 속성. 지팡이 "약화" 스킬용. */
export function weaknessOf(element: Exclude<Element, 'none'>): Element {
  return BEATS[element];
}
