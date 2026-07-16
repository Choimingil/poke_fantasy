import { aliveUnitsInRadius, applyStatusTo, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

const swordDraw: SkillHandler = (ctx) => {
  const targets = aliveUnitsInRadius(ctx.enemyTeam, ctx.actor.position, ctx.skill.areaRadius ?? 1);
  for (const target of targets) dealDamageTo(ctx, target);
};

const swordAwaken: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 2);
  for (const ally of allies) {
    applyStatusTo(ally, 'swordAwaken', { turnsRemaining: 3, magnitude: 1.2, noStack: true }, ctx.log, '각성');
  }
};

const swordFlurry: SkillHandler = (ctx) => {
  const target = [...ctx.enemyTeam].find((u) => u.id === ctx.targetId);
  if (!target) return;
  const hits = ctx.skill.hits ?? 1;
  for (let i = 0; i < hits && target.currentHp > 0; i++) dealDamageTo(ctx, target);
};

export const SWORD_HANDLERS: Record<string, SkillHandler> = {
  sword_draw: swordDraw,
  sword_awaken: swordAwaken,
  sword_flurry: swordFlurry,
};
