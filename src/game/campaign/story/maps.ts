import type { BattleMap, GridPos, TerrainType } from '../../types';

/** 스토리 라운드별 맵 사양(크기·지형·스폰). */
interface StoryMapSpec {
  width: number;
  height: number;
  /** 지형 배치 함수(미지정 타일은 plain). */
  terrain?: (x: number, y: number) => TerrainType;
}

/** 아군은 하단, 적은 상단(기존 상하 대결 구도 유지). */
function spawnsBottom(width: number, height: number): GridPos[] {
  const y = height - 1;
  const xs = spreadX(width);
  return xs.map((x) => ({ x, y }));
}
function spawnsTop(width: number): GridPos[] {
  const xs = spreadX(width);
  return xs.map((x) => ({ x, y: 0 }));
}
/** 가로로 고르게 퍼진 스폰 x좌표(최대 6열). */
function spreadX(width: number): number[] {
  const cols = Math.min(6, width);
  const step = (width - 1) / (cols - 1 || 1);
  const out: number[] = [];
  for (let i = 0; i < cols; i++) out.push(Math.round(i * step));
  return out;
}

const SPECS: Record<string, StoryMapSpec> = {
  // 라운드 1: 마을 훈련장. 중앙 공터, 동쪽 언덕, 서쪽 짚단(바위로 표현)
  r1_training: {
    width: 10, height: 8,
    terrain: (x, y) => {
      if (x >= 7 && x <= 8 && y >= 3 && y <= 4) return 'hill'; // 동쪽 언덕
      if (x >= 1 && x <= 2 && y >= 3 && y <= 4) return 'rock'; // 서쪽 짚단
      return 'plain';
    },
  },
  // 라운드 2: 불타는 변방 마을. 중앙 주택가(숲), 곳곳 바위, 우물 근처 물
  r2_village: {
    width: 14, height: 10,
    terrain: (x, y) => {
      if (x >= 5 && x <= 8 && y >= 4 && y <= 5) return 'forest'; // 중앙 주택가
      if (x === 3 && y === 6) return 'water'; // 우물
      if ((x === 10 && y === 3) || (x === 2 && y === 7)) return 'rock';
      return 'plain';
    },
  },
  // 라운드 3: 성채 내부 훈련장. 인공 언덕(중앙 고지), 숲 모형, 좁은 문(바위)
  r3_keep: {
    width: 12, height: 10,
    terrain: (x, y) => {
      if (x >= 5 && x <= 6 && y >= 4 && y <= 5) return 'hill'; // 중앙 고지
      if (x >= 2 && x <= 3 && y >= 2 && y <= 3) return 'forest';
      if (x >= 8 && x <= 9 && y >= 6 && y <= 7) return 'forest';
      if ((x === 5 && y === 2) || (x === 6 && y === 7)) return 'rock'; // 좁은 문
      return 'plain';
    },
  },
  // 라운드 4: 협곡 보급로. 남북 절벽(바위), 중앙 도로, 양쪽 고지
  r4_canyon: {
    width: 15, height: 11,
    terrain: (x, y) => {
      if (y === 0 || y === 10) return 'plain';
      if (x <= 1 && y >= 3 && y <= 7) return 'rock'; // 서쪽 절벽
      if (x >= 13 && y >= 3 && y <= 7) return 'rock'; // 동쪽 절벽
      if (x >= 4 && x <= 5 && y >= 4 && y <= 6) return 'hill';
      if (x >= 9 && x <= 10 && y >= 4 && y <= 6) return 'hill';
      return 'plain';
    },
  },
};

export interface StoryMap {
  map: BattleMap;
  spawnsA: GridPos[];
  spawnsB: GridPos[];
}

/** mapId에 해당하는 맵과 스폰 좌표를 만든다. 미등록 id는 기본 맵으로 대체. */
export function createStoryMap(mapId: string): StoryMap {
  const spec = SPECS[mapId] ?? { width: 10, height: 10 };
  const tiles = [];
  for (let y = 0; y < spec.height; y++) {
    const row = [];
    for (let x = 0; x < spec.width; x++) {
      row.push({ terrain: spec.terrain ? spec.terrain(x, y) : ('plain' as TerrainType) });
    }
    tiles.push(row);
  }
  return {
    map: { width: spec.width, height: spec.height, tiles },
    spawnsA: spawnsBottom(spec.width, spec.height),
    spawnsB: spawnsTop(spec.width),
  };
}
