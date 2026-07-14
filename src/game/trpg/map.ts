export type Terrain = 'plain' | 'tree' | 'water' | 'cliff';

export const GRID_SIZE = 5;

export interface Coord {
  r: number;
  c: number;
}

export type TerrainMap = Terrain[][];

/**
 * 5x5 기본 전장.
 * - 중앙(2,2)은 절벽: 통과 불가(돌아가야 함).
 * - (2,1),(2,3) 물: 이동력 소모 증가(이동 1칸 예산으로는 진입 불가).
 * - (2,0),(2,4) 나무: 원거리 공격 시야를 막음.
 * 플레이어는 아래(row 3), 적은 위(row 1)에서 시작한다.
 */
export const DEFAULT_MAP: TerrainMap = [
  ['plain', 'plain', 'plain', 'plain', 'plain'],
  ['plain', 'plain', 'plain', 'plain', 'plain'],
  ['tree', 'water', 'cliff', 'water', 'tree'],
  ['plain', 'plain', 'plain', 'plain', 'plain'],
  ['plain', 'plain', 'plain', 'plain', 'plain'],
];

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

/** 진입 가능 지형인지(절벽은 통과 불가). */
export function isEnterable(terrain: Terrain): boolean {
  return terrain !== 'cliff';
}

/** 한 칸 진입 시 이동력 소모(물은 2, 절벽은 무한). */
export function moveCost(terrain: Terrain): number {
  if (terrain === 'cliff') return Infinity;
  if (terrain === 'water') return 2;
  return 1;
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

/** 두 지점 사이(양 끝 제외)를 지나는 칸들. 원거리 시야 판정용. */
export function lineBetween(a: Coord, b: Coord): Coord[] {
  const tiles: Coord[] = [];
  let x0 = a.c;
  let y0 = a.r;
  const x1 = b.c;
  const y1 = b.r;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  // Bresenham
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) break;
    tiles.push({ r: y0, c: x0 });
  }
  return tiles;
}

/** 절벽에 인접한 유닛은 높은 지대로 간주하여 사거리 +1. */
export function isAdjacentToCliff(map: TerrainMap, pos: Coord): boolean {
  for (const [dr, dc] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const r = pos.r + dr;
    const c = pos.c + dc;
    if (inBounds(r, c) && map[r][c] === 'cliff') return true;
  }
  return false;
}
