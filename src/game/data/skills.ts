import type { Skill, WeaponTemplate } from '../types';

const SKILLS: Skill[] = [
  // ============================ 공통 기술 (4) ============================
  // 모든 직업이 배울 수 있는 변화(유틸) 기술. 무기 타입과 무관하게 사용 가능.
  {
    id: 'guard', name: '방어', type: 'melee', category: 'defense', power: 0, accuracy: 100, priority: 1, target: 'self',
    description: '상대 공격에 대한 피해 0', typeLabel: '변화', accuracyLabel: '100% (연속 사용 시 33%)',
    fullGuard: true, consecutivePenaltyAccuracy: 33, learnableBy: 'common',
  },
  {
    id: 'war_cry', name: '기합', type: 'melee', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self',
    description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: 'common',
  },
  {
    id: 'weaken', name: '약화', type: 'magic', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy',
    description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: 'common',
  },
  {
    id: 'first_aid', name: '응급처치', type: 'magic', category: 'heal', power: 0, accuracy: 100, priority: 0, target: 'self',
    description: '체력 25% 회복', typeLabel: '변화', healPercent: 0.25, learnableBy: 'common',
  },

  // ======================= 동양 근거리 =======================
  // 장군(east_general)
  { id: 'power_strike', name: '강타', type: 'melee', category: 'attack', power: 60, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 60', typeLabel: '근거리', learnableBy: ['east_general'] },
  { id: 'general_sweep', name: '횡소천군', type: 'melee', category: 'attack', power: 45, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 45', typeLabel: '근거리', learnableBy: ['east_general'] },
  { id: 'general_charge', name: '돌격', type: 'melee', category: 'attack', power: 80, accuracy: 80, priority: 0, target: 'enemy', description: '위력 : 80', typeLabel: '근거리', learnableBy: ['east_general'] },
  { id: 'general_roar', name: '위압', type: 'melee', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['east_general'] },

  // 협객(east_duelist)
  { id: 'slash', name: '베기', type: 'melee', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 40', typeLabel: '근거리', learnableBy: ['east_duelist'] },
  { id: 'duelist_flurry', name: '연격', type: 'melee', category: 'attack', power: 25, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 25 로 2~3회 공격', typeLabel: '근거리', hits: { min: 2, max: 3 }, learnableBy: ['east_duelist'] },
  { id: 'duelist_final', name: '필살일섬', type: 'melee', category: 'attack', power: 90, accuracy: 80, priority: 0, target: 'enemy', description: '위력 : 90', typeLabel: '근거리', learnableBy: ['east_duelist'] },
  { id: 'duelist_focus', name: '심안', type: 'melee', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['east_duelist'] },

  // ======================= 동양 마법 =======================
  // 참모(east_strategist)
  { id: 'strat_fire', name: '화계', type: 'magic', category: 'attack', power: 50, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 50', typeLabel: '마법', learnableBy: ['east_strategist'] },
  { id: 'strat_heal', name: '치료술', type: 'magic', category: 'heal', power: 0, accuracy: 100, priority: 0, target: 'self', description: '체력 40% 회복', typeLabel: '마법', healPercent: 0.4, learnableBy: ['east_strategist'] },
  { id: 'strat_weaken', name: '허실계', type: 'magic', category: 'debuff', power: 0, accuracy: 95, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['east_strategist'] },
  { id: 'strat_scheme', name: '신산', type: 'magic', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['east_strategist'] },

  // 주술사(east_shaman)
  { id: 'fire_bolt', name: '화염구', type: 'magic', category: 'attack', power: 55, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 55, 십자 범위(선택 칸 + 상하좌우 1칸) 광역', typeLabel: '마법', aoeRadius: 1, learnableBy: ['east_shaman'] },
  { id: 'shaman_frost', name: '빙결술', type: 'magic', category: 'attack', power: 50, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 50, 15% 확률로 수면', typeLabel: '마법', statusEffect: { effect: 'sleep', chance: 0.15 }, learnableBy: ['east_shaman'] },
  { id: 'shaman_curse', name: '저주', type: 'magic', category: 'attack', power: 45, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 45, 35% 확률로 중독', typeLabel: '마법', statusEffect: { effect: 'poison', chance: 0.35 }, learnableBy: ['east_shaman'] },
  { id: 'shaman_thunder', name: '뇌격', type: 'magic', category: 'attack', power: 60, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 60, 25% 확률로 마비', typeLabel: '마법', statusEffect: { effect: 'paralysis', chance: 0.25 }, learnableBy: ['east_shaman'] },

  // ======================= 동양 원거리 =======================
  // 궁수(east_archer)
  { id: 'rapid_shot', name: '연사', type: 'ranged', category: 'attack', power: 20, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 20 으로 1~5회 중 랜덤으로 공격', typeLabel: '원거리', hits: { min: 1, max: 5 }, learnableBy: ['east_archer'] },
  { id: 'aimed_shot', name: '조준사격', type: 'ranged', category: 'attack', power: 65, accuracy: 85, priority: 0, target: 'enemy', description: '위력 : 65', typeLabel: '원거리', learnableBy: ['east_archer'] },
  { id: 'archer_pin', name: '견제사격', type: 'ranged', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 40, 20% 확률로 마비', typeLabel: '원거리', statusEffect: { effect: 'paralysis', chance: 0.2 }, learnableBy: ['east_archer'] },
  { id: 'archer_focus', name: '정조준', type: 'ranged', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['east_archer'] },

  // 닌자(east_ninja)
  { id: 'quick_shot', name: '속사', type: 'ranged', category: 'attack', power: 35, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 35', typeLabel: '원거리', learnableBy: ['east_ninja'] },
  { id: 'ninja_shuriken', name: '표창난무', type: 'ranged', category: 'attack', power: 18, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 18 로 2~4회 공격', typeLabel: '원거리', hits: { min: 2, max: 4 }, learnableBy: ['east_ninja'] },
  { id: 'ninja_poison', name: '독침', type: 'ranged', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 40, 35% 확률로 중독', typeLabel: '원거리', statusEffect: { effect: 'poison', chance: 0.35 }, learnableBy: ['east_ninja'] },
  { id: 'ninja_smoke', name: '연막', type: 'ranged', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['east_ninja'] },

  // ======================= 서양 근거리 =======================
  // 기사(west_knight)
  { id: 'knight_smite', name: '성스러운 일격', type: 'melee', category: 'attack', power: 55, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 55', typeLabel: '근거리', learnableBy: ['west_knight'] },
  { id: 'knight_bash', name: '방패치기', type: 'melee', category: 'attack', power: 40, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 40, 30% 확률로 마비', typeLabel: '근거리', statusEffect: { effect: 'paralysis', chance: 0.3 }, learnableBy: ['west_knight'] },
  { id: 'knight_crusade', name: '심판', type: 'melee', category: 'attack', power: 75, accuracy: 85, priority: 0, target: 'enemy', description: '위력 : 75', typeLabel: '근거리', learnableBy: ['west_knight'] },
  { id: 'knight_taunt', name: '도발', type: 'melee', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['west_knight'] },

  // 광전사(west_berserker)
  { id: 'berserker_cleave', name: '광폭베기', type: 'melee', category: 'attack', power: 70, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 70', typeLabel: '근거리', learnableBy: ['west_berserker'] },
  { id: 'berserker_rampage', name: '난격', type: 'melee', category: 'attack', power: 30, accuracy: 85, priority: 0, target: 'enemy', description: '위력 : 30 로 2~4회 공격', typeLabel: '근거리', hits: { min: 2, max: 4 }, learnableBy: ['west_berserker'] },
  { id: 'berserker_reckless', name: '결사', type: 'melee', category: 'attack', power: 95, accuracy: 75, priority: 0, target: 'enemy', description: '위력 : 95', typeLabel: '근거리', learnableBy: ['west_berserker'] },
  { id: 'berserker_bloodlust', name: '피의 갈증', type: 'melee', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['west_berserker'] },

  // ======================= 서양 마법 =======================
  // 프리스트(west_priest)
  { id: 'priest_heal', name: '회복', type: 'magic', category: 'heal', power: 0, accuracy: 100, priority: 0, target: 'self', description: '체력 50% 회복', typeLabel: '마법', healPercent: 0.5, learnableBy: ['west_priest'] },
  { id: 'priest_smite', name: '심판의 빛', type: 'magic', category: 'attack', power: 50, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 50', typeLabel: '마법', learnableBy: ['west_priest'] },
  { id: 'priest_bless', name: '축복', type: 'magic', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['west_priest'] },
  { id: 'priest_barrier', name: '성역', type: 'magic', category: 'defense', power: 0, accuracy: 100, priority: 1, target: 'self', description: '상대 공격에 대한 피해 0', typeLabel: '변화', accuracyLabel: '100% (연속 사용 시 33%)', fullGuard: true, consecutivePenaltyAccuracy: 33, learnableBy: ['west_priest'] },

  // 마녀(west_witch)
  { id: 'witch_fireball', name: '화염 폭발', type: 'magic', category: 'attack', power: 65, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 65', typeLabel: '마법', learnableBy: ['west_witch'] },
  { id: 'witch_frost', name: '서리 사슬', type: 'magic', category: 'attack', power: 45, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 45, 20% 확률로 수면', typeLabel: '마법', statusEffect: { effect: 'sleep', chance: 0.2 }, learnableBy: ['west_witch'] },
  { id: 'witch_hex', name: '저주술', type: 'magic', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['west_witch'] },
  { id: 'witch_venom', name: '맹독 안개', type: 'magic', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 40, 40% 확률로 중독', typeLabel: '마법', statusEffect: { effect: 'poison', chance: 0.4 }, learnableBy: ['west_witch'] },

  // ======================= 서양 원거리 =======================
  // 궁수(west_archer)
  { id: 'warcher_rapid', name: '속사연발', type: 'ranged', category: 'attack', power: 20, accuracy: 90, priority: 0, target: 'enemy', description: '위력 : 20 으로 1~5회 중 랜덤으로 공격', typeLabel: '원거리', hits: { min: 1, max: 5 }, learnableBy: ['west_archer'] },
  { id: 'warcher_precise', name: '정밀사격', type: 'ranged', category: 'attack', power: 70, accuracy: 85, priority: 0, target: 'enemy', description: '위력 : 70', typeLabel: '원거리', learnableBy: ['west_archer'] },
  { id: 'warcher_volley', name: '견제', type: 'ranged', category: 'attack', power: 45, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 45', typeLabel: '원거리', learnableBy: ['west_archer'] },
  { id: 'warcher_mark', name: '표식', type: 'ranged', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', description: '상대의 방어력 하락', typeLabel: '변화', learnableBy: ['west_archer'] },

  // 레인저(west_ranger)
  { id: 'ranger_twinshot', name: '쌍연사', type: 'ranged', category: 'attack', power: 30, accuracy: 95, priority: 0, target: 'enemy', description: '위력 : 30 로 2회 공격', typeLabel: '원거리', hits: { min: 2, max: 2 }, learnableBy: ['west_ranger'] },
  { id: 'ranger_snipe', name: '저격', type: 'ranged', category: 'attack', power: 85, accuracy: 80, priority: 0, target: 'enemy', description: '위력 : 85', typeLabel: '원거리', learnableBy: ['west_ranger'] },
  { id: 'ranger_poison', name: '독화살', type: 'ranged', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', description: '위력 : 40, 35% 확률로 중독', typeLabel: '원거리', statusEffect: { effect: 'poison', chance: 0.35 }, learnableBy: ['west_ranger'] },
  { id: 'ranger_dash', name: '질주', type: 'ranged', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', description: '자신의 공격력 1.2배 상승', typeLabel: '변화', learnableBy: ['west_ranger'] },
];

export function getSkill(id: string): Skill {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}

/** 특정 직업이 배울 수 있는 모든 기술(공통 + 직업 전용)을 반환한다. */
export function getLearnableSkills(jobId: string): Skill[] {
  return SKILLS.filter((s) => s.learnableBy === 'common' || (Array.isArray(s.learnableBy) && s.learnableBy.includes(jobId)));
}

/**
 * 현재 장착 무기로 해당 기술을 쓸 수 있는지 여부.
 * 공격 기술은 무기 타입이 일치해야 하고, 변화(유틸) 기술은 무기와 무관하게 사용 가능하다.
 */
export function skillUsableWithWeapon(skill: Skill, weapon: WeaponTemplate): boolean {
  if (skill.category === 'attack') return skill.type === weapon.type;
  return true;
}
