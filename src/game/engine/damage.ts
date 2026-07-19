import type { Character, Element, Skill, WeaponTemplate } from '../types';
import { TIER1_BONUS, hasTier5Passive, masteryTier } from '../data/promotions';
import { elementMultiplier } from './elements';

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
  /** 철갑사격: 방어력의 일부(0~1)만 무시 */
  ignoreDefenseRatio?: number;
  /** 석궁/급소 등 무기 부가효과로 인한 크리티컬 */
  weaponCrit?: boolean;
  /** 검 질주: 일반 이동 2칸 이상 후 공격(위력 스킬 ×1.2) */
  movedAtLeast2?: boolean;
  /** 쇄상 등 최종 위력 배수(디버프 대상 1.3배). */
  finalPowerMult?: number;
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

export function calculateDamage(ctx: DamageContext): DamageResult {
  const rng = ctx.rng ?? Math.random;
  const { attacker, skill, weapon } = ctx;

  // 마법부여: 주스탯 = 높은 능력치 + 낮은 능력치의 50%
  const stat =
    ctx.statSource === 'combined'
      ? Math.max(attacker.baseStats.attack, attacker.baseStats.magicAttack) +
        0.5 * Math.min(attacker.baseStats.attack, attacker.baseStats.magicAttack)
      : ctx.statSource === 'magic'
        ? attacker.baseStats.magicAttack
        : attacker.baseStats.attack;

  const tier = masteryTier(attacker, weapon.kind);
  const tier1PowerBonus = tier >= 1 ? (TIER1_BONUS[weapon.kind]?.powerBonusPercent ?? 0) : 0;
  const floor = masteryRandomFloor(tier);
  const masteryRoll = floor + rng() * (1 - floor);
  const skillPower = skill.power / 100;

  // 위력 있는 공격 기술에만 붙는 패시브/조건부 위력 배수(0% 보조기술엔 미적용).
  let passivePowerMult = 1;
  if (skill.power > 0) {
    if (weapon.kind === 'sword' && ctx.movedAtLeast2 && hasTier5Passive(attacker, 'sword', 'sprint')) passivePowerMult *= 1.2;
    passivePowerMult *= ctx.finalPowerMult ?? 1;
  }

  // 최종공격력 = (주스탯/6 + 무기 공격력) x 숙련도~100% 랜덤값 x 기술위력 (+ 티어1 위력 보너스)
  const attackPower = (stat / 6 + ctx.weaponPower) * (1 + tier1PowerBonus / 100) * masteryRoll * skillPower * passivePowerMult;

  const rawDefense = ctx.defenderDefense ?? 0;
  const defense = ctx.ignoreDefense ? 0 : rawDefense * (1 - (ctx.ignoreDefenseRatio ?? 0));

  let elementMult = elementMultiplier(ctx.attackerElement, ctx.defenderElement);
  // 지팡이 증폭: 약점(1.3배)을 1.6배로 강화
  if (elementMult === 1.3 && hasTier5Passive(attacker, 'staff', 'amplify')) elementMult = 1.6;

  const crit = !!ctx.weaponCrit;

  // 최종데미지 = 최종공격력 - 방어력
  const total = (attackPower - defense) * elementMult * (crit ? 1.5 : 1);
  return { damage: Math.max(1, Math.round(total)), crit };
}
