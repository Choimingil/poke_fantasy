import { createCharacter, type CreateCharacterOptions } from '../engine/characterFactory';
import type { Character } from '../types';

const ROSTER_DEFS: CreateCharacterOptions[] = [
  { id: 'sword_a', name: '환도무사', spriteJob: 'east_duelist', gender: 'male', baseStats: { hp: 130, attack: 34, magicAttack: 10, defense: 26, speed: 18 }, rawMove: 3, sight: 3, starterWeaponTemplateId: 'sword_short', starterShieldTemplateId: 'shield_round', extraWeaponTemplateIds: ['blunt_mace', 'bow_short'] },
  { id: 'sword_b', name: '대검전사', spriteJob: 'west_berserker', gender: 'male', baseStats: { hp: 150, attack: 40, magicAttack: 8, defense: 22, speed: 14 }, rawMove: 3, sight: 3, starterWeaponTemplateId: 'sword_great', extraWeaponTemplateIds: ['blunt_maul'] },
  { id: 'blunt_a', name: '철퇴호위', spriteJob: 'west_knight', gender: 'male', baseStats: { hp: 140, attack: 30, magicAttack: 8, defense: 34, speed: 14 }, rawMove: 2, sight: 3, starterWeaponTemplateId: 'blunt_mace', starterShieldTemplateId: 'shield_tower', extraWeaponTemplateIds: ['sword_short'] },
  { id: 'blunt_b', name: '대곤파괴자', spriteJob: 'east_general', gender: 'male', baseStats: { hp: 150, attack: 38, magicAttack: 8, defense: 26, speed: 10 }, rawMove: 2, sight: 3, starterWeaponTemplateId: 'blunt_maul', extraWeaponTemplateIds: ['sword_great'] },
  { id: 'bow_a', name: '각궁사수', spriteJob: 'east_archer', gender: 'male', baseStats: { hp: 100, attack: 32, magicAttack: 10, defense: 18, speed: 22 }, rawMove: 3, sight: 4, starterWeaponTemplateId: 'bow_short', extraWeaponTemplateIds: ['bow_long', 'sword_short'] },
  { id: 'bow_b', name: '장궁저격수', spriteJob: 'west_ranger', gender: 'female', baseStats: { hp: 95, attack: 34, magicAttack: 10, defense: 16, speed: 24 }, rawMove: 3, sight: 5, starterWeaponTemplateId: 'bow_long', extraWeaponTemplateIds: ['bow_short'] },
  { id: 'staff_a', name: '화염술사', spriteJob: 'west_witch', gender: 'female', baseStats: { hp: 95, attack: 10, magicAttack: 36, defense: 16, speed: 16 }, rawMove: 2, sight: 4, starterWeaponTemplateId: 'staff_east', starterWeaponElement: 'fire', extraWeaponTemplateIds: ['tome_east'] },
  { id: 'staff_b', name: '대지술사', spriteJob: 'east_shaman', gender: 'male', baseStats: { hp: 100, attack: 10, magicAttack: 34, defense: 18, speed: 14 }, rawMove: 2, sight: 4, starterWeaponTemplateId: 'staff_west', starterWeaponElement: 'earth', extraWeaponTemplateIds: ['tome_west'] },
  { id: 'tome_a', name: '사제', spriteJob: 'west_priest', gender: 'female', baseStats: { hp: 100, attack: 10, magicAttack: 32, defense: 20, speed: 18 }, rawMove: 3, sight: 4, starterWeaponTemplateId: 'tome_east', extraWeaponTemplateIds: ['staff_east'] },
  { id: 'tome_b', name: '현자', spriteJob: 'east_strategist', gender: 'male', baseStats: { hp: 95, attack: 10, magicAttack: 34, defense: 18, speed: 18 }, rawMove: 3, sight: 4, starterWeaponTemplateId: 'tome_west', extraWeaponTemplateIds: ['staff_west'] },
];

export const ROSTER: Character[] = ROSTER_DEFS.map((entry) => createCharacter(entry));

export function cloneRosterCharacter(id: string): Character {
  const entry = ROSTER_DEFS.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown roster entry: ${id}`);
  return createCharacter(entry);
}
