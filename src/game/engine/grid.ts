import type { BattleMap, Character, GridPos } from '../types';
import { weatherMoveModifier, type Weather } from './weather';

export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
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

export function effectiveMove(c: Character, map: BattleMap, weather: Weather = 'clear'): number {
  let move = c.rawMove;
  const legHit = c.statusEffects.find((s) => s.type === 'legHit');
  if (legHit) move += legHit.magnitude ?? -0.5;
  const onWater = map.tiles[c.position.y][c.position.x].terrain === 'water';
  if (onWater && c.statusEffects.some((s) => s.type === 'riverSurge')) move += 1;
  move += weatherMoveModifier(c, weather);
  return Math.max(0, move);
}

const NEIGHBOR_OFFSETS: GridPos[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 }, { x: 1, y: 0 },
  { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
];

export function canEnterTile(map: BattleMap, mover: Character, pos: GridPos, allUnits: Character[]): boolean {
  if (!inBounds(map, pos)) return false;
  const terrain = tileAt(map, pos).terrain;
  if (terrain === 'hill' && !mover.statusEffects.some((s) => s.type === 'climbing')) return false;
  const occupied = allUnits.some((u) => u.id !== mover.id && u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
  if (occupied) return false;
  return true;
}

/** 8방향 BFS. 모든 이동 가능한 지형의 이동 비용은 1칸으로 균일하므로(언덕은 완전 차단, 물은 예산 보너스일 뿐) BFS로 충분하다. */
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
