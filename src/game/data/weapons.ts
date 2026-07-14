import type { WeaponTemplate } from '../types';

export const WEAPONS: WeaponTemplate[] = [
  // 근거리 - 한손
  { id: 'sword_1h_east', name: '환도', type: 'melee', kind: 'sword', handedness: 'oneHanded', culture: 'east', basePower: 40, baseSpeed: 20 },
  { id: 'sword_1h_west', name: '롱소드', type: 'melee', kind: 'sword', handedness: 'oneHanded', culture: 'west', basePower: 40, baseSpeed: 20 },
  { id: 'blunt_1h_east', name: '철퇴', type: 'melee', kind: 'blunt', handedness: 'oneHanded', culture: 'east', basePower: 42, baseSpeed: 16 },
  { id: 'blunt_1h_west', name: '메이스', type: 'melee', kind: 'blunt', handedness: 'oneHanded', culture: 'west', basePower: 42, baseSpeed: 16 },
  { id: 'shield_1h_east', name: '방패(동)', type: 'melee', kind: 'shield', handedness: 'oneHanded', culture: 'east', basePower: 20, baseSpeed: 12 },
  { id: 'shield_1h_west', name: '방패(서)', type: 'melee', kind: 'shield', handedness: 'oneHanded', culture: 'west', basePower: 20, baseSpeed: 12 },

  // 근거리 - 두손
  { id: 'sword_2h_east', name: '대검(동)', type: 'melee', kind: 'sword', handedness: 'twoHanded', culture: 'east', basePower: 62, baseSpeed: 10 },
  { id: 'sword_2h_west', name: '그레이트소드', type: 'melee', kind: 'sword', handedness: 'twoHanded', culture: 'west', basePower: 62, baseSpeed: 10 },
  { id: 'blunt_2h_east', name: '대곤', type: 'melee', kind: 'blunt', handedness: 'twoHanded', culture: 'east', basePower: 64, baseSpeed: 8 },
  { id: 'blunt_2h_west', name: '워해머', type: 'melee', kind: 'blunt', handedness: 'twoHanded', culture: 'west', basePower: 64, baseSpeed: 8 },
  { id: 'spear_2h_east', name: '창(동)', type: 'melee', kind: 'spear', handedness: 'twoHanded', culture: 'east', basePower: 58, baseSpeed: 12 },
  { id: 'spear_2h_west', name: '랜스', type: 'melee', kind: 'spear', handedness: 'twoHanded', culture: 'west', basePower: 58, baseSpeed: 12 },

  // 원거리 - 한손
  { id: 'thrown_1h_east', name: '표창', type: 'ranged', kind: 'thrown', handedness: 'oneHanded', culture: 'east', basePower: 36, baseSpeed: 22 },
  { id: 'thrown_1h_west', name: '투척단검', type: 'ranged', kind: 'thrown', handedness: 'oneHanded', culture: 'west', basePower: 36, baseSpeed: 22 },

  // 원거리 - 두손
  { id: 'bow_2h_east', name: '각궁', type: 'ranged', kind: 'bow', handedness: 'twoHanded', culture: 'east', basePower: 56, baseSpeed: 14 },
  { id: 'bow_2h_west', name: '롱보우', type: 'ranged', kind: 'bow', handedness: 'twoHanded', culture: 'west', basePower: 56, baseSpeed: 14 },
  { id: 'crossbow_2h_east', name: '연노', type: 'ranged', kind: 'crossbow', handedness: 'twoHanded', culture: 'east', basePower: 60, baseSpeed: 10 },
  { id: 'crossbow_2h_west', name: '크로스보우', type: 'ranged', kind: 'crossbow', handedness: 'twoHanded', culture: 'west', basePower: 60, baseSpeed: 10 },

  // 마법 - 한손
  { id: 'tome_1h_east', name: '주술서', type: 'magic', kind: 'tome', handedness: 'oneHanded', culture: 'east', basePower: 38, baseSpeed: 20 },
  { id: 'tome_1h_west', name: '마법서', type: 'magic', kind: 'tome', handedness: 'oneHanded', culture: 'west', basePower: 38, baseSpeed: 20 },

  // 마법 - 두손
  { id: 'staff_2h_east', name: '법장', type: 'magic', kind: 'staff', handedness: 'twoHanded', culture: 'east', basePower: 60, baseSpeed: 11 },
  { id: 'staff_2h_west', name: '스태프', type: 'magic', kind: 'staff', handedness: 'twoHanded', culture: 'west', basePower: 60, baseSpeed: 11 },

  // ---- TRPG 전용 3종 (근거리=검, 원거리=활, 마법=지팡이) ----
  { id: 'trpg_sword', name: '검', type: 'melee', kind: 'sword', handedness: 'oneHanded', culture: 'east', basePower: 45, baseSpeed: 18, range: 1, requirement: { attack: 15 } },
  { id: 'trpg_bow', name: '활', type: 'ranged', kind: 'bow', handedness: 'twoHanded', culture: 'east', basePower: 42, baseSpeed: 16, range: 2, requirement: { speed: 12 } },
  { id: 'trpg_staff', name: '지팡이', type: 'magic', kind: 'staff', handedness: 'twoHanded', culture: 'east', basePower: 44, baseSpeed: 14, range: 1, requirement: {} },
];

/** TRPG 무기 사거리(칸). 명시값이 없으면 원거리 2, 그 외 1. */
export function weaponRange(weapon: WeaponTemplate): number {
  if (weapon.range != null) return weapon.range;
  return weapon.type === 'ranged' ? 2 : 1;
}

export function getWeapon(templateId: string): WeaponTemplate {
  const weapon = WEAPONS.find((w) => w.id === templateId);
  if (!weapon) throw new Error(`Unknown weapon template: ${templateId}`);
  return weapon;
}
