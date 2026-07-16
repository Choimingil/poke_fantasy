import { SKILLS } from '../../data/skills';
import { aliveUnitsInRadius } from './helpers';
import type { SkillHandler } from './context';

const tomeHeal: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 2);
  const healAmount = Math.max(1, Math.round(ctx.actor.baseStats.magicAttack / 5));
  for (const ally of allies) {
    const before = ally.currentHp;
    ally.currentHp = Math.min(ally.baseStats.hp, ally.currentHp + healAmount);
    if (ally.currentHp > before) ctx.log.push(`${ally.name}의 체력을 ${ally.currentHp - before} 회복했다.`);
  }
};

const tomeRefresh: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 2).filter((u) => u.id !== ctx.actor.id);
  for (const ally of allies) {
    let refreshed = false;
    for (const [skillId, remaining] of Object.entries(ally.skillUses)) {
      const skillDef = SKILLS.find((s) => s.id === skillId);
      if (skillDef?.maxUses !== undefined && remaining < skillDef.maxUses) {
        ally.skillUses[skillId] = remaining + 1;
        refreshed = true;
      }
    }
    if (refreshed) ctx.log.push(`${ally.name}의 기술 사용 횟수가 회복되었다.`);
  }
};

const tomeRecast: SkillHandler = (ctx) => {
  const allies = aliveUnitsInRadius(ctx.actorTeam, ctx.actor.position, ctx.skill.areaRadius ?? 2).filter((u) => u.id !== ctx.actor.id);
  for (const ally of allies) {
    ctx.onBonusAction(ally.id);
    ctx.log.push(`${ally.name}가 재행동한다!`);
  }
};

export const TOME_HANDLERS: Record<string, SkillHandler> = {
  tome_heal: tomeHeal,
  tome_refresh: tomeRefresh,
  tome_recast: tomeRecast,
};
