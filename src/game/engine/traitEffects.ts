import type { Character, StatKey } from '../types';
import { manhattan } from './grid';

/** 이번 단계에서 전투 엔진에 효과가 배선된 특성 id(표시용 "효과 반영" 배지). 나머지는 배선 예정. */
export const WIRED_TRAIT_IDS: ReadonlySet<string> = new Set([
  // 공격형(조건부 위력·명중)
  'chaser', 'gale', 'composure', 'flank', 'isolate', 'analyze', 'pressure',
  // 방어형
  'toughness', 'shieldMastery', 'fireResist', 'rearguard',
  // 기동·지형형
  'swimming', 'snowAdapt', 'forester', 'nightSight', 'lightStep',
  // 지원형(회복량)
  'medic', 'corpsman', 'tacticalHeal',
  // 지휘형(피해 감소)
  'bond', 'formation',
  // 성장형
  'trainingFreak', 'porter', 'veteran',
  // 범용형
  'balance',
]);

/** 최대 체력 근사(derivedStats 순환 참조를 피하기 위한 지역 계산, maxHp와 동일 식). */
function estimatedMaxHp(c: Character): number {
  return 20 + c.baseStats.hp * 3 + c.level * 2;
}

const STAT_ORDER: StatKey[] = ['hp', 'attack', 'magicAttack', 'speed', 'endurance'];

/**
 * 전투 계산용 기본 능력치. '균형 감각'(balance) 특성은 가장 낮은 능력치를 +5로 판정한다(장비 요구치 제외).
 * 동률이면 체력·근력·지력·스피드·지구력 순.
 */
export function effectiveBaseStat(c: Character, key: StatKey): number {
  const v = c.baseStats[key];
  if (c.traitId !== 'balance') return v;
  let lowest: StatKey = STAT_ORDER[0];
  for (const k of STAT_ORDER) if (c.baseStats[k] < c.baseStats[lowest]) lowest = k;
  return key === lowest ? v + 5 : v;
}

/** 최대 체력 배수(강인한 체질 +10%). */
export function maxHpTraitMult(c: Character): number {
  return c.traitId === 'toughness' ? 1.1 : 1;
}

/** 방패 방어력 배수(방패 숙련 +15%). */
export function shieldDefenseTraitMult(c: Character): number {
  return c.traitId === 'shieldMastery' ? 1.15 : 1;
}

/** 무기 숙련 피해 난수 하한 가산(노련한 용병 +0.05, 달인은 이미 1.0이라 변화 없음). */
export function proficiencyFloorTraitBonus(c: Character): number {
  return c.traitId === 'veteran' ? 0.05 : 0;
}

/** 무기 숙련 경험치 획득 배수(훈련광 +15%). */
export function proficiencyExpTraitMult(c: Character): number {
  return c.traitId === 'trainingFreak' ? 1.15 : 1;
}

/** 불 타일 피해 분모(불길 내성이면 6, 아니면 4). */
export function fireTileDivisor(c: Character): number {
  return c.traitId === 'fireResist' ? 6 : 4;
}

/** 적재량 가산(kg). 짐꾼 +2. */
export function carryCapacityTraitBonus(c: Character): number {
  return c.traitId === 'porter' ? 2 : 0;
}

/** 회복량 배수: 구호병 +15%, 의무병 인접 +10%(추가), 전술 치료 저체력 대상 +20%. */
export function healTraitMult(healer: Character, target: Character, targetMaxHp: number): number {
  let mult = 1;
  if (healer.traitId === 'medic') mult *= 1.15;
  if (healer.traitId === 'corpsman' && manhattan(healer.position, target.position) <= 1) mult *= 1.1;
  if (healer.traitId === 'tacticalHeal' && target.currentHp <= targetMaxHp * 0.3) mult *= 1.2;
  return mult;
}

export interface TraitAttackMods {
  powerMult: number;
  hitBonus: number;
  ignoreDefenseRatio: number;
  defenderDamageMult: number;
}

/**
 * 직접 공격 시 공격자·방어자 특성으로 인한 보정을 계산한다(applyAttack에서 호출).
 * 배선된 특성만 반영하며, 아군 인접·고립 등 위치 조건은 전달된 팀 배열로 판정한다.
 */
export function computeTraitAttackMods(
  attacker: Character,
  defender: Character,
  defenderMaxHp: number,
  favorableElement: boolean,
  defenderAllies: Character[],
): TraitAttackMods {
  let powerMult = 1;
  let hitBonus = 0;
  let ignoreDefenseRatio = 0;
  let defenderDamageMult = 1;
  const moved = attacker.movedStepsThisTurn ?? 0;

  // 공격자 특성
  switch (attacker.traitId) {
    case 'chaser':
      if (defender.currentHp <= defenderMaxHp * 0.3) powerMult *= 1.15;
      break;
    case 'flank':
      if (defenderAllies.some((a) => a.id !== defender.id && a.currentHp > 0 && manhattan(a.position, defender.position) <= 1)) powerMult *= 1.1;
      break;
    case 'isolate':
      if (!defenderAllies.some((a) => a.id !== defender.id && a.currentHp > 0 && manhattan(a.position, defender.position) <= 2)) powerMult *= 1.15;
      break;
    case 'composure':
      if (moved === 0) hitBonus += 10;
      break;
    case 'gale':
      if (moved >= 3) hitBonus += 10;
      break;
    case 'analyze':
      if (favorableElement) hitBonus += 10;
      break;
    case 'pressure':
      if (defender.currentHp >= defenderMaxHp) ignoreDefenseRatio = Math.max(ignoreDefenseRatio, 0.1);
      break;
    default:
      break;
  }

  // 방어자 특성(받는 피해 감소)
  const adjacentAlly = defenderAllies.some((a) => a.id !== defender.id && a.currentHp > 0 && manhattan(a.position, defender.position) <= 1);
  switch (defender.traitId) {
    case 'bond':
      if (adjacentAlly) defenderDamageMult *= 0.95;
      break;
    case 'rearguard':
      if (defenderAllies.some((a) => a.id !== defender.id && a.currentHp > 0 && a.currentHp <= estimatedMaxHp(a) * 0.5 && manhattan(a.position, defender.position) <= 1)) defenderDamageMult *= 0.9;
      break;
    case 'formation': {
      const orthAllies = defenderAllies.filter((a) => a.id !== defender.id && a.currentHp > 0 && manhattan(a.position, defender.position) === 1).length;
      if (orthAllies >= 2) defenderDamageMult *= 0.95; // 방어력 +5% ≈ 피해 -5% 근사
      break;
    }
    default:
      break;
  }

  return { powerMult, hitBonus, ignoreDefenseRatio, defenderDamageMult };
}
