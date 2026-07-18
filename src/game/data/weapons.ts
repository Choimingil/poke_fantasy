import type { WeaponKind, WeaponTemplate } from '../types';

const MELEE_KINDS: WeaponKind[] = ['sword', 'blunt', 'spear', 'dagger'];

/** 원거리·마법 무기인가(활·석궁·투척·지팡이·마법서). 숲 행동 제약·바위 차단 판정에 쓴다. */
export function isRangedOrMagicKind(kind: WeaponKind): boolean {
  return kind !== 'shield' && !MELEE_KINDS.includes(kind);
}

/** 테스트용: 모든 무기(방패 포함) 무게는 1kg로 고정. */
export const WEAPON_WEIGHT_KG = 1;

/** 단검을 제외한 모든 무기는 착용 레벨이 같으면 공격력도 같다: 착용 레벨 / 2. 단검은 그 값의 3/4. */
export function weaponPower(level: number, kind: WeaponKind): number {
  const base = level / 2;
  return kind === 'dagger' ? base * 0.75 : base;
}

const WEAPONS: WeaponTemplate[] = [
  // 검 (range 1)
  { id: 'sword_short', name: '환도', kind: 'sword', range: 1, baseSpeed: 20, handedness: 'oneHanded' },
  { id: 'sword_great', name: '대검', kind: 'sword', range: 1, baseSpeed: 12, handedness: 'twoHanded' },

  // 둔기 (range 1)
  { id: 'blunt_mace', name: '철퇴', kind: 'blunt', range: 1, baseSpeed: 16, handedness: 'oneHanded' },
  { id: 'blunt_maul', name: '대곤', kind: 'blunt', range: 1, baseSpeed: 10, handedness: 'twoHanded' },

  // 창 (range 2, 리치가 긴 양손 무기)
  { id: 'spear_a', name: '창', kind: 'spear', range: 2, baseSpeed: 14, handedness: 'twoHanded' },

  // 활 (range 2, 항상 양손)
  { id: 'bow_short', name: '각궁', kind: 'bow', range: 2, baseSpeed: 16, handedness: 'twoHanded' },
  { id: 'bow_long', name: '장궁', kind: 'bow', range: 2, baseSpeed: 14, handedness: 'twoHanded' },

  // 석궁 (range 2, 항상 양손, 활보다 느림)
  { id: 'crossbow_a', name: '석궁', kind: 'crossbow', range: 2, baseSpeed: 12, handedness: 'twoHanded' },

  // 마법서 (range 1, 한손)
  { id: 'tome_east', name: '주술서', kind: 'tome', range: 1, baseSpeed: 18, handedness: 'oneHanded' },
  { id: 'tome_west', name: '마법서', kind: 'tome', range: 1, baseSpeed: 18, handedness: 'oneHanded' },

  // 지팡이 (range 2, 항상 양손) — element는 WeaponInstance에서 지정
  { id: 'staff_east', name: '법장', kind: 'staff', range: 2, baseSpeed: 13, handedness: 'twoHanded' },
  { id: 'staff_west', name: '스태프', kind: 'staff', range: 2, baseSpeed: 13, handedness: 'twoHanded' },

  // 단검 (range 1, 한손, 빠름 — 공격력은 weaponPower()에서 3/4 적용)
  { id: 'dagger_a', name: '단검', kind: 'dagger', range: 1, baseSpeed: 24, handedness: 'oneHanded' },

  // 투척무기 (range 2, 한손)
  { id: 'thrown_a', name: '투척무기', kind: 'thrown', range: 2, baseSpeed: 20, handedness: 'oneHanded' },

  // 방패 — 스킬 없는 순수 스탯 아이템 (한손 무기와 병용 가능), 부가효과 없음
  // defenseBonus는 새 데미지 공식(최종데미지 = 공격력 - 방어력) 규모에 맞춘 값(placeholder).
  { id: 'shield_round', name: '원형 방패', kind: 'shield', range: 1, baseSpeed: 12, handedness: 'oneHanded', defenseBonus: 3 },
  { id: 'shield_tower', name: '타워 방패', kind: 'shield', range: 1, baseSpeed: 8, handedness: 'oneHanded', defenseBonus: 6 },
];

export function getWeapon(templateId: string): WeaponTemplate {
  const weapon = WEAPONS.find((w) => w.id === templateId);
  if (!weapon) throw new Error(`Unknown weapon template: ${templateId}`);
  return weapon;
}
