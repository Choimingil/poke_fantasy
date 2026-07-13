import type { StatusEffectType, WeaponTemplate } from '../types';

export interface WeaponProcResult {
  pierce: boolean; // 방어 일부 무시(창/쇠뇌/지팡이)
  bonusStatus?: StatusEffectType; // 검=출혈, 둔기=기절, 투척=랜덤 속성 상태이상
  extraHit: boolean; // 활 연사: 0.3배 추가타격
}

const THROWN_STATUS_POOL: StatusEffectType[] = ['poison', 'sleep', 'paralysis'];

/** 무기 강화도가 높을수록 부가효과 발동이 안정적으로(=신뢰도 있게) 향상된다 */
function enhancedChance(base: number, enhancementLevel: number): number {
  return Math.min(1, base + enhancementLevel * 0.02);
}

export function rollWeaponProc(weapon: WeaponTemplate, enhancementLevel: number, rng: () => number = Math.random): WeaponProcResult {
  const twoHandedBonus = weapon.handedness === 'twoHanded' ? 2 : 1;

  switch (weapon.kind) {
    case 'sword': {
      const chance = enhancedChance(0.2 * twoHandedBonus, enhancementLevel);
      return { pierce: false, extraHit: false, bonusStatus: rng() < chance ? 'bleed' : undefined };
    }
    case 'blunt': {
      const chance = enhancedChance(0.15 * twoHandedBonus, enhancementLevel);
      return { pierce: false, extraHit: false, bonusStatus: rng() < chance ? 'stun' : undefined };
    }
    case 'spear':
    case 'crossbow':
    case 'staff': {
      const chance = enhancedChance(0.3, enhancementLevel);
      return { pierce: rng() < chance, extraHit: false };
    }
    case 'bow': {
      const chance = enhancedChance(0.3, enhancementLevel);
      return { pierce: false, extraHit: rng() < chance };
    }
    case 'thrown': {
      const chance = enhancedChance(0.25, enhancementLevel);
      const proc = rng() < chance;
      const status = proc ? THROWN_STATUS_POOL[Math.floor(rng() * THROWN_STATUS_POOL.length)] : undefined;
      return { pierce: false, extraHit: false, bonusStatus: status };
    }
    case 'shield':
    default:
      return { pierce: false, extraHit: false };
  }
}
