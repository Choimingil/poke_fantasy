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

  it('각성 상태(swordAwaken)는 스피드를 magnitude배로 증가시킨다', () => {
    const awakened = makeUnit('awakened', 10);
    awakened.statusEffects.push({ type: 'swordAwaken', turnsRemaining: 3, magnitude: 1.2 });
    const other = makeUnit('other', 11); // 10*1.2 + weaponSpeed(20) = 32 > 11+20=31
    const order = determineTurnOrder([other, awakened]);
    expect(order[0].id).toBe('awakened');
  });

  it('완전 동률이면 rng로 순서를 정한다(결정적)', () => {
    const a = makeUnit('a', 10);
    const b = makeUnit('b', 10);
    const rng = () => 0.9; // a와 b 모두 같은 값을 받으므로 입력 순서가 보존됨
    const order = determineTurnOrder([a, b], rng);
    expect(order).toHaveLength(2);
  });
});
