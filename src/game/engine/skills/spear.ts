import { applyDebuffTo, dealDamageTo, enemyBehind } from './helpers';
import type { SkillContext, SkillHandler } from './context';

const CHARGE_NEGATE_CHANCE = 0.3;

function findEnemyTarget(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 꿰뚫기: 대상 1칸 뒤 적에게 0.5배 피해.
const spearPierce: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  const behind = enemyBehind(ctx, target);
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (behind) dealDamageTo(ctx, behind, { powerOverride: ctx.skill.power * 0.5, suppressProc: true });
};

// 봉쇄: 대상을 1턴 동안 이동 불가.
const spearLock: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  applyDebuffTo(ctx, target, 'immobilized', { turnsRemaining: 1 }, '봉쇄');
};

// 돌진: 방패 착용 대상에게 30% 확률로 3턴 방패 방어력 0.
const spearCharge: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  // 보스는 방패 무력화에 저항한다.
  if (target.currentHp > 0 && !target.isBoss && target.equippedShieldId && ctx.rng() < CHARGE_NEGATE_CHANCE) {
    ctx.negatedShields.set(target.equippedShieldId, 3);
    ctx.log.push(`${target.name}의 방패가 무력화되었다!`);
  }
};

export const SPEAR_HANDLERS: Record<string, SkillHandler> = {
  spear_pierce: spearPierce,
  spear_lock: spearLock,
  spear_charge: spearCharge,
};
