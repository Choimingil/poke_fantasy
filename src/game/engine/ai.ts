import type { AiBehavior, BattleMap, Character, GridPos, WeaponKind, WeaponTemplate } from '../types';
import type { UnitAction } from './battle';
import { getSkill } from '../data/skills';
import { getWeapon, isRangedOrMagicKind } from '../data/weapons';
import { FALLBACK_SKILL_ID, getLoadoutSkillIds } from '../data/promotions';
import { manhattan, computeReachableTiles, effectiveMove, lineCrossesRock } from './grid';
import { isVisibleTo } from './vision';
import { maxHp } from './derivedStats';
import type { Weather } from './weather';
import type { TimeOfDay } from './daytime';

/** AI 행동 유형 표시 라벨(§39). */
export const AI_BEHAVIOR_LABEL: Record<AiBehavior, string> = {
  aggressive: '돌격', skirmisher: '견제', defensive: '수비', support: '지원',
};

/** 수비형이 스스로 교전을 시작하는 위협 반경(맨해튼). */
const THREAT_RADIUS = 4;
/** 지원형이 치료 대상으로 삼는 아군 체력 비율 상한. */
const HEAL_THRESHOLD = 0.7;

interface Cond { time: TimeOfDay; weather: Weather }

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

/** 도발 대상 우선, 없으면 가장 가까운 보이는 적을 목표로 잡는다. */
function resolveTarget(unit: Character, enemyTeam: Character[], map: BattleMap, cond: Cond): Character | undefined {
  const tauntStatus = unit.statusEffects.find((s) => s.type === 'taunted');
  const taunted = tauntStatus?.sourceId ? enemyTeam.find((u) => u.id === tauntStatus.sourceId && u.currentHp > 0) : undefined;
  if (taunted) return taunted;
  const visible = enemyTeam.filter((u) => u.currentHp > 0 && isVisibleTo(unit, u, map, cond));
  return [...visible].sort((a, b) => manhattan(unit.position, a.position) - manhattan(unit.position, b.position))[0];
}

/** 살아있는 아군(자신 제외)의 무게중심. 없으면 undefined. */
function allyCentroid(unit: Character, ownTeam: Character[]): GridPos | undefined {
  const allies = ownTeam.filter((a) => a.id !== unit.id && a.currentHp > 0);
  if (allies.length === 0) return undefined;
  const sx = allies.reduce((s, a) => s + a.position.x, 0);
  const sy = allies.reduce((s, a) => s + a.position.y, 0);
  return { x: Math.round(sx / allies.length), y: Math.round(sy / allies.length) };
}

/** 지정 타일에서 대상을 공격할 수 있으면 해당 행동(스킬·대상)을 돌려준다. */
function attackFromTile(
  tile: GridPos, target: Character, unit: Character, map: BattleMap, cond: Cond,
  weapon: WeaponTemplate, attackSkillIds: string[],
): { skillId: string; targetId?: string; targetPos?: GridPos } | null {
  const onHill = map.tiles[tile.y][tile.x].terrain === 'hill';
  for (const id of attackSkillIds) {
    const skill = getSkill(id);
    const ignoresRange = skill.ignoresRange || skill.targetMode === 'anyInSight';
    let range = skill.range === 'weapon' ? weapon.range : (skill.range ?? weapon.range);
    if (skill.hillRangeBonus && onHill) range += skill.hillRangeBonus; // 천궁
    const blockedByRock = isRangedOrMagicKind(weapon.kind) && lineCrossesRock(map, tile, target.position);
    const inRange = (ignoresRange ? isVisibleTo({ ...unit, position: tile }, target, map, cond) : manhattan(tile, target.position) <= range) && !blockedByRock;
    if (inRange) {
      return skill.targetMode === 'tile' ? { skillId: skill.id, targetPos: target.position } : { skillId: skill.id, targetId: target.id };
    }
  }
  return null;
}

/** 사용 가능한 공격 스킬 id 목록(없으면 기본 공격). */
function usableAttackSkillIds(unit: Character, kind: WeaponKind): string[] {
  const usable = getLoadoutSkillIds(unit, kind).filter((id) => {
    const skill = getSkill(id);
    const isAttack = skill.category === 'attack' && (skill.targetMode === 'enemy' || skill.targetMode === 'anyInSight' || skill.targetMode === 'tile');
    return isAttack && (skill.maxUses === undefined || (unit.skillUses[id] ?? 0) > 0);
  });
  return usable.length > 0 ? usable : [FALLBACK_SKILL_ID];
}

/** 지원형: 부상·저체력 아군을 치료할 수 있으면 그 행동을 돌려준다. */
function trySupportHeal(
  unit: Character, ownTeam: Character[], reachable: GridPos[], weapon: WeaponTemplate,
): UnitAction | null {
  const healIds = getLoadoutSkillIds(unit, weapon.kind).filter((id) => {
    const skill = getSkill(id);
    return skill.category === 'heal' && skill.targetMode === 'ally' && (skill.maxUses === undefined || (unit.skillUses[id] ?? 0) > 0);
  });
  if (healIds.length === 0) return null;
  const wounded = ownTeam
    .filter((a) => a.currentHp > 0 && a.currentHp < maxHp(a) * HEAL_THRESHOLD)
    .sort((a, b) => a.currentHp / maxHp(a) - b.currentHp / maxHp(b));
  if (wounded.length === 0) return null;
  const skill = getSkill(healIds[0]);
  const range = skill.range === 'weapon' ? weapon.range : (skill.range ?? weapon.range);
  for (const ally of wounded) {
    // 대상 아군 사거리 안으로 이동할 수 있는 가장 가까운 타일을 고른다.
    const spots = reachable.filter((t) => manhattan(t, ally.position) <= range);
    if (spots.length === 0) continue;
    const spot = spots.reduce((best, t) => (manhattan(t, unit.position) < manhattan(best, unit.position) ? t : best));
    const action: UnitAction = { skillId: skill.id, targetId: ally.id };
    if (spot.x !== unit.position.x || spot.y !== unit.position.y) action.moveTo = spot;
    return action;
  }
  return null;
}

/**
 * 그리드 AI(§39, 4종). unit.aiBehavior에 따라 이동·공격 방식을 달리한다.
 * 시야·정보 제약은 플레이어와 동일(대칭 원칙).
 */
export function pickAiAction(
  unit: Character,
  ownTeam: Character[],
  enemyTeam: Character[],
  map: BattleMap,
  weather: Weather = 'clear',
  time: TimeOfDay = 'day',
  knownPositions: Record<string, GridPos> = {},
): UnitAction {
  const cond: Cond = { time, weather };
  const behavior: AiBehavior = unit.aiBehavior ?? 'aggressive';
  const allUnits = [...ownTeam, ...enemyTeam];
  const weaponInstance = unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!;
  const weapon = getWeapon(weaponInstance.templateId);
  const ranged = isRangedOrMagicKind(weapon.kind);

  const budget = effectiveMove(unit);
  const reachable = [unit.position, ...computeReachableTiles(map, unit, allUnits, budget, weather)];

  // 지원형: 치료가 최우선. 치료할 상대가 없으면 수비형처럼 행동한다.
  if (behavior === 'support') {
    const heal = trySupportHeal(unit, ownTeam, reachable, weapon);
    if (heal) return heal;
  }

  const target = resolveTarget(unit, enemyTeam, map, cond);
  const attackIds = usableAttackSkillIds(unit, weapon.kind);
  const canAttack = (tile: GridPos) => (target ? attackFromTile(tile, target, unit, map, cond, weapon, attackIds) : null);

  // 이동 목표 선정 — 행동 유형별로 다르다.
  const holdBehavior = behavior === 'defensive' || behavior === 'support';
  const engaged = !!target && manhattan(unit.position, target.position) <= THREAT_RADIUS;

  let moveTile: GridPos;
  if (target && (!holdBehavior || engaged)) {
    // 교전: 공격 가능한 타일을 우선한다.
    const attackTiles = reachable.filter((t) => canAttack(t));
    if (attackTiles.length > 0) {
      moveTile = behavior === 'skirmisher' && ranged
        // 견제형: 공격 가능하면서 적들과 가장 멀리 떨어진 타일(카이팅).
        ? attackTiles.reduce((best, t) => (minEnemyDist(t, enemyTeam) > minEnemyDist(best, enemyTeam) ? t : best))
        // 그 외: 대상에 가장 가까운 타일.
        : attackTiles.reduce((best, t) => (manhattan(t, target.position) < manhattan(best, target.position) ? t : best));
    } else {
      // 사거리에 못 미치면 대상에게 접근한다.
      moveTile = reachable.reduce((best, t) => (manhattan(t, target.position) < manhattan(best, target.position) ? t : best));
    }
  } else {
    // 비교전 대기: 수비형·지원형은 아군 곁에 머물고, 그 외는 예상 위치로 전진한다.
    const goal = holdBehavior
      ? (allyCentroid(unit, ownTeam) ?? unit.position)
      : estimateAdvancePos(unit, enemyTeam, map, knownPositions);
    moveTile = reachable.reduce((best, t) => (manhattan(t, goal) < manhattan(best, goal) ? t : best));
  }

  const action: UnitAction = {};
  if (moveTile.x !== unit.position.x || moveTile.y !== unit.position.y) action.moveTo = moveTile;

  // 공격은 실제 확인된 대상에게만, 선택한 타일에서 가능한 경우 수행한다.
  const atk = canAttack(moveTile);
  if (atk) {
    action.skillId = atk.skillId;
    if (atk.targetPos) action.targetPos = atk.targetPos;
    if (atk.targetId) action.targetId = atk.targetId;
  }
  return action;
}

/** 지정 타일에서 살아있는 적들까지의 최소 거리(카이팅 점수). 적이 없으면 큰 값. */
function minEnemyDist(tile: GridPos, enemyTeam: Character[]): number {
  const alive = enemyTeam.filter((e) => e.currentHp > 0);
  if (alive.length === 0) return 99;
  return Math.min(...alive.map((e) => manhattan(tile, e.position)));
}
