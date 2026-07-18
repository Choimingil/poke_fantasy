import { describe, expect, it } from 'vitest';
import { canWieldTwoHanded, effectiveWeaponPower, TWO_HANDED_POWER_MULT, weaponPower } from './weapons';

describe('two-handed grip weapon power', () => {
  it('단검·투척·방패는 양손 파지 불가', () => {
    expect(canWieldTwoHanded('dagger')).toBe(false);
    expect(canWieldTwoHanded('thrown')).toBe(false);
    expect(canWieldTwoHanded('shield')).toBe(false);
  });

  it('그 외 무기는 양손 파지 가능', () => {
    for (const kind of ['sword', 'blunt', 'spear', 'bow', 'crossbow', 'staff', 'tome'] as const) {
      expect(canWieldTwoHanded(kind)).toBe(true);
    }
  });

  it('방패 없이 양손 파지 시 무기공격력 1.3배', () => {
    const base = weaponPower(20, 'sword');
    expect(effectiveWeaponPower(20, 'sword', false)).toBeCloseTo(base * TWO_HANDED_POWER_MULT);
  });

  it('방패(보조 무기) 장착 시 배수 없음', () => {
    const base = weaponPower(20, 'sword');
    expect(effectiveWeaponPower(20, 'sword', true)).toBeCloseTo(base);
  });

  it('단검·투척은 방패가 없어도 배수 없음', () => {
    expect(effectiveWeaponPower(20, 'dagger', false)).toBeCloseTo(weaponPower(20, 'dagger'));
    expect(effectiveWeaponPower(20, 'thrown', false)).toBeCloseTo(weaponPower(20, 'thrown'));
  });
});
