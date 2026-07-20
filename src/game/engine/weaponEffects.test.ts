import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { rollWeaponProc, PROC_CHANCE } from './weaponEffects';

function makeCharacter(weaponTemplateId: string, procEffect?: 'bleed' | 'stun' | 'pierce' | 'focus' | 'crit') {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    baseStats: { hp: 5, attack: 5, magicAttack: 5, speed: 5, endurance: 5 },
    sight: 3,
    starterWeaponTemplateId: weaponTemplateId,
    starterWeaponProcEffect: procEffect,
  });
}

describe('rollWeaponProc', () => {
  it('검은 출혈, 둔기는 기절 등 종류별로 고정된 부가효과를 30% 확률로 굴린다', () => {
    const swordUser = makeCharacter('sword_short');
    expect(rollWeaponProc(swordUser, 'sword', () => 0)).toBe('bleed'); // 0 < 30% → 발동
    expect(rollWeaponProc(swordUser, 'sword', () => 0.99)).toBeNull(); // 발동 실패

    const bluntUser = makeCharacter('blunt_mace');
    expect(rollWeaponProc(bluntUser, 'blunt', () => 0)).toBe('stun');
  });

  it('창=관통, 활=집중, 석궁=급소로 고정된다', () => {
    expect(rollWeaponProc(makeCharacter('spear_a'), 'spear', () => 0)).toBe('pierce');
    expect(rollWeaponProc(makeCharacter('bow_short'), 'bow', () => 0)).toBe('focus');
    expect(rollWeaponProc(makeCharacter('crossbow_a'), 'crossbow', () => 0)).toBe('crit');
  });

  it('마법서/투척무기는 인스턴스마다 선택한 부가효과를 사용한다', () => {
    const tomeUser = makeCharacter('tome_east', 'crit');
    expect(rollWeaponProc(tomeUser, 'tome', () => 0)).toBe('crit');

    const tomeNoSelection = makeCharacter('tome_east');
    expect(rollWeaponProc(tomeNoSelection, 'tome', () => 0)).toBeNull(); // 선택 안 하면 효과 없음
  });

  it('지팡이·단검·방패는 부가효과가 없다', () => {
    expect(rollWeaponProc(makeCharacter('staff_east'), 'staff', () => 0)).toBeNull();
    expect(rollWeaponProc(makeCharacter('dagger_a'), 'dagger', () => 0)).toBeNull();
    expect(rollWeaponProc(makeCharacter('shield_round'), 'shield', () => 0)).toBeNull();
  });

  it('부가효과별 발동 확률: 검 출혈·창 관통·활 집중 30%, 둔기 충격·석궁 급소 20%', () => {
    expect(PROC_CHANCE.bleed).toBe(0.3);
    expect(PROC_CHANCE.pierce).toBe(0.3);
    expect(PROC_CHANCE.focus).toBe(0.3);
    expect(PROC_CHANCE.stun).toBe(0.2);
    expect(PROC_CHANCE.crit).toBe(0.2);
    // 둔기 충격(20%)은 0.25에서 실패, 검 출혈(30%)은 0.25에서 발동한다.
    expect(rollWeaponProc(makeCharacter('blunt_mace'), 'blunt', () => 0.25)).toBeNull();
    expect(rollWeaponProc(makeCharacter('sword_short'), 'sword', () => 0.25)).toBe('bleed');
  });
});
