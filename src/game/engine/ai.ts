import { getSkill, skillUsableWithWeapon } from '../data/skills';
import { getWeapon } from '../data/weapons';
import type { Character } from '../types';
import type { BattleAction } from './battle';

/** 간단한 상대 AI: 사용 가능한 스킬 중 하나를 고른다(공격 기술이 있으면 공격을 우선). */
export function pickAiAction(character: Character, rng: () => number = Math.random): BattleAction {
  const weapon = getWeapon(character.equippedWeapon.templateId);
  const usable = character.skills.map((id) => getSkill(id)).filter((skill) => skillUsableWithWeapon(skill, weapon));

  if (usable.length === 0) return {};
  const attacks = usable.filter((skill) => skill.category === 'attack');
  const pool = attacks.length > 0 ? attacks : usable;
  const choice = pool[Math.floor(rng() * pool.length)];
  return { skillId: choice.id };
}
