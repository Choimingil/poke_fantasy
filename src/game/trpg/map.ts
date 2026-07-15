export type Terrain = 'plain' | 'forest' | 'water' | 'rock' | 'hill';

export const GRID_SIZE = 10;

export interface Coord {
  r: number;
  c: number;
}

export type TerrainMap = Terrain[][];

/** 플레이어/적이 시작하는 칸(항상 평지로 강제). */
const START_TILES: Coord[] = [
  { r: 2, c: 2 },
  { r: 2, c: 4 },
  { r: 2, c: 6 },
  { r: 7, c: 2 },
  { r: 7, c: 4 },
  { r: 7, c: 6 },
];

/**
 * 무작위 전장 생성. 지형 특성:
 * - 바위(rock): 장애물, 통과 불가 + 시야 차단.
 * - 숲(forest): 진입 불가(장애물, 숲 앞까지만 이동). 인접(1칸) 아군이 있어야만 그 칸이 보임.
 * - 물(water): 그 칸에 있으면 이동력 −0.5, 통과 불가(밟고 멈춤만).
 * - 언덕(hill): 진입 비용 일반(1). 물처럼 통과 불가(밟고 멈춤만) + 오른 턴 행동 불가 + 그 위 대상 피해 −50%.
 * 시작 칸과 그 주변은 평지로 보정한다.
 */
export function generateMap(rng: () => number = Math.random): TerrainMap {
  const pick = (): Terrain => {
    const x = rng();
    if (x < 0.5) return 'plain';
    if (x < 0.63) return 'forest';
    if (x < 0.73) return 'water';
    if (x < 0.88) return 'hill';
    return 'rock';
  };
  const map: TerrainMap = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => pick()),
  );
  // 시작 칸 + 상하좌우는 평지로(초기 이동/배치 보장).
  for (const s of START_TILES) {
    for (const t of [{ r: s.r, c: s.c }, ...neighbors(s)]) {
      if (inBounds(t.r, t.c)) map[t.r][t.c] = 'plain';
    }
  }
  // 아군 진영(row 7)과 적 진영(row 2)이 바위로 단절되지 않도록 통로를 보장한다.
  ensureConnected(map);
  return map;
}

/** 진입 불가 지형(바위·숲)인지. 연결성 판정용. */
function blocksWalk(t: Terrain): boolean {
  return t === 'rock' || t === 'forest';
}

/** 진입 불가 지형(바위·숲)을 장애물로 보고 두 진영 대표 칸이 연결되는지 BFS로 확인. */
function isWalkConnected(map: TerrainMap, from: Coord, to: Coord): boolean {
  const seen = new Set<string>([`${from.r},${from.c}`]);
  const queue: Coord[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift() as Coord;
    if (cur.r === to.r && cur.c === to.c) return true;
    for (const n of neighbors(cur)) {
      if (!inBounds(n.r, n.c)) continue;
      if (blocksWalk(map[n.r][n.c])) continue; // 바위·숲 차단(물/언덕은 밟고 멈출 수 있어 연결로 인정)
      const key = `${n.r},${n.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return false;
}

/** 양 진영이 단절돼 있으면 최단 경로를 찾아 그 위의 바위·숲을 평지로 뚫는다. */
function ensureConnected(map: TerrainMap) {
  const from: Coord = { r: 7, c: 4 };
  const to: Coord = { r: 2, c: 4 };
  if (isWalkConnected(map, from, to)) return;

  // 바위·숲도 통과 가능하다고 보되 비용을 크게 줘, 되도록 기존 통로를 활용하는 최단 경로 탐색.
  const key = (r: number, c: number) => `${r},${c}`;
  const dist = new Map<string, number>([[key(from.r, from.c), 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    let curKey: string | null = null;
    let curDist = Infinity;
    for (const [k, d] of dist) {
      if (!visited.has(k) && d < curDist) {
        curDist = d;
        curKey = k;
      }
    }
    if (curKey === null) break;
    visited.add(curKey);
    const [r, c] = curKey.split(',').map(Number);
    for (const n of neighbors({ r, c })) {
      if (!inBounds(n.r, n.c)) continue;
      const step = blocksWalk(map[n.r][n.c]) ? 100 : 1; // 바위·숲은 큰 비용, 나머지는 1
      const nd = curDist + step;
      const nk = key(n.r, n.c);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, curKey);
      }
    }
  }
  // 경로 복원 후 그 위의 바위·숲을 평지로 변경.
  let k: string | undefined = key(to.r, to.c);
  while (k) {
    const [r, c] = k.split(',').map(Number);
    if (blocksWalk(map[r][c])) map[r][c] = 'plain';
    if (k === key(from.r, from.c)) break;
    k = prev.get(k);
  }
}

function neighbors(a: Coord): Coord[] {
  return [
    { r: a.r + 1, c: a.c },
    { r: a.r - 1, c: a.c },
    { r: a.r, c: a.c + 1 },
    { r: a.r, c: a.c - 1 },
  ];
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

/** 진입 가능 지형인지(바위·숲은 진입 불가 = 앞까지만 이동). */
export function isEnterable(terrain: Terrain): boolean {
  return terrain !== 'rock' && terrain !== 'forest';
}

/** 한 칸 진입 시 이동력 소모(바위는 무한, 그 외 1). 물·언덕 "통과 불가"는 경로 탐색에서 별도 처리. */
export function moveCost(terrain: Terrain): number {
  if (terrain === 'rock') return Infinity;
  return 1;
}

/** 원거리 시야(활 사선)를 막는 지형(바위). */
export function blocksSight(terrain: Terrain): boolean {
  return terrain === 'rock';
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
