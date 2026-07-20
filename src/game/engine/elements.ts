import type { Element } from '../types';

type Elem = Exclude<Element, 'none'>;

/**
 * 속성 상성(비대칭 방향 그래프). X → [상대들] = X가 그 속성들에 강하다(유리).
 * 순환: 불→나무→물→불. 추가: 강철→불, 땅→강철, 나무→땅.
 */
const BEATS: Record<Elem, Elem[]> = {
  fire: ['wood'],
  wood: ['water', 'earth'],
  water: ['fire'],
  steel: ['fire'],
  earth: ['steel'],
};

function isStrongAgainst(attacker: Elem, defender: Elem): boolean {
  return BEATS[attacker].includes(defender);
}

/**
 * 속성 우열 배율. 동속성 보너스(STAB)는 없음 — 오직 상성 유불리만 데미지에 영향을 준다.
 * attacker가 defender에게 강하면(유리) 1.3배, defender가 attacker에게 강하면(불리) 0.7배, 그 외 1배.
 * 무속성은 공격/방어 어느 쪽이든 항상 1배.
 */
export function elementMultiplier(attacker: Element, defender: Element): number {
  if (attacker === 'none' || defender === 'none') return 1;
  if (isStrongAgainst(attacker, defender)) return 1.3;
  if (isStrongAgainst(defender, attacker)) return 0.7;
  return 1;
}

/** element가 강점을 가지는(=element가 이기는) 상대 속성 하나. 지팡이 "약화"(속성 변경)용. */
export function weaknessOf(element: Elem): Element {
  return BEATS[element][0];
}
