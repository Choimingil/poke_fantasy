import type { Character, JobDef, Skill, WeaponTemplate } from '../types';
import { stabMultiplier, typeAdvantageMultiplier } from './typeChart';
import { rollWeaponProc, type WeaponProcResult } from './weaponEffects';

export interface DamageContext {
  attacker: Character;
  attackerJob: JobDef;
  defender: Character;
  defenderJob: JobDef;
  skill: Skill;
  weapon: WeaponTemplate;
  /** 방어측 진영에 등장 중인 딜반감 특성(장군/기사) 보유자가 있는지 여부 */
  defendingTeamHasFieldGuard: boolean;
  rng?: () => number;
}

export interface DamageResult {
  damage: number;
  extraHitDamage: number;
  crit: boolean;
  proc: WeaponProcResult;
}

function berserkerMultiplier(attacker: Character, attackerJob: JobDef): number {
  if (!attackerJob.traits.includes('berserkerRage')) return 1;
  const bonus = Math.min(1, attacker.hitsTakenThisBattle * 0.2);
  return 1 + bonus;
}

export function calculateDamage(ctx: DamageContext): DamageResult {
  const rng = ctx.rng ?? Math.random;
  const { attacker, attackerJob, defender, defenderJob, skill, weapon } = ctx;

  const proc = rollWeaponProc(weapon, ctx.attacker.equippedWeapon.enhancementLevel, rng);

  const effectiveAttack =
    attacker.baseStats.attack * berserkerMultiplier(attacker, attackerJob) * attacker.statMultipliers.attack;
  const effectivePower = skill.power + weapon.basePower * 0.5;
  const effectiveDefense =
    defender.baseStats.defense * (proc.pierce ? 0.5 : 1) * defender.statMultipliers.defense;

  const raw = (effectiveAttack * effectivePower) / (effectiveDefense + 50);
  const stab = stabMultiplier(attackerJob, skill);
  const typeAdv = typeAdvantageMultiplier(skill.type, defenderJob.type);

  const critChance = Math.max(0, 0.0625 - defender.armorEnhancementLevel * 0.01);
  const crit = rng() < critChance;

  const varianceWidth = 0.1 * Math.max(0, 1 - attacker.equippedWeapon.enhancementLevel * 0.1);
  const variance = 1 - varianceWidth + rng() * varianceWidth * 2;

  const fieldGuard = ctx.defendingTeamHasFieldGuard ? 0.75 : 1;
  const guardStance = defender.guarding ? 0.5 : 1;

  const total = raw * stab * typeAdv * (crit ? 1.5 : 1) * variance * fieldGuard * guardStance;
  const damage = Math.max(1, Math.round(total));
  const extraHitDamage = proc.extraHit ? Math.max(1, Math.round(damage * 0.3)) : 0;

  return { damage, extraHitDamage, crit, proc };
}
