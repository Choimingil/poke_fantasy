import type { Character, JobDef, Skill } from '../types';

export interface TurnCandidate {
  characterId: string;
  character: Character;
  job: JobDef;
  skill: Skill;
  weaponSpeed: number;
}

function isChangeSkill(skill: Skill): boolean {
  return skill.category === 'buff' || skill.category === 'debuff' || skill.category === 'status';
}

function effectivePriority(c: TurnCandidate): number {
  let priority = c.skill.priority;
  if (c.job.traits.includes('fullHpRangedPriorityUp') && c.skill.type === 'ranged' && c.character.currentHp >= c.character.baseStats.hp) {
    priority += 1;
  }
  if (c.job.traits.includes('statusPriorityUp') && isChangeSkill(c.skill)) {
    priority += 1;
  }
  return priority;
}

function effectiveSpeed(c: TurnCandidate): number {
  let speed = c.character.baseStats.speed + c.weaponSpeed;
  const isParalyzed = c.character.statusEffects.some((s) => s.effect === 'paralysis');
  if (isParalyzed) speed *= 0.5;
  return speed;
}

/** 우선도 -> (우선도 동률 시) 스피드 순으로 내림차순 정렬. 완전 동률은 rng로 판정 */
export function determineTurnOrder(candidates: TurnCandidate[], rng: () => number = Math.random): TurnCandidate[] {
  // 비교 함수 안에서 매번 rng()를 새로 호출하면 sort 구현체가 어떤 순서로 비교를 수행하는지에 따라
  // 결과가 달라지는(비결정적인) 버그가 생기므로, 동률 판정용 난수는 정렬 전에 한 번씩만 뽑아 고정한다.
  const tieBreak = new Map(candidates.map((c) => [c.characterId, rng()]));
  return [...candidates].sort((a, b) => {
    const priorityDiff = effectivePriority(b) - effectivePriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    const speedDiff = effectiveSpeed(b) - effectiveSpeed(a);
    if (speedDiff !== 0) return speedDiff;
    return tieBreak.get(b.characterId)! - tieBreak.get(a.characterId)!;
  });
}
