import type { ActiveStatus, Character, StatusEffectType } from '../types';

const STATUS_DURATION: Record<StatusEffectType, number> = {
  poison: 4,
  bleed: 3,
  sleep: 1,
  stun: 1,
  paralysis: 3,
};

const DOT_RATIO: Partial<Record<StatusEffectType, number>> = {
  poison: 1 / 16,
  bleed: 1 / 12,
};

const SKIP_TURN_EFFECTS: StatusEffectType[] = ['sleep', 'stun'];

/** 방어구 강화도가 높을수록 상태이상에 걸릴 확률이 줄어든다(억까 방지) */
export function tryApplyStatus(
  character: Character,
  effect: StatusEffectType,
  baseChance: number,
  rng: () => number = Math.random,
): boolean {
  const resistedChance = Math.max(0, baseChance * (1 - character.armorEnhancementLevel * 0.05));
  if (rng() >= resistedChance) return false;
  if (character.statusEffects.some((s) => s.effect === effect)) return true;
  const status: ActiveStatus = { effect, turnsRemaining: STATUS_DURATION[effect] };
  character.statusEffects.push(status);
  return true;
}

export interface StatusTickResult {
  skipTurn: boolean;
  dotDamage: number;
  expired: StatusEffectType[];
}

/** 턴 시작 시 상태이상을 처리한다: 도트 데미지 적용, 행동불가 여부 판정, 지속시간 감소 */
export function tickStatusAtTurnStart(character: Character): StatusTickResult {
  let skipTurn = false;
  let dotDamage = 0;
  const expired: StatusEffectType[] = [];

  for (const status of character.statusEffects) {
    if (SKIP_TURN_EFFECTS.includes(status.effect)) skipTurn = true;
    const dotRatio = DOT_RATIO[status.effect];
    if (dotRatio) dotDamage += Math.max(1, Math.round(character.baseStats.hp * dotRatio));
  }

  character.statusEffects = character.statusEffects
    .map((s) => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
    .filter((s) => {
      if (s.turnsRemaining <= 0) {
        expired.push(s.effect);
        return false;
      }
      return true;
    });

  if (dotDamage > 0) character.currentHp = Math.max(0, character.currentHp - dotDamage);

  return { skipTurn, dotDamage, expired };
}
