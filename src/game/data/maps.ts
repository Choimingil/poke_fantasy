import type { BattleMap, TerrainType } from '../types';

const WIDTH = 10;
const HEIGHT = 10;

// 상하 대결 구도(위=적 B팀, 아래=아군 A팀)에 맞춰 지형을 가로 방향으로 배치한다.
function terrainAt(x: number, y: number): TerrainType {
  if (y >= 4 && y <= 5 && x >= 2 && x <= 4) return 'water'; // 중앙 좌측 연못
  if (y >= 2 && y <= 3 && x >= 6 && x <= 7) return 'forest'; // 상단(적측) 숲
  if (y >= 6 && y <= 7 && x >= 2 && x <= 3) return 'forest'; // 하단(아군측) 숲
  if (y >= 4 && y <= 5 && x >= 7 && x <= 8) return 'hill'; // 중앙 우측 언덕
  if (x === 5 && (y === 4 || y === 5)) return 'rock'; // 중앙 바위(원거리 차단 엄폐)
  if ((x === 1 && y === 4) || (x === 8 && y === 6)) return 'rock'; // 가장자리 바위
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

// 아군(A팀)은 화면 아래쪽, 적(B팀)은 위쪽에 상하로 배치한다.
export const TEAM_A_SPAWNS = [
  { x: 2, y: 9 },
  { x: 4, y: 9 },
  { x: 5, y: 9 },
  { x: 7, y: 9 },
];

export const TEAM_B_SPAWNS = [
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 5, y: 0 },
  { x: 7, y: 0 },
];
