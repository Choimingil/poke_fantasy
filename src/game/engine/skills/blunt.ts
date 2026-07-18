import { aliveUnitsInRadius, applyStatusTo, applyDebuffTo, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

const SHIELD_NEGATE_CHANCE = 0.4;

function findEnemyTarget(ctx: Parameters<SkillHandler>[0]) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId);
}

const bluntLeghit: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target);
  if (target.currentHp > 0) applyDebuffTo(ctx, target, 'legHit', { turnsRemaining: 3, magnitude: -0.5 }, '다리 부상');
};

const bluntUnity: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 2);
  for (const ally of allies) {
    applyStatusTo(ally, 'bluntUnity', { turnsRemaining: 3, magnitude: 1.2, noStack: true }, ctx.log, '단결');
  }
};

const bluntCrush: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target);
  if (target.currentHp > 0 && target.equippedShieldId && ctx.rng() < SHIELD_NEGATE_CHANCE) {
    ctx.negatedShields.add(target.equippedShieldId);
    ctx.log.push(`${target.name}의 방패가 무력화되었다!`);
  }
};

export const BLUNT_HANDLERS: Record<string, SkillHandler> = {
  blunt_leghit: bluntLeghit,
  blunt_unity: bluntUnity,
  blunt_crush: bluntCrush,
};
