import { createCharacter } from '../engine/characterFactory';
import type { Character, StatBlock } from '../types';

interface RosterEntry {
  jobId: string;
  name: string;
  stats: StatBlock;
  weaponTemplateId: string;
  skills: string[];
}

const ROSTER_DEFS: RosterEntry[] = [
  // 동양
  { jobId: 'east_general', name: '관우', stats: { attack: 32, defense: 40, hp: 130, speed: 14 }, weaponTemplateId: 'spear_2h_east', skills: ['slash', 'power_strike', 'guard', 'war_cry'] },
  { jobId: 'east_duelist', name: '단화', stats: { attack: 44, defense: 22, hp: 95, speed: 26 }, weaponTemplateId: 'sword_1h_east', skills: ['slash', 'power_strike', 'venom_strike', 'war_cry'] },
  { jobId: 'east_strategist', name: '제갈', stats: { attack: 30, defense: 26, hp: 100, speed: 20 }, weaponTemplateId: 'tome_1h_east', skills: ['fire_bolt', 'frost_bolt', 'heal_light', 'weaken', 'war_cry'] },
  { jobId: 'east_shaman', name: '무당', stats: { attack: 42, defense: 22, hp: 95, speed: 20 }, weaponTemplateId: 'staff_2h_east', skills: ['fire_bolt', 'frost_bolt', 'lightning_bolt', 'weaken'] },
  { jobId: 'east_archer', name: '이서', stats: { attack: 40, defense: 22, hp: 100, speed: 24 }, weaponTemplateId: 'bow_2h_east', skills: ['quick_shot', 'aimed_shot', 'poison_dart', 'guard'] },
  { jobId: 'east_ninja', name: '하야', stats: { attack: 36, defense: 24, hp: 100, speed: 28 }, weaponTemplateId: 'thrown_1h_east', skills: ['quick_shot', 'venom_strike', 'poison_dart', 'heal_light'] },

  // 서양
  { jobId: 'west_knight', name: '레온', stats: { attack: 32, defense: 42, hp: 130, speed: 13 }, weaponTemplateId: 'sword_1h_west', skills: ['slash', 'power_strike', 'guard', 'war_cry'] },
  { jobId: 'west_berserker', name: '그림', stats: { attack: 46, defense: 18, hp: 100, speed: 18 }, weaponTemplateId: 'sword_2h_west', skills: ['slash', 'power_strike', 'numbing_blow', 'war_cry'] },
  { jobId: 'west_priest', name: '셀리아', stats: { attack: 26, defense: 26, hp: 105, speed: 18 }, weaponTemplateId: 'tome_1h_west', skills: ['fire_bolt', 'heal_light', 'weaken', 'guard'] },
  { jobId: 'west_witch', name: '모르가나', stats: { attack: 42, defense: 20, hp: 95, speed: 22 }, weaponTemplateId: 'staff_2h_west', skills: ['fire_bolt', 'frost_bolt', 'lightning_bolt', 'weaken'] },
  { jobId: 'west_archer', name: '로빈', stats: { attack: 40, defense: 22, hp: 100, speed: 24 }, weaponTemplateId: 'bow_2h_west', skills: ['quick_shot', 'aimed_shot', 'poison_dart', 'guard'] },
  { jobId: 'west_ranger', name: '실바', stats: { attack: 36, defense: 24, hp: 100, speed: 28 }, weaponTemplateId: 'thrown_1h_west', skills: ['quick_shot', 'venom_strike', 'poison_dart', 'heal_light'] },
];

export const ROSTER: Character[] = ROSTER_DEFS.map((entry) =>
  createCharacter({
    id: entry.jobId,
    name: entry.name,
    jobId: entry.jobId,
    faction: entry.jobId.startsWith('east') ? 'east' : 'west',
    stats: entry.stats,
    weapon: { templateId: entry.weaponTemplateId, enhancementLevel: 0 },
    skills: entry.skills,
  }),
);

export function cloneRosterCharacter(jobId: string): Character {
  const template = ROSTER.find((c) => c.jobId === jobId);
  if (!template) throw new Error(`Unknown roster entry: ${jobId}`);
  return createCharacter({
    id: template.id,
    name: template.name,
    jobId: template.jobId,
    faction: template.faction,
    stats: { ...template.baseStats },
    weapon: { ...template.equippedWeapon },
    skills: [...template.skills],
  });
}
