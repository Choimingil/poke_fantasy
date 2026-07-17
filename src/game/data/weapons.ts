import type { WeaponKind, WeaponTemplate } from '../types';

const MELEE_KINDS: WeaponKind[] = ['sword', 'blunt', 'spear', 'dagger'];

/** 원거리·마법 무기인가(활·석궁·투척·지팡이·마법서). 숲 행동 제약·바위 차단 판정에 쓴다. */
export function isRangedOrMagicKind(kind: WeaponKind): boolean {
  return kind !== 'shield' && !MELEE_KINDS.includes(kind);
}

const WEAPONS: WeaponTemplate[] = [
  // 검 (range 1)
  { id: 'sword_short', name: '환도', kind: 'sword', range: 1, basePower: 40, baseSpeed: 20, handedness: 'oneHanded' },
  { id: 'sword_great', name: '대검', kind: 'sword', range: 1, basePower: 58, baseSpeed: 12, handedness: 'twoHanded' },

  // 둔기 (range 1)
  { id: 'blunt_mace', name: '철퇴', kind: 'blunt', range: 1, basePower: 42, baseSpeed: 16, handedness: 'oneHanded' },
  { id: 'blunt_maul', name: '대곤', kind: 'blunt', range: 1, basePower: 60, baseSpeed: 10, handedness: 'twoHanded' },

  // 활 (range 2, 항상 양손)
  { id: 'bow_short', name: '각궁', kind: 'bow', range: 2, basePower: 50, baseSpeed: 16, handedness: 'twoHanded' },
  { id: 'bow_long', name: '장궁', kind: 'bow', range: 2, basePower: 54, baseSpeed: 14, handedness: 'twoHanded' },

  // 지팡이 (range 2, 항상 양손) — element는 WeaponInstance에서 지정
  { id: 'staff_east', name: '법장', kind: 'staff', range: 2, basePower: 50, baseSpeed: 13, handedness: 'twoHanded' },
  { id: 'staff_west', name: '스태프', kind: 'staff', range: 2, basePower: 50, baseSpeed: 13, handedness: 'twoHanded' },

  // 마법서 (range 1, 한손)
  { id: 'tome_east', name: '주술서', kind: 'tome', range: 1, basePower: 40, baseSpeed: 18, handedness: 'oneHanded' },
  { id: 'tome_west', name: '마법서', kind: 'tome', range: 1, basePower: 40, baseSpeed: 18, handedness: 'oneHanded' },

  // 방패 — 스킬 없는 순수 스탯 아이템 (한손 무기와 병용 가능), 부가효과 없음
  { id: 'shield_round', name: '원형 방패', kind: 'shield', range: 1, basePower: 0, baseSpeed: 12, handedness: 'oneHanded', defenseBonus: 15 },
  { id: 'shield_tower', name: '타워 방패', kind: 'shield', range: 1, basePower: 0, baseSpeed: 8, handedness: 'oneHanded', defenseBonus: 25 },
];

export function getWeapon(templateId: string): WeaponTemplate {
  const weapon = WEAPONS.find((w) => w.id === templateId);
  if (!weapon) throw new Error(`Unknown weapon template: ${templateId}`);
  return weapon;
}
