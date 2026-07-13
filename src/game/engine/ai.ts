import { getSkill } from '../data/skills';
import { getWeapon } from '../data/weapons';
import type { Character } from '../types';
import type { BattleAction } from './battle';

/** 간단한 상대 AI: 현재 장비 무기 타입과 일치하는 사용 가능 스킬 중 하나를 무작위로 선택한다 */
export function pickAiAction(character: Character, rng: () => number = Math.random): BattleAction {
  const weapon = getWeapon(character.equippedWeapon.templateId);
  const usable = character.skills
    .map((id) => getSkill(id))
    .filter((skill) => skill.type === weapon.type)
    .filter((skill) => skill.category !== 'defense' || weapon.kind === 'shield');

  if (usable.length === 0) return {};
  const choice = usable[Math.floor(rng() * usable.length)];
  return { skillId: choice.id };
}
