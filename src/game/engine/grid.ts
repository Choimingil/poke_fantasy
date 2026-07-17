import type { BattleMap, Character, GridPos, TerrainType } from '../types';
import { weatherMoveModifier, type Weather } from './weather';

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

export function effectiveMove(c: Character, map: BattleMap, weather: Weather = 'clear'): number {
  let move = c.rawMove;
  const legHit = c.statusEffects.find((s) => s.type === 'legHit');
  if (legHit) move += legHit.magnitude ?? -0.5;
  const onWater = map.tiles[c.position.y][c.position.x].terrain === 'water';
  if (onWater) {
    move -= WATER_MOVE_PENALTY; // 물 위에서는 이동력 감소
    if (c.statusEffects.some((s) => s.type === 'riverSurge')) move += 1; // 급류로 상쇄
  }
  move += weatherMoveModifier(c, weather);
  return Math.max(0, move);
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
  if (terrain === 'rock') return false; // 바위는 장애물(진입 불가)
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
    });
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
