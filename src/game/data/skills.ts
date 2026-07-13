import type { Skill } from '../types';

const SKILLS: Skill[] = [
  // ---- 공통 근거리 ----
  { id: 'slash', name: '베기', type: 'melee', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', learnableBy: 'common' },
  { id: 'power_strike', name: '강타', type: 'melee', category: 'attack', power: 60, accuracy: 90, priority: 0, target: 'enemy', learnableBy: 'common' },
  { id: 'venom_strike', name: '독날베기', type: 'melee', category: 'attack', power: 45, accuracy: 95, priority: 0, target: 'enemy', learnableBy: 'common', statusEffect: { effect: 'poison', chance: 0.3 } },
  { id: 'numbing_blow', name: '마비격', type: 'melee', category: 'attack', power: 45, accuracy: 95, priority: 0, target: 'enemy', learnableBy: 'common', statusEffect: { effect: 'paralysis', chance: 0.3 } },

  // ---- 공통 원거리 ----
  { id: 'quick_shot', name: '속사', type: 'ranged', category: 'attack', power: 35, accuracy: 100, priority: 0, target: 'enemy', learnableBy: 'common' },
  { id: 'aimed_shot', name: '조준사격', type: 'ranged', category: 'attack', power: 65, accuracy: 85, priority: 0, target: 'enemy', learnableBy: 'common' },
  { id: 'poison_dart', name: '독침', type: 'ranged', category: 'attack', power: 40, accuracy: 100, priority: 0, target: 'enemy', learnableBy: 'common', statusEffect: { effect: 'poison', chance: 0.35 } },

  // ---- 공통 마법 ----
  { id: 'fire_bolt', name: '화염구', type: 'magic', category: 'attack', power: 55, accuracy: 95, priority: 0, target: 'enemy', learnableBy: 'common' },
  { id: 'frost_bolt', name: '서리구', type: 'magic', category: 'attack', power: 50, accuracy: 100, priority: 0, target: 'enemy', learnableBy: 'common', statusEffect: { effect: 'sleep', chance: 0.15 } },
  { id: 'lightning_bolt', name: '뇌격', type: 'magic', category: 'attack', power: 50, accuracy: 95, priority: 0, target: 'enemy', learnableBy: 'common', statusEffect: { effect: 'paralysis', chance: 0.25 } },

  // ---- 공통 서포트/변화 ----
  { id: 'guard', name: '방어태세', type: 'melee', category: 'defense', power: 0, accuracy: 100, priority: 1, target: 'self', learnableBy: 'common' },
  { id: 'heal_light', name: '소생술', type: 'magic', category: 'heal', power: 0, accuracy: 100, priority: 0, target: 'ally', healPercent: 0.3, learnableBy: 'common' },
  { id: 'war_cry', name: '기합', type: 'melee', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', learnableBy: 'common' },
  { id: 'weaken', name: '약화', type: 'magic', category: 'debuff', power: 0, accuracy: 90, priority: 0, target: 'enemy', learnableBy: 'common' },

  // ---- 직업 전용스킬 (퀘스트 습득) ----
  { id: 'general_iron_wall', name: '철벽호령', type: 'melee', category: 'defense', power: 0, accuracy: 100, priority: 1, target: 'self', learnableBy: ['east_general'], exclusiveQuest: true },
  { id: 'berserker_bloodlust', name: '피의갈증', type: 'melee', category: 'buff', power: 0, accuracy: 100, priority: 0, target: 'self', learnableBy: ['west_berserker'], exclusiveQuest: true },

  // ---- 히든스킬 (특정 조건 달성 시 해금) ----
  { id: 'duelist_final_strike', name: '필살일섬', type: 'melee', category: 'attack', power: 90, accuracy: 80, priority: 0, target: 'enemy', learnableBy: ['east_duelist'], hidden: true },
];

export function getSkill(id: string): Skill {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}
