import type { Character, Faction, StatBlock, WeaponInstance } from '../types';

export interface CreateCharacterOptions {
  id: string;
  name: string;
  jobId: string;
  faction: Faction;
  stats: StatBlock;
  weapon: WeaponInstance;
  skills: string[];
  armorEnhancementLevel?: number;
}

export function createCharacter(opts: CreateCharacterOptions): Character {
  return {
    id: opts.id,
    name: opts.name,
    jobId: opts.jobId,
    faction: opts.faction,
    baseStats: opts.stats,
    currentHp: opts.stats.hp,
    equippedWeapon: opts.weapon,
    armorEnhancementLevel: opts.armorEnhancementLevel ?? 0,
    skills: opts.skills,
    statusEffects: [],
    hitsTakenThisBattle: 0,
    weaponSwitchedThisTurn: false,
    isActive: false,
    statMultipliers: { attack: 1, defense: 1 },
    guarding: false,
  };
}
