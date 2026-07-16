import { weaknessOf } from '../elements';
import { aliveUnitsInRadius, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

const staffBolt: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId);
  if (target) dealDamageTo(ctx, target);
};

const staffWeaken: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId);
  if (!target) return;
  const weaponInstance = ctx.actor.inventory.find((w) => w.instanceId === ctx.actor.equippedWeaponId);
  const staffElement = weaponInstance?.element;
  if (!staffElement || staffElement === 'none') return;
  target.elementOverride = weaknessOf(staffElement);
  ctx.log.push(`${target.name}의 속성이 ${target.elementOverride}(으)로 바뀌었다.`);
};

const staffBurst: SkillHandler = (ctx) => {
  const targets = aliveUnitsInRadius(ctx.enemyTeam, ctx.targetPos, ctx.skill.areaRadius ?? 1);
  for (const target of targets) dealDamageTo(ctx, target);
};

export const STAFF_HANDLERS: Record<string, SkillHandler> = {
  staff_bolt: staffBolt,
  staff_weaken: staffWeaken,
  staff_burst: staffBurst,
};
