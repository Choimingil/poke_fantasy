import { dealDamageTo } from './helpers';
import type { SkillContext, SkillHandler } from './context';

function findEnemyTarget(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 천궁: 사거리 보정(언덕 +1)은 battle 사거리 판정에서 처리한다. 효과는 일반 공격.
const bowSkyshot: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
};

// 도약사격: 공격 후 1칸 추가 이동(엔진에 후속 이동 요청).
const bowLeapshot: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
  ctx.requestFollowup?.(ctx.actor.id, { kind: 'move', radius: ctx.skill.followupMoveRadius ?? 1 });
};

// 저격: 시야 내 최대 5칸(장애물 차단은 battle에서 판정). 일반 공격.
const bowSnipe: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
};

export const BOW_HANDLERS: Record<string, SkillHandler> = {
  bow_skyshot: bowSkyshot,
  bow_leapshot: bowLeapshot,
  bow_snipe: bowSnipe,
};
