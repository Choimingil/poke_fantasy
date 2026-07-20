import type { Character, Element, Skill, WeaponTemplate } from '../types';
import { hasWeaponPassive, proficiencyFloor } from '../data/promotions';
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

/** 피해 배수(속성·급소·조건부 위력)의 상한. */
const DAMAGE_MULT_CAP = 2.5;
/** 최소 데미지 보장: 방어를 무시한 기술 피해의 이 비율만큼은 항상 들어간다. */
const MIN_DAMAGE_RATIO = 0.1;

export function calculateDamage(ctx: DamageContext): DamageResult {
  const rng = ctx.rng ?? Math.random;
  const { attacker, skill, weapon } = ctx;

  // 마법부여: 주스탯 = 높은 능력치 + 낮은 능력치의 50%
  const stat =
    ctx.statSource === 'combined'
      ? Math.min(
          Math.max(attacker.baseStats.attack, attacker.baseStats.magicAttack) * 1.5, // 높은 능력치의 1.5배 상한
          Math.max(attacker.baseStats.attack, attacker.baseStats.magicAttack) +
            0.5 * Math.min(attacker.baseStats.attack, attacker.baseStats.magicAttack),
        )
      : ctx.statSource === 'magic'
        ? attacker.baseStats.magicAttack
        : attacker.baseStats.attack;

  // 무기 숙련도(전직과 별개, 초보 0.7 ~ 달인 1.0)에 따른 랜덤 하한과 100% 사이 균등 난수.
  const floor = proficiencyFloor(attacker, weapon.kind);
  const masteryRoll = floor + rng() * (1 - floor);
  const skillPower = skill.power / 100;

  // 위력 있는 공격 기술에만 붙는 패시브/조건부 위력 배수(0% 보조기술엔 미적용).
  let passivePowerMult = 1;
  if (skill.power > 0) {
    if (weapon.kind === 'sword' && ctx.movedAtLeast2 && hasWeaponPassive(attacker, 'sword', 'sprint')) passivePowerMult *= 1.2;
    passivePowerMult *= ctx.finalPowerMult ?? 1;
  }

  // 기본 공격력 = (주스탯/6 + 무기 공격력) x 숙련도~100% 랜덤값 x 기술위력
  const baseAttack = (stat / 6 + ctx.weaponPower) * masteryRoll * skillPower;

  const rawDefense = ctx.defenderDefense ?? 0;
  const defense = ctx.ignoreDefense ? 0 : rawDefense * (1 - (ctx.ignoreDefenseRatio ?? 0));

  let elementMult = elementMultiplier(ctx.attackerElement, ctx.defenderElement);
  // 지팡이 증폭: 약점(1.3배)을 1.6배로 강화
  if (elementMult === 1.3 && hasWeaponPassive(attacker, 'staff', 'amplify')) elementMult = 1.6;

  const crit = !!ctx.weaponCrit;

  // 피해 배수(속성·급소·질주·쇄상 등)는 최대 2.5배로 제한한다.
  const powerMult = Math.min(DAMAGE_MULT_CAP, passivePowerMult * elementMult * (crit ? 1.5 : 1));

  // 피해 감소 효과: 광역보호 상태(대신 받는 태세)이면 20% 감소.
  const reduction = ctx.defender.statusEffects.some((s) => s.type === 'guardWide') ? 0.8 : 1;

  // 최종데미지 = (기본 공격력 - 방어력) x 피해 배수 x 피해감소. 방어를 무시한 기술 피해의 10%가 최소 보장된다.
  const afterDefense = (baseAttack - defense) * powerMult * reduction;
  const minDamage = baseAttack * powerMult * reduction * MIN_DAMAGE_RATIO;
  const total = Math.max(minDamage, afterDefense);
  return { damage: Math.max(1, Math.round(total)), crit };
}
