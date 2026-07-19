import { weaknessOf } from '../elements';
import { mentalResistChance } from '../derivedStats';
import { aliveUnitsInRadius, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

// 원소탄: 장착 지팡이 속성 단일 대상 공격.
const staffBolt: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
};

// 약화: 2턴 동안 대상 속성을 지팡이 속성의 약점 속성으로 변경.
const staffWeaken: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
  if (!target) return;
  if (target.isBoss) {
    ctx.log.push('보스에게는 약화 효과가 통하지 않는다.');
    return;
  }
  const weaponInstance = ctx.actor.inventory.find((w) => w.instanceId === ctx.actor.equippedWeaponId);
  const staffElement = weaponInstance?.element;
  if (!staffElement || staffElement === 'none') return;
  if (ctx.rng() < mentalResistChance(target)) {
    ctx.log.push(`${target.name}는 정신력으로 약화 효과를 무시했다.`);
    return;
  }
  target.elementOverride = weaknessOf(staffElement);
  target.elementOverrideTurns = 2;
  ctx.log.push(`${target.name}의 속성이 약화되었다.`);
};

// 원소폭풍: 중심 대상 150%, 주변 1칸 적 100%.
const staffMeteor: SkillHandler = (ctx) => {
  const radius = ctx.skill.areaRadius ?? 1;
  const targets = aliveUnitsInRadius(ctx.enemyTeam, ctx.targetPos, radius);
  for (const target of targets) {
    const isCenter = target.position.x === ctx.targetPos.x && target.position.y === ctx.targetPos.y;
    dealDamageTo(ctx, target, { powerOverride: isCenter ? ctx.skill.power : 100, suppressProc: !isCenter });
  }
};

export const STAFF_HANDLERS: Record<string, SkillHandler> = {
  staff_bolt: staffBolt,
  staff_weaken: staffWeaken,
  staff_meteor: staffMeteor,
};
