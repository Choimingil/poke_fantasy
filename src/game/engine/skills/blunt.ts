import { applyStatusTo, applyDebuffTo, dealDamageTo, knockbackTarget } from './helpers';
import type { SkillContext, SkillHandler } from './context';

function findEnemyTarget(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 다리 타격: 3턴 동안 이동력 -1(중복 적용 불가).
const bluntLeghit: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (target.currentHp > 0) applyDebuffTo(ctx, target, 'legHit', { turnsRemaining: 3, magnitude: -1, noStack: true }, '다리 부상');
};

// 밀쳐내기: 1칸 넉백. 밀려날 수 없으면(벽·보스 등) 추가 피해 20%. 기절 효과는 없음.
const bluntShove: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (target.currentHp <= 0) return;
  if (knockbackTarget(ctx, target)) {
    ctx.log.push(`${target.name}가 밀려났다.`);
  } else {
    ctx.log.push(`${target.name}가 밀려나지 않아 추가 피해를 입었다.`);
    dealDamageTo(ctx, target, { powerOverride: ctx.skill.power * 0.2, suppressProc: true, suppressCrit: true, triggersReactions: false });
  }
};

// 광역보호: 2턴 동안 경호 반경이 2칸으로, 라운드당 경호 발동 횟수가 2회로 증가.
const bluntWideGuard: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'guardWide', { turnsRemaining: 2, magnitude: 2 }, ctx.log, '광역보호');
};

export const BLUNT_HANDLERS: Record<string, SkillHandler> = {
  blunt_leghit: bluntLeghit,
  blunt_shove: bluntShove,
  blunt_wideguard: bluntWideGuard,
};
