import { manhattan } from '../grid';
import { dealDamageTo, knockbackTarget, isFreeTile } from './helpers';
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

// 일섬: 공격 후 대상을 공격 방향으로 1칸 밀어낸다.
const swordFlash: SkillHandler = (ctx) => {
  const target = findEnemy(ctx);
  if (!target) return;
  dealDamageTo(ctx, target, { triggersReactions: true });
  if (target.currentHp > 0 && knockbackTarget(ctx, target)) ctx.log.push(`${target.name}가 밀려났다.`);
};

// 섬광참: 대상 인접 빈칸까지 돌진한 뒤 공격.
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
