import type { JobDef } from '../types';

const JOBS: JobDef[] = [
  // ---- 동양 기본직 (1차 전직 전) ----
  { id: 'east_warrior', name: '무사(견습)', faction: 'east', type: 'melee', tier: 0, skillSlots: 4, traits: [] },
  { id: 'east_mage', name: '학사(견습)', faction: 'east', type: 'magic', tier: 0, skillSlots: 4, traits: [] },
  { id: 'east_striker', name: '무예(견습)', faction: 'east', type: 'ranged', tier: 0, skillSlots: 4, traits: [] },

  // ---- 동양 1차 전직 ----
  {
    id: 'east_general', name: '장군', faction: 'east', type: 'melee', tier: 1, parentId: 'east_warrior',
    skillSlots: 4, traits: ['onFieldDamageReduction'],
  },
  {
    id: 'east_duelist', name: '협객', faction: 'east', type: 'melee', tier: 1, parentId: 'east_warrior',
    skillSlots: 4, traits: ['meleePowerBoost'],
  },
  {
    id: 'east_strategist', name: '참모', faction: 'east', type: 'magic', tier: 1, parentId: 'east_mage',
    skillSlots: 5, traits: ['extraSkillSlot'],
  },
  {
    id: 'east_shaman', name: '주술사', faction: 'east', type: 'magic', tier: 1, parentId: 'east_mage',
    skillSlots: 4, traits: ['magicPowerBoost'],
  },
  {
    id: 'east_archer', name: '궁수(동)', faction: 'east', type: 'ranged', tier: 1, parentId: 'east_striker',
    skillSlots: 4, traits: ['fullHpRangedPriorityUp'], fixedWeaponType: 'ranged',
  },
  {
    id: 'east_ninja', name: '닌자', faction: 'east', type: 'ranged', tier: 1, parentId: 'east_striker',
    skillSlots: 4, traits: ['freeWeaponSwitch'],
  },

  // ---- 서양 기본직 (1차 전직 전) ----
  { id: 'west_warrior', name: '수습검사', faction: 'west', type: 'melee', tier: 0, skillSlots: 4, traits: [] },
  { id: 'west_mage', name: '수습마법사', faction: 'west', type: 'magic', tier: 0, skillSlots: 4, traits: [] },
  { id: 'west_striker', name: '수습사냥꾼', faction: 'west', type: 'ranged', tier: 0, skillSlots: 4, traits: [] },

  // ---- 서양 1차 전직 ----
  {
    id: 'west_knight', name: '기사', faction: 'west', type: 'melee', tier: 1, parentId: 'west_warrior',
    skillSlots: 4, traits: ['onFieldDamageReduction'],
  },
  {
    id: 'west_berserker', name: '광전사', faction: 'west', type: 'melee', tier: 1, parentId: 'west_warrior',
    skillSlots: 4, traits: ['berserkerRage'], fixedHandedness: 'twoHanded',
  },
  {
    id: 'west_priest', name: '프리스트', faction: 'west', type: 'magic', tier: 1, parentId: 'west_mage',
    skillSlots: 4, traits: ['priestEntryHeal'],
  },
  {
    id: 'west_witch', name: '마녀', faction: 'west', type: 'magic', tier: 1, parentId: 'west_mage',
    skillSlots: 4, traits: ['statusPriorityUp'],
  },
  {
    id: 'west_archer', name: '궁수(서)', faction: 'west', type: 'ranged', tier: 1, parentId: 'west_striker',
    skillSlots: 4, traits: ['rangedPowerBoost'], fixedWeaponType: 'ranged',
  },
  {
    id: 'west_ranger', name: '레인저', faction: 'west', type: 'ranged', tier: 1, parentId: 'west_striker',
    skillSlots: 4, traits: ['freeWeaponSwitch'],
  },
];

export function getJob(jobId: string): JobDef {
  const job = JOBS.find((j) => j.id === jobId);
  if (!job) throw new Error(`Unknown job: ${jobId}`);
  return job;
}
