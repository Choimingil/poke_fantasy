import type { Element } from '../../types';
import { dealDamageTo, applyStatusTo } from './helpers';
import type { SkillContext, SkillHandler } from './context';

const ELEMENT_NAMES: Record<Exclude<Element, 'none'>, string> = {
  fire: '불', water: '물', wood: '나무', steel: '강철', earth: '땅',
};

function findTarget(ctx: SkillContext) {
  return [...ctx.actorTeam, ...ctx.enemyTeam].find((u) => u.id === ctx.targetId);
}

const powerStrike: SkillHandler = (ctx) => {
  const target = findTarget(ctx);
  if (target) dealDamageTo(ctx, target);
};

const incantation: SkillHandler = (ctx) => {
  const target = findTarget(ctx);
  if (target) dealDamageTo(ctx, target);
};

const protect: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'guarding', { turnsRemaining: 2, magnitude: ctx.skill.areaRadius ?? 1 }, ctx.log, '보호');
};

const taunt: SkillHandler = (ctx) => {
  const target = findTarget(ctx);
  if (!target) return;
  applyStatusTo(target, 'taunted', { turnsRemaining: 2, sourceId: ctx.actor.id }, ctx.log, '도발');
};

const rockfall: SkillHandler = (ctx) => {
  const dx = Math.sign(ctx.targetPos.x - ctx.actor.position.x);
  const dy = Math.sign(ctx.targetPos.y - ctx.actor.position.y);
  let pos = { x: ctx.actor.position.x, y: ctx.actor.position.y };
  for (let step = 0; step < ctx.map.width + ctx.map.height; step++) {
    pos = { x: pos.x + dx, y: pos.y + dy };
    if (pos.x < 0 || pos.y < 0 || pos.x >= ctx.map.width || pos.y >= ctx.map.height) break;
    const terrain = ctx.map.tiles[pos.y][pos.x].terrain;
    if (terrain !== 'hill' && terrain !== 'plain') break;
    const hit = ctx.enemyTeam.find((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
    if (hit) dealDamageTo(ctx, hit);
  }
};

function enchantHandler(element: Exclude<Element, 'none'>): SkillHandler {
  return (ctx) => {
    applyStatusTo(ctx.actor, 'elementEnchant', { turnsRemaining: 3, element }, ctx.log, `마법부여-${ELEMENT_NAMES[element]}`);
  };
}

const riverSurge: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'riverSurge', { turnsRemaining: 3 }, ctx.log, '급류');
};

const climb: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'climbing', { turnsRemaining: 3 }, ctx.log, '등반');
};

const farSight: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'farSight', { turnsRemaining: 3 }, ctx.log, '천리안');
};

const forestVision: SkillHandler = (ctx) => {
  applyStatusTo(ctx.actor, 'forestVision', { turnsRemaining: 3 }, ctx.log, '투시');
};

export const COMMON_HANDLERS: Record<string, SkillHandler> = {
  power_strike: powerStrike,
  incantation,
  protect,
  taunt,
  rockfall,
  enchant_fire: enchantHandler('fire'),
  enchant_water: enchantHandler('water'),
  enchant_wood: enchantHandler('wood'),
  enchant_steel: enchantHandler('steel'),
  enchant_earth: enchantHandler('earth'),
  river_surge: riverSurge,
  climb,
  far_sight: farSight,
  forest_vision: forestVision,
};
