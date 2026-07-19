import type { StatusEffectType } from '../../types';
import { aliveUnitsInRadius } from './helpers';
import type { SkillHandler } from './context';

const DEBUFF_TYPES: StatusEffectType[] = ['taunted', 'legHit', 'bleeding', 'poisoned', 'stunned', 'immobilized'];

// 치료: 주변 1칸 아군 체력을 시전자 지력의 1/5만큼 회복.
const tomeHeal: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 1);
  const healAmount = Math.max(1, Math.round(ctx.actor.baseStats.magicAttack / 5));
  for (const ally of allies) {
    const before = ally.currentHp;
    ally.currentHp = Math.min(ally.baseStats.hp, ally.currentHp + healAmount);
    if (ally.currentHp > before) {
      ctx.log.push(`${ally.name}의 체력을 ${ally.currentHp - before} 회복했다.`);
      ctx.combatEvents.push({ targetId: ally.id, kind: 'heal', amount: ally.currentHp - before });
    }
  }
};

// 정화: 주변 1칸 아군에게 적용된 디버프를 각각 1개씩 제거.
const tomePurify: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 1);
  for (const ally of allies) {
    const idx = ally.statusEffects.findIndex((s) => DEBUFF_TYPES.includes(s.type));
    if (idx >= 0) {
      const removed = ally.statusEffects.splice(idx, 1)[0];
      ctx.log.push(`${ally.name}의 ${removed.type} 디버프가 정화되었다.`);
    } else if (ally.elementOverride) {
      ally.elementOverride = undefined;
      ctx.log.push(`${ally.name}의 약화가 정화되었다.`);
    }
  }
};

// 재행동: 주변 1칸 아군 1명을 재행동시킴(자신·이미 재행동한 아군 제외).
const tomeRecast: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 1);
  const target = allies.find((a) => a.id !== ctx.actor.id && !a.bonusActionPending);
  if (!target) return;
  ctx.onBonusAction(target.id);
  ctx.log.push(`${target.name}가 재행동한다!`);
};

export const TOME_HANDLERS: Record<string, SkillHandler> = {
  tome_heal: tomeHeal,
  tome_purify: tomePurify,
  tome_recast: tomeRecast,
};
