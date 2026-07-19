import { manhattan } from '../grid';
import { dealDamageTo, dashThroughTarget, isFreeTile } from './helpers';
import type { SkillContext, SkillHandler } from './context';

function findEnemy(ctx: SkillContext) {
  return ctx.enemyTeam.find((u) => u.id === ctx.targetId && u.currentHp > 0);
}

// 반월참: 대상 + 시전자 인접(전방 부채꼴)에 걸치는 적들을 함께 타격.
const swordCrescent: SkillHandler = (ctx) => {
  const target = findEnemy(ctx);
  if (!target) return;
  const arc = ctx.enemyTeam.filter(
    (u) => u.currentHp > 0 && manhattan(u.position, ctx.actor.position) <= 1 && manhattan(u.position, target.position) <= 1,
  );
  const targets = arc.some((u) => u.id === target.id) ? arc : [target, ...arc];
  const seen = new Set<string>();
  for (const t of targets) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    dealDamageTo(ctx, t);
  }
};

// 일섬: 대상은 제자리, 시전자가 공격 후 대상을 관통해 그 1칸 뒤로 이동한다.
const swordFlash: SkillHandler = (ctx) => {
  const target = findEnemy(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (dashThroughTarget(ctx, target)) ctx.log.push(`${ctx.actor.name}가 일섬으로 파고들었다.`);
};

// 섬광참: 사거리 2. 대상 앞(대상 인접, 시전자에서 가장 가까운 빈칸)까지 이동한 뒤 공격.
const swordBlink: SkillHandler = (ctx) => {
  const target = findEnemy(ctx);
  if (!target) return;
  const around = [
    { x: target.position.x + 1, y: target.position.y },
    { x: target.position.x - 1, y: target.position.y },
    { x: target.position.x, y: target.position.y + 1 },
    { x: target.position.x, y: target.position.y - 1 },
  ].filter((p) => isFreeTile(ctx, p));
  if (around.length > 0) {
    around.sort((a, b) => manhattan(a, ctx.actor.position) - manhattan(b, ctx.actor.position));
    ctx.actor.position = around[0];
    ctx.log.push(`${ctx.actor.name}가 섬광처럼 파고들었다.`);
  }
  dealDamageTo(ctx, target, { triggersReactions: true });
};

export const SWORD_HANDLERS: Record<string, SkillHandler> = {
  sword_crescent: swordCrescent,
  sword_flash: swordFlash,
  sword_blink: swordBlink,
};
