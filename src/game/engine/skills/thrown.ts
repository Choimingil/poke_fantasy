import type { Character, StatusEffectType } from '../../types';
import { applyStatusTo, applyDebuffTo, dealDamageTo } from './helpers';
import type { SkillContext, SkillHandler } from './context';

const POISON_CHANCE = 0.3;
const DEBUFF_TYPES: StatusEffectType[] = ['taunted', 'legHit', 'bleeding', 'poisoned', 'shocked', 'moveDown', 'immobilized'];

function isDebuffed(target: Character): boolean {
  return target.statusEffects.some((s) => DEBUFF_TYPES.includes(s.type)) || target.elementOverride !== undefined;
}

function findEnemyTarget(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 맹독: 공격 시 30% 확률로 맹독(출혈형 지속피해, 출혈과 중복 가능).
const thrownPoison: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (target.currentHp > 0 && ctx.rng() < POISON_CHANCE) {
    applyDebuffTo(ctx, target, 'poisoned', { turnsRemaining: 2 }, '맹독');
  }
};

// 분신: 3턴 동안 직접 공격 후 0.3배 추가타 1회.
const thrownClone: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'shadowClone', { turnsRemaining: 3 }, ctx.log, '분신');
};

// 쇄상: 디버프가 적용된 대상에게 최종 위력 1.3배(디버프 개수 무관, 1회 적용).
const thrownChain: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  const mult = isDebuffed(target) ? 1.3 : 1;
  dealDamageTo(ctx, target, { finalPowerMult: mult, triggersReactions: true });
};

export const THROWN_HANDLERS: Record<string, SkillHandler> = {
  thrown_poison: thrownPoison,
  thrown_clone: thrownClone,
  thrown_chain: thrownChain,
};
