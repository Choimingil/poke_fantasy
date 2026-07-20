import type { BattleMap, Character, GridPos } from '../types';
import type { UnitAction } from './battle';
import { getSkill } from '../data/skills';
import { getWeapon, isRangedOrMagicKind } from '../data/weapons';
import { FALLBACK_SKILL_ID, getLoadoutSkillIds } from '../data/promotions';
import { manhattan, computeReachableTiles, effectiveMove, moveStepsForRound, lineCrossesRock } from './grid';
import { isVisibleTo } from './vision';
import type { Weather } from './weather';
import type { TimeOfDay } from './daytime';

/**
 * 시야 안에 적이 하나도 없을 때 이동 목표로 삼을 위치를 정한다.
 * 1) 예전에 확인했던(지금은 시야 밖인) 적 중 가장 가까운 마지막 목격 위치
 * 2) 그마저 없으면(교전 전) 맵 중앙 — 정찰하듯 전진하게 한다.
 */
function estimateAdvancePos(unit: Character, enemyTeam: Character[], map: BattleMap, knownPositions: Record<string, GridPos>): GridPos {
  const knownAlive = enemyTeam.filter((u) => u.currentHp > 0 && knownPositions[u.id]);
  if (knownAlive.length > 0) {
    return [...knownAlive].sort(
      (a, b) => manhattan(unit.position, knownPositions[a.id]) - manhattan(unit.position, knownPositions[b.id]),
    ).map((u) => knownPositions[u.id])[0];
  }
  return { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) };
}

/** 간단한 그리드 AI: 도발 대상 우선 → 가장 가까운 보이는 적 추적 → 시야 밖이면 마지막 목격/맵 중앙으로 전진 → 사거리 내면 공격 스킬 사용 */
export function pickAiAction(
  unit: Character,
  ownTeam: Character[],
  enemyTeam: Character[],
  map: BattleMap,
  weather: Weather = 'clear',
  time: TimeOfDay = 'day',
  knownPositions: Record<string, GridPos> = {},
): UnitAction {
  const cond = { time, weather };
  const allUnits = [...ownTeam, ...enemyTeam];

  const tauntStatus = unit.statusEffects.find((s) => s.type === 'taunted');
  let target = tauntStatus?.sourceId ? enemyTeam.find((u) => u.id === tauntStatus.sourceId && u.currentHp > 0) : undefined;
  if (!target) {
    const visibleEnemies = enemyTeam.filter((u) => u.currentHp > 0 && isVisibleTo(unit, u, map, cond));
    target = [...visibleEnemies].sort((a, b) => manhattan(unit.position, a.position) - manhattan(unit.position, b.position))[0];
  }
  // 시야 안에 실제 대상이 없어도 이동은 예상 위치(마지막 목격/맵 중앙)를 향해 계속한다.
  const movePos = target ? target.position : estimateAdvancePos(unit, enemyTeam, map, knownPositions);

  const budget = moveStepsForRound(effectiveMove(unit, map, weather));
  const reachable = [unit.position, ...computeReachableTiles(map, unit, allUnits, budget)];
  const bestTile = reachable.reduce((best, pos) =>
    manhattan(pos, movePos) < manhattan(best, movePos) ? pos : best);

  const action: UnitAction = {};
  if (bestTile.x !== unit.position.x || bestTile.y !== unit.position.y) action.moveTo = bestTile;

  // 공격은 실제로 확인된(시야 안/도발) 대상에게만 시도한다 — 예상 위치는 이동에만 쓴다.
  if (!target) return action;

  const weaponInstance = unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!;
  const weapon = getWeapon(weaponInstance.templateId);
  const usableIds = getLoadoutSkillIds(unit, weapon.kind).filter((id) => {
    const skill = getSkill(id);
    return skill.maxUses === undefined || (unit.skillUses[id] ?? 0) > 0;
  });

  const attackSkills = usableIds
    .map((id) => getSkill(id))
    .filter((s) => s.category === 'attack' && (s.targetMode === 'enemy' || s.targetMode === 'anyInSight' || s.targetMode === 'tile'));
  // 사용 가능한 공격 스킬이 없으면 기본 공격(주먹)으로 대체.
  if (attackSkills.length === 0) attackSkills.push(getSkill(FALLBACK_SKILL_ID));

  const onHill = map.tiles[bestTile.y][bestTile.x].terrain === 'hill';
  for (const skill of attackSkills) {
    const ignoresRange = skill.ignoresRange || skill.targetMode === 'anyInSight';
    let range = skill.range === 'weapon' ? weapon.range : (skill.range ?? weapon.range);
    if (skill.hillRangeBonus && onHill) range += skill.hillRangeBonus; // 천궁
    const blockedByRock = isRangedOrMagicKind(weapon.kind) && lineCrossesRock(map, bestTile, target.position);
    const inRange = (ignoresRange ? isVisibleTo(unit, target, map, cond) : manhattan(bestTile, target.position) <= range) && !blockedByRock;
    if (inRange) {
      action.skillId = skill.id;
      if (skill.targetMode === 'tile') action.targetPos = target.position;
      else action.targetId = target.id;
      break;
    }
  }

  return action;
}
