export type Terrain = 'plain' | 'tree' | 'water' | 'rock' | 'hill' | 'mountain';

export const GRID_SIZE = 10;

export interface Coord {
  r: number;
  c: number;
}

export type TerrainMap = Terrain[][];

const P: Terrain = 'plain';
const T: Terrain = 'tree';
const W: Terrain = 'water';
const R: Terrain = 'rock';
const H: Terrain = 'hill';
const M: Terrain = 'mountain';

/**
 * 10x10 기본 전장.
 * - 바위(R): 장애물, 통과 불가.
 * - 나무(T): 그 위에 있으면 활 공격 방어(엄폐) + 활 시야 차단.
 * - 물(W): 그 칸에 있으면 이동력 1 감소(최소 1).
 * - 언덕(H): 지날 때 이동력 1 소모 증가.
 * - 산(M): 그 위에서 활 공격력 증가.
 * 적은 위(row 2), 플레이어는 아래(row 7)에서 시작한다.
 */
export const DEFAULT_MAP: TerrainMap = [
  [P, P, P, P, M, M, P, P, P, P],
  [P, P, T, P, P, P, P, T, P, P],
  [P, P, P, P, P, P, P, P, P, P],
  [P, W, P, H, R, R, H, P, W, P],
  [P, W, P, H, R, R, H, P, W, P],
  [P, P, P, H, P, P, H, P, P, P],
  [P, P, T, P, P, P, P, T, P, P],
  [P, P, P, P, P, P, P, P, P, P],
  [P, P, H, P, P, P, P, H, P, P],
  [M, M, P, P, P, P, P, P, M, M],
];

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

/** 진입 가능 지형인지(바위는 통과 불가). */
export function isEnterable(terrain: Terrain): boolean {
  return terrain !== 'rock';
}

/** 한 칸 진입 시 이동력 소모(언덕은 2, 바위는 무한). 물의 "그 칸에 있으면 -1"은 별도 처리. */
export function moveCost(terrain: Terrain): number {
  if (terrain === 'rock') return Infinity;
  if (terrain === 'hill') return 2;
  return 1;
}

/** 원거리 시야를 막는 지형(나무·바위). */
export function blocksSight(terrain: Terrain): boolean {
  return terrain === 'tree' || terrain === 'rock';
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

/** 중심 칸 + 상하좌우로 radius칸까지의 십자(+) 모양 범위. 기술 광역 판정용. */
export function crossTiles(center: Coord, radius: number): Coord[] {
  const tiles: Coord[] = [{ r: center.r, c: center.c }];
  for (let d = 1; d <= radius; d += 1) {
    for (const [dr, dc] of [
      [d, 0],
      [-d, 0],
      [0, d],
      [0, -d],
    ]) {
      const r = center.r + dr;
      const c = center.c + dc;
      if (inBounds(r, c)) tiles.push({ r, c });
    }
  }
  return tiles;
}

/** 중심에서 맨해튼 거리 radius 이내의 모든 칸(마름모). 시야 판정용. */
export function diamondTiles(center: Coord, radius: number): Coord[] {
  const tiles: Coord[] = [];
  for (let dr = -radius; dr <= radius; dr += 1) {
    const rem = radius - Math.abs(dr);
    for (let dc = -rem; dc <= rem; dc += 1) {
      const r = center.r + dr;
      const c = center.c + dc;
      if (inBounds(r, c)) tiles.push({ r, c });
    }
  }
  return tiles;
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
