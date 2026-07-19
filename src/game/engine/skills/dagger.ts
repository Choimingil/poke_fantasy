import { applyStatusTo, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

// 기습: 공격 후 반경 2칸 추가 이동.
const daggerAmbush: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
  ctx.requestFollowup?.(ctx.actor.id, { kind: 'move', radius: ctx.skill.followupMoveRadius ?? 2 });
};

// 은신: 1턴 동안 투명(공격/범위피격 시 해제).
const daggerStealth: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'hidden', { turnsRemaining: 1 }, ctx.log, '은신');
};

// 축지: 시야 내 아군 인접 빈칸으로 순간이동 후 추가 행동 가능. targetPos는 battle에서 검증된 목적지.
const daggerWarp: SkillHandler = (ctx) => {
  ctx.actor.position = { x: ctx.targetPos.x, y: ctx.targetPos.y };
  ctx.log.push(`${ctx.actor.name}가 축지로 순간이동했다.`);
  ctx.requestFollowup?.(ctx.actor.id, { kind: 'action' });
};

export const DAGGER_HANDLERS: Record<string, SkillHandler> = {
  dagger_ambush: daggerAmbush,
  dagger_stealth: daggerStealth,
  dagger_warp: daggerWarp,
};
