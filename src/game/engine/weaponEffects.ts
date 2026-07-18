import type { Character, ProcEffect, WeaponKind } from '../types';

export const WEAPON_PROC_CHANCE = 0.3;

/** 종류가 고정된 무기의 부가효과. 마법서/투척무기는 인스턴스별로 선택(procEffect)하고, 지팡이/단검/방패는 없음. */
const FIXED_KIND_EFFECT: Partial<Record<WeaponKind, ProcEffect>> = {
  sword: 'bleed',
  blunt: 'stun',
  spear: 'pierce',
  bow: 'focus',
  crossbow: 'crit',
};

function resolveWeaponEffect(attacker: Character, weaponKind: WeaponKind): ProcEffect | null {
  if (weaponKind === 'tome' || weaponKind === 'thrown') {
    const instance = attacker.inventory.find((w) => w.instanceId === attacker.equippedWeaponId);
    return instance?.procEffect ?? null;
  }
  return FIXED_KIND_EFFECT[weaponKind] ?? null;
}

/** 공격자의 장착 무기 종류에 해당하는 부가효과가 이번 공격에 발동하는지(30% 확률) 판정한다. */
export function rollWeaponProc(attacker: Character, weaponKind: WeaponKind, rng: () => number): ProcEffect | null {
  const effect = resolveWeaponEffect(attacker, weaponKind);
  if (!effect) return null;
  return rng() < WEAPON_PROC_CHANCE ? effect : null;
}
