import type { Character } from '../types';
import { getWeapon } from '../data/weapons';
import { getStatus } from './status';

export function effectiveSpeed(c: Character): number {
  const instance = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  const weapon = getWeapon(instance!.templateId);
  const awaken = getStatus(c, 'swordAwaken');
  const speedMult = awaken ? (awaken.magnitude ?? 1.2) : 1;
  return c.baseStats.speed * speedMult + weapon.baseSpeed;
}

/**
 * 살아있는 유닛을 스피드 내림차순으로 정렬한다. 완전 동률은 rng로 판정.
 * 비교 함수 안에서 매번 rng()를 새로 호출하면 sort 구현체의 비교 순서에 따라 결과가 달라지는
 * 비결정적 버그가 생기므로, 동률 판정용 난수는 정렬 전에 한 번씩만 뽑아 고정한다.
 */
export function determineTurnOrder(units: Character[], rng: () => number = Math.random): Character[] {
  const alive = units.filter((u) => u.currentHp > 0);
  const tieBreak = new Map(alive.map((u) => [u.id, rng()]));
  return [...alive].sort((a, b) => {
    const speedDiff = effectiveSpeed(b) - effectiveSpeed(a);
    if (speedDiff !== 0) return speedDiff;
    return tieBreak.get(b.id)! - tieBreak.get(a.id)!;
  });
}
