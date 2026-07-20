import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { createCharacter } from './characterFactory';
import { determineTurnOrder } from './turnOrder';

function makeUnit(id: string, speed: number, weaponTemplateId = 'sword_short'): Character {
  return createCharacter({
    id,
    name: id,
    baseStats: { hp: 100, attack: 10, magicAttack: 10, speed, endurance: 10 },
    sight: 3,
    starterWeaponTemplateId: weaponTemplateId,
  });
}

describe('determineTurnOrder', () => {
  it('스탯 스피드 + 무기 스피드 합산이 높은 쪽이 먼저 행동한다', () => {
    const fast = makeUnit('fast', 30, 'sword_short'); // baseSpeed 20
    const slow = makeUnit('slow', 5, 'blunt_maul'); // baseSpeed 10
    const order = determineTurnOrder([slow, fast]);
    expect(order.map((u) => u.id)).toEqual(['fast', 'slow']);
  });

  it('죽은(currentHp<=0) 유닛은 순서에서 제외된다', () => {
    const alive = makeUnit('alive', 10);
    const dead = makeUnit('dead', 100);
    dead.currentHp = 0;
    const order = determineTurnOrder([alive, dead]);
    expect(order.map((u) => u.id)).toEqual(['alive']);
  });

  it('스피드 동률이면 라운드 우선권 진영 → 배치 순서로 정한다(결정적)', () => {
    const a = makeUnit('a', 10); a.side = 'A';
    const b = makeUnit('b', 10); b.side = 'B';
    // 홀수 라운드: 플레이어(A) 우선
    expect(determineTurnOrder([b, a], 1).map((u) => u.id)).toEqual(['a', 'b']);
    // 짝수 라운드: 적(B) 우선
    expect(determineTurnOrder([a, b], 2).map((u) => u.id)).toEqual(['b', 'a']);
  });

  it('같은 진영 동률은 입력(배치) 순서를 따른다', () => {
    const a = makeUnit('a', 10); a.side = 'A';
    const c = makeUnit('c', 10); c.side = 'A';
    expect(determineTurnOrder([a, c], 1).map((u) => u.id)).toEqual(['a', 'c']);
    expect(determineTurnOrder([c, a], 1).map((u) => u.id)).toEqual(['c', 'a']);
  });
});
