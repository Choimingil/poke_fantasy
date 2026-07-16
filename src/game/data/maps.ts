import type { BattleMap, TerrainType } from '../types';

const WIDTH = 10;
const HEIGHT = 10;

function terrainAt(x: number, y: number): TerrainType {
  if (y === 4 && x >= 3 && x <= 6) return 'water';
  if (x >= 1 && x <= 2 && y >= 1 && y <= 2) return 'forest';
  if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return 'forest';
  if (x >= 4 && x <= 5 && y >= 7 && y <= 8) return 'hill';
  return 'plain';
}

export function createDefaultMap(): BattleMap {
  const tiles = [];
  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WIDTH; x++) row.push({ terrain: terrainAt(x, y) });
    tiles.push(row);
  }
  return { width: WIDTH, height: HEIGHT, tiles };
}

export const TEAM_A_SPAWNS = [
  { x: 0, y: 1 },
  { x: 0, y: 3 },
  { x: 0, y: 6 },
  { x: 0, y: 8 },
];

export const TEAM_B_SPAWNS = [
  { x: 9, y: 1 },
  { x: 9, y: 3 },
  { x: 9, y: 6 },
  { x: 9, y: 8 },
];
