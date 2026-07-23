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
/** 가로로 고르게 퍼진 스폰 x좌표(최대 8열). */
function spreadX(width: number): number[] {
  const cols = Math.min(8, width);
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
  // 라운드 5: 청류성 공성전. 성벽(바위) 라인, 시장(숲), 성당 앞 광장
  r5_castle: {
    width: 16, height: 14,
    terrain: (x, y) => {
      if (y === 5 && x !== 7 && x !== 8) return 'rock'; // 성벽(중앙 성문만 개방)
      if (x >= 3 && x <= 5 && y >= 8 && y <= 9) return 'forest'; // 시장
      if (x >= 10 && x <= 12 && y >= 2 && y <= 3) return 'forest'; // 내부 정원
      if (x >= 6 && x <= 9 && y >= 1 && y <= 2) return 'hill'; // 성당 앞 단
      return 'plain';
    },
  },
  // 라운드 6: 포로 호송 산길. 좁은 통로(바위 협착), 숲
  r6_mountain: {
    width: 15, height: 12,
    terrain: (x, y) => {
      if ((x === 4 || x === 10) && y >= 3 && y <= 8 && y % 2 === 0) return 'rock'; // 협착
      if (x >= 1 && x <= 3 && y >= 5 && y <= 7) return 'forest';
      if (x >= 11 && x <= 13 && y >= 4 && y <= 6) return 'forest';
      if (x >= 6 && x <= 8 && y >= 5 && y <= 6) return 'hill';
      return 'plain';
    },
  },
  // 라운드 7: 대형 석교와 강변. 중앙 다리(양옆 물), 폭파 지점
  r7_bridge: {
    width: 18, height: 13,
    terrain: (x, y) => {
      if (y >= 5 && y <= 7 && (x < 6 || x > 11)) return 'water'; // 강(다리 밖)
      if (x >= 8 && x <= 9 && y >= 4 && y <= 8) return 'hill'; // 다리 위 고지
      if (x >= 2 && x <= 3 && y >= 9 && y <= 10) return 'forest'; // 서쪽 피난 마을
      return 'plain';
    },
  },
  // 라운드 8: 감시탑 구릉지. 중앙 계곡(물), 좌우 고지, 감시탑(바위)
  r8_hills: {
    width: 17, height: 14,
    terrain: (x, y) => {
      if (x >= 7 && x <= 9 && y >= 5 && y <= 8) return 'water'; // 중앙 계곡
      if (x >= 1 && x <= 3 && y >= 4 && y <= 6) return 'hill'; // 좌 고지
      if (x >= 13 && x <= 15 && y >= 7 && y <= 9) return 'hill'; // 우 고지
      if ((x === 4 && y === 3) || (x === 12 && y === 10)) return 'rock'; // 감시탑
      return 'plain';
    },
  },
  // 라운드 9: 폐허가 된 서부 사원. 무너진 벽(바위), 숲, 석상
  r9_ruins: {
    width: 18, height: 15,
    terrain: (x, y) => {
      if ((y === 4 || y === 10) && x % 3 === 0) return 'rock'; // 무너진 벽 잔해
      if (x >= 2 && x <= 4 && y >= 6 && y <= 8) return 'forest';
      if (x >= 13 && x <= 15 && y >= 6 && y <= 8) return 'forest';
      if ((x === 8 && y === 7) || (x === 9 && y === 7)) return 'rock'; // 석상
      return 'plain';
    },
  },
  // 라운드 10: 산중 은거지와 절벽길. 좁은 절벽(바위), 중앙 가옥(숲)
  r10_hermitage: {
    width: 16, height: 16,
    terrain: (x, y) => {
      if ((x <= 1 || x >= 14) && y >= 4 && y <= 11) return 'rock'; // 절벽
      if (x >= 6 && x <= 9 && y >= 7 && y <= 9) return 'forest'; // 중앙 가옥 숲
      if (x >= 6 && x <= 9 && y >= 2 && y <= 3) return 'hill'; // 북쪽 탈출로 고지
      return 'plain';
    },
  },
  // 라운드 11: 숲과 민가가 섞인 점령 마을. 숲 밀집, 화공 대비 개활
  r11_village2: {
    width: 19, height: 15,
    terrain: (x, y) => {
      if (x >= 4 && x <= 7 && y >= 4 && y <= 6) return 'forest';
      if (x >= 11 && x <= 14 && y >= 8 && y <= 10) return 'forest';
      if (x >= 8 && x <= 10 && y >= 6 && y <= 7) return 'hill';
      if ((x === 2 && y === 9) || (x === 16 && y === 5)) return 'rock';
      return 'plain';
    },
  },
  // 라운드 12: 폐광 내부와 지상 치료소. 좁은 갱도(바위), 독 지대(물로 표현), 광차 선로
  r12_mine: {
    width: 18, height: 16,
    terrain: (x, y) => {
      if ((x === 5 || x === 12) && y >= 3 && y <= 12) return 'rock'; // 갱도 벽
      if (x >= 7 && x <= 10 && y >= 6 && y <= 9) return 'water'; // 독 지대
      if (x >= 2 && x <= 3 && y >= 11 && y <= 12) return 'hill'; // 지상 치료소 단
      return 'plain';
    },
  },
  // 라운드 13: 수도 외곽 피난 구역. 성벽(바위), 시장(숲), 수로(물)
  r13_capital: {
    width: 20, height: 16,
    terrain: (x, y) => {
      if (y === 6 && x !== 9 && x !== 10) return 'rock'; // 성벽(문만 개방)
      if (x >= 4 && x <= 7 && y >= 9 && y <= 11) return 'forest'; // 시장
      if (x >= 14 && y >= 8 && y <= 12) return 'water'; // 수로
      if (x >= 12 && x <= 14 && y >= 2 && y <= 3) return 'hill'; // 귀족문 단
      return 'plain';
    },
  },
  // 라운드 14: 군사 창고와 처형장. 창고(바위 3), 중앙 광장, 남쪽 감옥
  r14_warehouse: {
    width: 18, height: 17,
    terrain: (x, y) => {
      if (((x >= 2 && x <= 3) || (x >= 8 && x <= 9) || (x >= 14 && x <= 15)) && y >= 2 && y <= 3) return 'rock'; // 창고 3
      if (x >= 7 && x <= 10 && y >= 8 && y <= 9) return 'hill'; // 처형대 단
      if (x >= 6 && x <= 11 && y >= 13 && y <= 14) return 'forest'; // 남쪽 감옥 마당
      return 'plain';
    },
  },
  // 라운드 15: 포로 수용소 내부. 감시탑(바위), 우리(숲), 가족 대피 구역
  r15_camp: {
    width: 14, height: 13,
    terrain: (x, y) => {
      if ((x === 2 && y === 2) || (x === 11 && y === 2) || (x === 2 && y === 10) || (x === 11 && y === 10)) return 'rock'; // 감시탑
      if (x >= 5 && x <= 8 && y >= 5 && y <= 7) return 'forest'; // 우리
      if (x >= 6 && x <= 7 && y >= 10 && y <= 11) return 'hill'; // 가족 대피 구역
      return 'plain';
    },
  },
  // 라운드 16: 중립 성당으로 이어지는 도시 도로. 세 갈래 길, 중앙 광장
  r16_city: {
    width: 20, height: 15,
    terrain: (x, y) => {
      if ((x === 6 || x === 13) && y >= 3 && y <= 11) return 'rock'; // 길 분리대
      if (x >= 8 && x <= 11 && y >= 6 && y <= 8) return 'hill'; // 중앙 광장 단
      if (x >= 2 && x <= 3 && y >= 5 && y <= 7) return 'forest';
      if (x >= 16 && x <= 17 && y >= 7 && y <= 9) return 'forest';
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
