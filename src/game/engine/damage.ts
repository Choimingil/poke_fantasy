import type { Character, Element, Skill, WeaponTemplate } from '../types';
import { TIER1_BONUS, hasTier5Passive, masteryTier } from '../data/promotions';
import { elementMultiplier } from './elements';
import { getStatus } from './status';

export interface DamageContext {
  attacker: Character;
  defender: Character;
  skill: Skill;
  weapon: WeaponTemplate;
  attackerElement: Element;
  defenderElement: Element;
  /** 'combined' == 마법부여 사용 중(근력+지력 합산) */
  statSource: 'attack' | 'magic' | 'combined';
  /** 방패 보너스 방어력(무력화된 경우 0) */
  defenderExtraDefense?: number;
  rng?: () => number;
}

export interface DamageResult {
  damage: number;
  crit: boolean;
}

const POWER_BASELINE = 40;
const DEFENSE_BASELINE = 50;

function bluntUnityMultiplier(defender: Character): number {
  const status = getStatus(defender, 'bluntUnity');
  return status ? (status.magnitude ?? 1.2) : 1;
}

export function calculateDamage(ctx: DamageContext): DamageResult {
  const rng = ctx.rng ?? Math.random;
  const { attacker, defender, skill, weapon } = ctx;

  const stat =
    ctx.statSource === 'combined'
      ? attacker.baseStats.attack + attacker.baseStats.magicAttack
      : ctx.statSource === 'magic'
        ? attacker.baseStats.magicAttack
        : attacker.baseStats.attack;

  const tier1PowerBonus = masteryTier(attacker, weapon.kind) >= 1 ? (TIER1_BONUS[weapon.kind]?.powerBonusPercent ?? 0) : 0;
  const effectivePower = (skill.power / 100) * (1 + tier1PowerBonus / 100) * (weapon.basePower + POWER_BASELINE);

  const defenderDefense = defender.baseStats.defense * bluntUnityMultiplier(defender) + (ctx.defenderExtraDefense ?? 0);

  const raw = (stat * effectivePower) / (defenderDefense + DEFENSE_BASELINE);

  let elementMult = elementMultiplier(ctx.attackerElement, ctx.defenderElement);
  if (elementMult === 0.7 && hasTier5Passive(defender, 'staff', 'elementalWard')) elementMult = 1;

  const critStatus = getStatus(attacker, 'bowCrit');
  const crit = !!critStatus && rng() < (critStatus.magnitude ?? 0.3);

  let lowHpBonus = 1;
  if (weapon.kind === 'sword' && hasTier5Passive(attacker, 'sword', 'lowHpPowerSurge') && attacker.currentHp / attacker.baseStats.hp <= 0.3) {
    lowHpBonus = 1.2;
  }

  const variance = 0.95 + rng() * 0.1;

  const total = raw * elementMult * (crit ? 1.5 : 1) * lowHpBonus * variance;
  return { damage: Math.max(1, Math.round(total)), crit };
}
