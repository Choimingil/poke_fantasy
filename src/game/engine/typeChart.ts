import type { CombatType, JobDef, JobTraitId, Skill } from '../types';

const BEATS: Record<CombatType, CombatType> = {
  melee: 'ranged',
  ranged: 'magic',
  magic: 'melee',
};

/** 스킬 타입이 방어자의 직업 타입을 상대로 갖는 상성 배율(유리 2배 / 불리 0.5배 / 무관 1배) */
export function typeAdvantageMultiplier(skillType: CombatType, defenderJobType: CombatType): number {
  if (BEATS[skillType] === defenderJobType) return 2;
  if (BEATS[defenderJobType] === skillType) return 0.5;
  return 1;
}

const STAB_BOOST_TRAIT: Partial<Record<CombatType, JobTraitId>> = {
  melee: 'meleePowerBoost',
  magic: 'magicPowerBoost',
  ranged: 'rangedPowerBoost',
};

/** 직업 타입과 스킬 타입이 일치할 때의 자속(STAB) 배율. 특성 보유 시 1.5배 -> 2배로 강화 */
export function stabMultiplier(job: JobDef, skill: Skill): number {
  if (job.type !== skill.type) return 1;
  const boostTrait = STAB_BOOST_TRAIT[skill.type];
  if (boostTrait && job.traits.includes(boostTrait)) return 2;
  return 1.5;
}
