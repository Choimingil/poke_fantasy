import type { Character } from '../types';
import { getWeapon } from '../data/weapons';

export function effectiveSpeed(c: Character): number {
  const instance = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  const weapon = getWeapon(instance!.templateId);
  return c.baseStats.speed + weapon.baseSpeed;
}

/**
 * 살아있는 유닛을 스피드 내림차순으로 정렬한다(결정적).
 * 스피드 동률은 ①이번 라운드 우선권 진영(홀수 라운드=플레이어 A / 짝수=적 B) → ②같은 진영 내 출전(배치) 순서로 정한다.
 * 배치 순서는 입력 배열 순서(allUnits = teamA 배치순 ++ teamB 배치순)를 그대로 따른다.
 */
export function determineTurnOrder(units: Character[], round = 1): Character[] {
  const alive = units.filter((u) => u.currentHp > 0);
  const deployIndex = new Map(alive.map((u, i) => [u.id, i]));
  const initiativeSide = round % 2 === 1 ? 'A' : 'B';
  const sideRank = (c: Character) => (c.side === initiativeSide ? 0 : 1);
  return [...alive].sort((a, b) => {
    const speedDiff = effectiveSpeed(b) - effectiveSpeed(a);
    if (speedDiff !== 0) return speedDiff;
    if (sideRank(a) !== sideRank(b)) return sideRank(a) - sideRank(b);
    return deployIndex.get(a.id)! - deployIndex.get(b.id)!;
  });
}
