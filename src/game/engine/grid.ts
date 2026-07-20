import type { BattleMap, Character, GridPos, TerrainType } from '../types';
import { getWeapon } from '../data/weapons';
import { hasWeaponPassive } from '../data/promotions';
import { weatherMoveModifier, type Weather } from './weather';

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

const WATER_MOVE_PENALTY = 1;
const MOVE_CAP = 5;
const END_PER_MOVE = 30;

/** UI 표시용: 지형/날씨/상태 보정 없이 지구력만으로 계산한 기본 이동력("5+a" 표기의 a 포함). */
export function baseMoveFromEndurance(endurance: number): { shown: number; excess: number } {
  const raw = endurance / END_PER_MOVE + 1;
  return { shown: Math.min(MOVE_CAP, raw), excess: Math.max(0, raw - MOVE_CAP) };
}

/**
 * 이동력 = (지구력 / 30) + 1. 5를 넘는 초과분(a)은 '표시상' 버퍼로 남아 이동력 감소 페널티를 우선 상쇄하고,
 * 그래도 남는 페널티만 실제 이동력(최대 5)에서 차감한다. 즉 END가 높을수록 이동 디버프에 더 잘 버틴다.
 */
export function effectiveMove(c: Character, map: BattleMap, weather: Weather = 'clear'): number {
  const raw = c.baseStats.endurance / END_PER_MOVE + 1;
  const adapt = hasAdaptation(c);
  let bonus = 0;
  let penalty = 0;
  const legHit = c.statusEffects.find((s) => s.type === 'legHit');
  if (legHit) penalty += Math.abs(legHit.magnitude ?? 0.5);
  // 이동력 감소(정예/보스 충격 전환, 보스 봉쇄 전환): magnitude만큼 이동력 차감.
  for (const s of c.statusEffects) if (s.type === 'moveDown') penalty += Math.abs(s.magnitude ?? 1);
  const onWater = map.tiles[c.position.y][c.position.x].terrain === 'water';
  if (onWater) {
    if (!adapt) penalty += WATER_MOVE_PENALTY; // 물 위에서는 이동력 감소(적응력은 무시)
    if (c.statusEffects.some((s) => s.type === 'riverSurge')) bonus += 1; // 급류로 상쇄
  }
  // 눈(자연지형)으로 인한 이동감소는 적응력이 무시한다. 비(방어구 무게)는 그대로 적용.
  if (!(adapt && weather === 'snow')) penalty += Math.abs(Math.min(0, weatherMoveModifier(c, weather)));

  const total = raw + bonus;
  const excess = Math.max(0, total - MOVE_CAP); // 5를 넘는 초과분(a)
  const cappedBase = Math.min(MOVE_CAP, total);
  const remainingPenalty = Math.max(0, penalty - excess); // 초과분이 페널티를 우선 흡수
  return Math.max(0, cappedBase - remainingPenalty);
}

/** effectiveMove 결과를 실제 이동 칸 수로 변환한다. 이동력이 낮아도 최소 1칸은 이동할 수 있다. */
export function moveStepsForRound(effectiveMoveValue: number): number {
  return Math.max(1, Math.floor(effectiveMoveValue));
}

/** 물·언덕은 진입은 가능하지만 그 칸을 넘어서 계속 이동할 수 없다(경로 종착 전용). */
function isPassThroughBlocked(terrain: TerrainType): boolean {
  return terrain === 'water' || terrain === 'hill';
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

/** 직교 4방향 BFS(마름모 이동). 이동 비용은 칸당 1로 균일. 물·언덕은 진입만 가능하고 넘어갈 수 없어 경로가 그 칸에서 끝난다. */
export function computeReachableTiles(map: BattleMap, mover: Character, allUnits: Character[], budget: number): GridPos[] {
  const steps = Math.floor(budget);
  const start = mover.position;
  const visited = new Map<string, number>([[posKey(start), 0]]);
  const queue: GridPos[] = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const dist = visited.get(posKey(current))!;
    if (dist >= steps) continue;
    // 물·언덕은 넘어서 이동 불가: 시작 칸이 아니면 그 칸에서 경로를 더 확장하지 않는다.
    if (!(current.x === start.x && current.y === start.y) && isPassThroughBlocked(tileAt(map, current).terrain)) continue;
    for (const offset of NEIGHBOR_OFFSETS) {
      const next: GridPos = { x: current.x + offset.x, y: current.y + offset.y };
      const key = posKey(next);
      if (visited.has(key)) continue;
      if (!canEnterTile(map, mover, next, allUnits)) continue;
      visited.set(key, dist + 1);
      queue.push(next);
    }
  }
  return [...visited.keys()]
    .filter((key) => key !== posKey(start))
    .map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    })
    .filter((p) => tileAt(map, p).terrain !== 'rock'); // 바위에는 정지할 수 없다(적응력도 통과만)
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
