import { applyStatusTo, applyDebuffTo, dealDamageTo, knockbackTarget } from './helpers';
import type { SkillContext, SkillHandler } from './context';

const SHOVE_STUN_CHANCE = 0.5;

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

// 밀쳐내기: 1칸 넉백. 밀려날 수 없으면 50% 확률로 1턴 기절.
const bluntShove: SkillHandler = (ctx) => {
  const target = findEnemyTarget(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (target.currentHp <= 0) return;
  if (knockbackTarget(ctx, target)) {
    ctx.log.push(`${target.name}가 밀려났다.`);
  } else if (ctx.rng() < SHOVE_STUN_CHANCE) {
    applyDebuffTo(ctx, target, 'stunned', { turnsRemaining: 1 }, '기절');
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
