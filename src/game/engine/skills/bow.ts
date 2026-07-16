import { applyStatusTo, dealDamageTo } from './helpers';
import type { SkillHandler } from './context';

const TILE_BURN_TURNS = 2;

const bowFlame: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId);
  if (!target) return;
  dealDamageTo(ctx, target);
  const tile = ctx.map.tiles[target.position.y][target.position.x];
  tile.status = { type: 'burning', turnsRemaining: TILE_BURN_TURNS };
  ctx.log.push(`${target.name}가 있던 타일이 불타오른다.`);
};

const bowPinpoint: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'bowCrit', { turnsRemaining: 2, magnitude: 0.3 }, ctx.log, '급소');
};

const bowSnipe: SkillHandler = (ctx) => {
  const target = ctx.enemyTeam.find((u) => u.id === ctx.targetId);
  if (target) dealDamageTo(ctx, target);
};

export const BOW_HANDLERS: Record<string, SkillHandler> = {
  bow_flame: bowFlame,
  bow_pinpoint: bowPinpoint,
  bow_snipe: bowSnipe,
};
