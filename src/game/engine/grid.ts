import type { BattleMap, Character, GridPos, TerrainType } from '../types';
import { getWeapon } from '../data/weapons';
import { hasWeaponPassive } from '../data/promotions';
import { carryCapacityKg, totalEquipmentWeightKg } from './equipment';
import type { Weather } from './weather';

/** 단검 적응력: 자연지형 이동감소 무시 + 바위 통과(정지 불가). */
function hasAdaptation(c: Character): boolean {
  const inst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  return !!inst && getWeapon(inst.templateId).kind === 'dagger' && hasWeaponPassive(c, 'dagger', 'adaptation');
}

export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** 맨해튼 거리(대각선 1칸 = 2). 시야 판정에 사용해 마름모 형태가 되도록 한다. */
export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function posKey(p: GridPos): string {
  return `${p.x},${p.y}`;
}

function inBounds(map: BattleMap, p: GridPos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
}

function tileAt(map: BattleMap, p: GridPos): { terrain: BattleMap['tiles'][number][number]['terrain'] } {
  return map.tiles[p.y][p.x];
}

const MOVE_CAP = 5;
const END_PER_MOVE = 30;
const WATER_ENTRY_COST = 2;

/** UI 표시용: 지형/날씨/상태 보정 없이 지구력만으로 계산한 기본 이동력("5+a" 표기의 a 포함). */
export function baseMoveFromEndurance(endurance: number): { shown: number; excess: number } {
  const raw = endurance / END_PER_MOVE + 1;
  return { shown: Math.min(MOVE_CAP, raw), excess: Math.max(0, raw - MOVE_CAP) };
}

/**
 * 이동 예산(이동력) = (지구력 / 30) + 1. 5를 넘는 초과분(a)은 이동력 감소 페널티를 우선 상쇄하고,
 * 그래도 남는 페널티만 실제 이동력(최대 5)에서 차감한다(END가 높을수록 이동 디버프에 강함).
 * 지형·날씨로 인한 감소는 여기서 처리하지 않고 타일 진입 비용(computeReachableTiles)으로 반영한다.
 */
export function effectiveMove(c: Character): number {
  const raw = c.baseStats.endurance / END_PER_MOVE + 1;
  let penalty = 0;
  const legHit = c.statusEffects.find((s) => s.type === 'legHit');
  if (legHit) penalty += Math.abs(legHit.magnitude ?? 0.5);
  // 이동력 감소(정예/보스 충격 전환, 보스 봉쇄 전환): magnitude만큼 이동력 차감.
  for (const s of c.statusEffects) if (s.type === 'moveDown') penalty += Math.abs(s.magnitude ?? 1);
  const excess = Math.max(0, raw - MOVE_CAP); // 5를 넘는 초과분(a)
  const cappedBase = Math.min(MOVE_CAP, raw);
  const remainingPenalty = Math.max(0, penalty - excess); // 초과분이 페널티를 우선 흡수
  // 경량 보행(§43): 장비 총무게가 적재량 절반 이하면 이동력 +1(최대 5).
  const lightBonus = c.traitId === 'lightStep' && totalEquipmentWeightKg(c) <= carryCapacityKg(c) / 2 ? 1 : 0;
  return Math.min(MOVE_CAP, Math.max(0, cappedBase - remainingPenalty) + lightBonus);
}

/** 물은 진입은 가능하지만 넘어서 계속 이동할 수 없다(경로 종착). 언덕은 통과 가능한 고지대로 취급한다. */
function isPassThroughBlocked(terrain: TerrainType): boolean {
  return terrain === 'water';
}

/**
 * 타일 진입 비용: 평지·언덕·숲 1, 물 2(급류 −1·적응력은 1). 눈 날씨는 평지·숲 진입 비용 +1
 * (물·언덕·바위·불 제외, 적응력은 눈 추가 비용 무시).
 */
function tileEntryCost(map: BattleMap, pos: GridPos, mover: Character, weather: Weather): number {
  const terrain = tileAt(map, pos).terrain;
  const adapt = hasAdaptation(mover);
  let cost = 1;
  if (terrain === 'water') {
    cost = WATER_ENTRY_COST;
    if (mover.statusEffects.some((s) => s.type === 'riverSurge')) cost -= 1; // 급류: 물 진입 비용 −1
    if (mover.traitId === 'swimming') cost -= 1; // 수영 숙련 특성: 물 진입 비용 −1
    if (adapt) cost = 1; // 적응력: 물 추가 비용 무시
    cost = Math.max(1, cost);
  }
  const ignoreSnow = adapt || mover.traitId === 'snowAdapt'; // 적응력·설원 적응은 눈 추가 비용 무시
  if (weather === 'snow' && (terrain === 'plain' || terrain === 'forest') && !ignoreSnow) cost += 1; // 눈: 평지·숲 +1
  return cost;
}

// 직교 4방향. 대각선 이동은 직교 2칸을 거쳐야 하므로 자연히 비용 2가 되어
// 이동 가능 범위가 시야와 동일한 마름모(맨해튼) 형태가 된다.
const NEIGHBOR_OFFSETS: GridPos[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 }, { x: 1, y: 0 },
  { x: 0, y: 1 },
];

export function canEnterTile(map: BattleMap, mover: Character, pos: GridPos, allUnits: Character[]): boolean {
  if (!inBounds(map, pos)) return false;
  const terrain = tileAt(map, pos).terrain;
  if (terrain === 'rock' && !hasAdaptation(mover)) return false; // 바위는 장애물(적응력은 통과 가능)
  const occupied = allUnits.some((u) => u.id !== mover.id && u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
  if (occupied) return false;
  return true;
}

/**
 * 직교 4방향 가중 탐색(마름모 이동, 다익스트라). 타일마다 진입 비용이 다르며(tileEntryCost),
 * 누적 비용이 이동 예산(budget) 이하인 타일에 도달할 수 있다. 물은 진입만 가능하고 넘어갈 수 없다.
 * 예산이 부족해 갈 곳이 없어도 인접한 진입 가능 타일 하나(가장 싼 곳)로는 이동할 수 있다(최소 1칸 보장).
 */
export function computeReachableTiles(map: BattleMap, mover: Character, allUnits: Character[], budget: number, weather: Weather = 'clear'): GridPos[] {
  const start = mover.position;
  const dist = new Map<string, number>([[posKey(start), 0]]);
  const frontier: { pos: GridPos; cost: number }[] = [{ pos: start, cost: 0 }];
  while (frontier.length > 0) {
    let mi = 0;
    for (let i = 1; i < frontier.length; i++) if (frontier[i].cost < frontier[mi].cost) mi = i;
    const { pos, cost } = frontier.splice(mi, 1)[0];
    if (cost > (dist.get(posKey(pos)) ?? Infinity)) continue;
    // 물은 넘어서 이동 불가: 시작 칸이 아니면 그 칸에서 경로를 더 확장하지 않는다.
    if (!(pos.x === start.x && pos.y === start.y) && isPassThroughBlocked(tileAt(map, pos).terrain)) continue;
    for (const offset of NEIGHBOR_OFFSETS) {
      const next: GridPos = { x: pos.x + offset.x, y: pos.y + offset.y };
      if (!canEnterTile(map, mover, next, allUnits)) continue;
      const nextCost = cost + tileEntryCost(map, next, mover, weather);
      if (nextCost <= budget && nextCost < (dist.get(posKey(next)) ?? Infinity)) {
        dist.set(posKey(next), nextCost);
        frontier.push({ pos: next, cost: nextCost });
      }
    }
  }
  const reachable = [...dist.keys()]
    .filter((key) => key !== posKey(start))
    .map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    })
    .filter((p) => tileAt(map, p).terrain !== 'rock'); // 바위에는 정지할 수 없다(적응력도 통과만)

  // 최소 1칸 보장: 예산이 부족해 도달 타일이 없어도 인접한 진입 가능 타일로는 이동할 수 있다.
  // 비용이 가장 싼 한 방향만 주면 항상 같은 방향(예: 눈 속 평지처럼 사방 비용이 같을 때)으로만
  // 이동하게 되어 "앞으로만" 이동하는 것처럼 보인다. 예산 부족 시엔 진입 가능한 모든 인접 타일을
  // 후보로 주어 어느 방향으로든 1칸 이동할 수 있게 한다.
  if (reachable.length === 0) {
    const fallback: GridPos[] = [];
    for (const offset of NEIGHBOR_OFFSETS) {
      const next: GridPos = { x: start.x + offset.x, y: start.y + offset.y };
      if (!canEnterTile(map, mover, next, allUnits) || tileAt(map, next).terrain === 'rock') continue;
      fallback.push(next);
    }
    return fallback;
  }
  return reachable;
}

/** from→to 직선 경로(양 끝 제외)에 바위 타일이 있으면 true. 원거리·마법 공격이 바위를 넘지 못하게 하는 데 쓴다. */
export function lineCrossesRock(map: BattleMap, from: GridPos, to: GridPos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps <= 1) return false; // 인접(또는 동일)하면 사이 칸이 없다
  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + (dx * i) / steps);
    const y = Math.round(from.y + (dy * i) / steps);
    if (map.tiles[y]?.[x]?.terrain === 'rock') return true;
  }
  return false;
}
