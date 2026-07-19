import { dealDamageTo, enemyBehind } from './helpers';
import type { SkillContext, SkillHandler } from './context';

function findEnemyTarget(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 철갑사격: 방어력 20% 무시(ignoreDefenseRatio는 스킬 정의에서 읽음).
const crossbowAp: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (target) dealDamageTo(ctx, target, { triggersReactions: true });
};

// 관통사격: 직선 첫 대상 + 1칸 뒤 적에게 0.5배(2번째는 급소 없음).
const crossbowPierceshot: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  const behind = enemyBehind(ctx, target);
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (behind) dealDamageTo(ctx, behind, { powerOverride: ctx.skill.power * 0.5, suppressCrit: true });
};

// 치명사격: 최대체력 50% 고정피해(방어·속성·급소·위력 무시). fixedDamagePercent는 스킬 정의에서 읽음.
const crossbowLethal: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (target) dealDamageTo(ctx, target, { suppressProc: true });
};

export const CROSSBOW_HANDLERS: Record<string, SkillHandler> = {
  xbow_ap: crossbowAp,
  xbow_pierceshot: crossbowPierceshot,
  xbow_lethal: crossbowLethal,
};
