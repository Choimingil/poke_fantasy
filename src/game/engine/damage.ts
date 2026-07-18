import type { Character, Element, Skill, WeaponTemplate } from '../types';
import { TIER1_BONUS, hasTier5Passive, masteryTier } from '../data/promotions';
import { elementMultiplier } from './elements';
import { getStatus } from './status';

export interface DamageContext {
  attacker: Character;
  defender: Character;
  skill: Skill;
  weapon: WeaponTemplate;
  /** 장착 무기 인스턴스의 착용 레벨로 계산한 공격력(단검은 3/4 적용됨) */
  weaponPower: number;
  attackerElement: Element;
  defenderElement: Element;
  /** 'combined' == 마법부여 사용 중(근력+지력 합산) */
  statSource: 'attack' | 'magic' | 'combined';
  /** 방어구+방패 방어력 합(무력화된 방패는 이미 제외된 값) */
  defenderDefense?: number;
  /** 창 관통: 방어력을 완전히 무시 */
  ignoreDefense?: boolean;
  /** 석궁/급소 등 무기 부가효과로 인한 크리티컬 */
  weaponCrit?: boolean;
  rng?: () => number;
}

export interface DamageResult {
  damage: number;
  crit: boolean;
}

/** 숙련도 티어(0~6)에 따른 랜덤 배율 하한. 명세에 구체 수치가 없어 새로 설계한 placeholder(티어0=50% ~ 티어6=100%). */
function masteryRandomFloor(tier: number): number {
  return 0.5 + (tier / 6) * 0.5;
}

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

  const tier = masteryTier(attacker, weapon.kind);
  const tier1PowerBonus = tier >= 1 ? (TIER1_BONUS[weapon.kind]?.powerBonusPercent ?? 0) : 0;
  const floor = masteryRandomFloor(tier);
  const masteryRoll = floor + rng() * (1 - floor);
  const skillPower = skill.power / 100;

  // 최종공격력 = (주스탯/6 + 무기 공격력) x 숙련도~100% 랜덤값 x 기술위력 (+ 티어1 위력 보너스)
  const attackPower = (stat / 6 + ctx.weaponPower) * (1 + tier1PowerBonus / 100) * masteryRoll * skillPower;

  const defense = ctx.ignoreDefense ? 0 : (ctx.defenderDefense ?? 0) * bluntUnityMultiplier(defender);

  let elementMult = elementMultiplier(ctx.attackerElement, ctx.defenderElement);
  if (elementMult === 0.7 && hasTier5Passive(defender, 'staff', 'elementalWard')) elementMult = 1;

  const critStatus = getStatus(attacker, 'bowCrit');
  const crit = !!ctx.weaponCrit || (!!critStatus && rng() < (critStatus.magnitude ?? 0.3));

  let lowHpBonus = 1;
  if (weapon.kind === 'sword' && hasTier5Passive(attacker, 'sword', 'lowHpPowerSurge') && attacker.currentHp / attacker.baseStats.hp <= 0.3) {
    lowHpBonus = 1.2;
  }

  // 최종데미지 = 최종공격력 - 방어력
  const total = (attackPower - defense) * elementMult * (crit ? 1.5 : 1) * lowHpBonus;
  return { damage: Math.max(1, Math.round(total)), crit };
}
