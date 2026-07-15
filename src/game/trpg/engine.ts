import { getJob } from '../data/jobs';
import { getSkill, skillUsableWithWeapon } from '../data/skills';
import { getWeapon, weaponRange } from '../data/weapons';
import { rollWeaponProc } from '../engine/weaponEffects';
import { typeAdvantageMultiplier } from '../engine/typeChart';
import type { Character, Faction, Skill } from '../types';
import {
  blocksSight,
  crossTiles,
  diamondTiles,
  generateMap,
  GRID_SIZE,
  isEnterable,
  inBounds,
  lineBetween,
  manhattan,
  moveCost,
  type Coord,
  type TerrainMap,
} from './map';

export type Team = 'player' | 'enemy';
export type Weather = 'clear' | 'rain' | 'snow' | 'heat';
export type TimeOfDay = 'day' | 'night';
export type ArmorType = 'cloth' | 'leather' | 'mail' | 'plate';

/** 방어구 종류. 중갑·판금은 무겁다(이동력 -1, 방어력 +5). */
export const ARMORS: { id: ArmorType; name: string }[] = [
  { id: 'cloth', name: '천' },
  { id: 'leather', name: '가죽' },
  { id: 'mail', name: '중갑' },
  { id: 'plate', name: '판금' },
];

export function armorName(t: ArmorType): string {
  return ARMORS.find((a) => a.id === t)?.name ?? t;
}

/** 방어구 착용 요구 공격력. */
export function armorRequiredAttack(t: ArmorType): number {
  return armorAttackReq(t);
}

/** 방어구 착용 요구 레벨(설계 기준). */
export function armorRequiredLevel(t: ArmorType): number {
  return ARMOR_STATS[t].reqLevel;
}

function isHeavyArmor(t: ArmorType): boolean {
  return t === 'mail' || t === 'plate';
}

function isLightArmor(t: ArmorType): boolean {
  return t === 'cloth' || t === 'leather';
}

// ── 진행/능력치 상수 ────────────────────────────────────────────────
const STAT_BASE = 5; // 초기 능력치(레벨1)

/**
 * 방어구: 방어력 / 요구 근력 배수 / 착용 요구 레벨(5단위).
 * 요구 근력(공격력) = round(요구 레벨 × 배수). 천은 요구 없음(가죽 ×1 / 중갑 ×1.75 / 판금 ×2.5).
 * 방어력은 요구 레벨에 비례(=요구 레벨)해 재산정.
 * 무게로 인한 이동력/지구력 디버프는 없음(이동력은 지구력에서만 산출).
 */
const ARMOR_STATS: Record<ArmorType, { def: number; strengthMult: number; reqLevel: number }> = {
  cloth: { def: 1, strengthMult: 0, reqLevel: 100 },
  leather: { def: 5, strengthMult: 0.5, reqLevel: 100 },
  mail: { def: 10, strengthMult: 1, reqLevel: 100 },
  plate: { def: 15, strengthMult: 1.5, reqLevel: 100 },
};

/** 방어구 착용에 필요한 근력(공격력) = round(요구 레벨 × 배수). 천=0. */
function armorAttackReq(t: ArmorType): number {
  return Math.round(ARMOR_STATS[t].strengthMult * ARMOR_STATS[t].reqLevel);
}

// ── 이동력 상수 ────────────────────────────────────────────────────
/** 유효 이동력 상한(칸). 이 값을 넘는 이동력(지구력 초과분)은 페널티 완충용. */
const MOVE_CAP = 3;
/**
 * 지구력 N당 원시 이동력 +1칸(초기 지구력 5에서 1칸 시작). 연속값.
 * 방어구 무게로 인한 이동력/지구력 디버프는 없음 → 이동력은 순수 지구력에서만 산출.
 * 보정(만렙 100, 297포인트 분배):
 *  - 근력 250 몰빵(지구력 57) → 이동력 1.
 *  - 근력 100 + 나머지 지구력(지구력 207) → 이동력 3.
 */
const ENDURANCE_PER_TILE = 100;
/** 지구력 → 원시 이동력(칸, 연속값). floor는 최종 칸수 계산에서만 적용. */
function moveFromEndurance(endurance: number): number {
  return 1 + (endurance - STAT_BASE) / ENDURANCE_PER_TILE;
}
/**
 * 테스트 캐릭터 아키타입 빌드(만렙 100, 분배 포인트 297, 기본 스탯 5).
 * 착용 방어구 요구 레벨 100 기준 요구 근력 → 판금 150 / 중갑 100 / 가죽 50.
 *  - 전사: 근력 150(판금) / 체력 80 / 지구력 77 → 이동력 맑음 1 · 비 1
 *  - 궁수: 근력 100(중갑) / 스피드 70 / 체력 30 / 나머지 지구력 117 → 이동력 맑음 2 · 비 1
 *  - 법사: 근력 50(가죽) / 마력 120 / 체력 30 / 스피드 50 / 지구력 57 → 이동력 맑음 1 · 비 1(경장)
 */
interface StatBuild {
  hp: number;
  attack: number;
  magic: number;
  endurance: number;
  speed: number;
}
const TEST_BUILD: Record<'melee' | 'ranged' | 'magic', StatBuild> = {
  melee: { hp: 80, attack: 150, magic: 5, endurance: 77, speed: 5 },
  ranged: { hp: 30, attack: 100, magic: 5, endurance: 117, speed: 70 },
  magic: { hp: 30, attack: 50, magic: 120, endurance: 57, speed: 50 },
};

// ── 정신력 상수 ────────────────────────────────────────────────────
/** 정신력(디버프/부가효과 무시 확률) 상한. */
const WILLPOWER_CAP = 0.7;
/** 이 마력 수치에서 정신력이 상한(70%)에 도달. */
const WILLPOWER_MAGIC_FOR_CAP = 200;

export interface TrpgUnit {
  id: string;
  name: string;
  jobId: string;
  faction: Faction;
  team: Team;
  gender: 'male' | 'female';
  pos: Coord;
  hp: number;
  maxHp: number;
  attack: number; // 공격력(물리) + 방어구 착용 요구 판정
  magic: number; // 마력(마법) + 정신력 산정
  endurance: number; // 지구력(이동력 산정)
  defense: number; // 방어력 보정치(기본 0, 방어력은 방어구로만; 디버프로 감소 가능)
  speed: number;
  vision: number; // 시야(칸). 모든 캐릭터 5 고정.
  armorType: ArmorType; // 장착 방어구
  weaponId: string;
  skills: string[];
  skillUses: Record<string, number>;
  alive: boolean;
  guardFactor: number; // 다음 피격 피해 배수(방어 1회용). 기본 1.
  attackMult: number; // 기합/버프 누적 공격 배수.
}

export interface UnitDef {
  character: Character;
  gender: 'male' | 'female';
}


/** 기술 사용 횟수 기본값(명시값 우선). */
export function skillMaxUses(skill: Skill): number {
  if (skill.uses != null) return skill.uses;
  if (skill.category !== 'attack') return 3;
  if (skill.hits) return 3;
  if (skill.power >= 80) return 2;
  if (skill.power >= 55) return 3;
  return 5;
}

export interface StepResult {
  lines: string[];
  attackerId?: string;
  targetIds?: string[];
}

export class TrpgGame {
  map: TerrainMap;
  units: TrpgUnit[];
  order: string[] = [];
  turnIndex = 0;
  round = 1;
  log: string[] = [];
  finished = false;
  winner: Team | null = null;
  movedThisTurn = false;
  actedThisTurn = false;
  moveFrom: Coord | null = null; // 이동 취소(뒤로가기)용 직전 위치
  movedExhausted = false; // 등반(이동력 초과 이동)으로 이번 턴 행동 불가 여부
  weather: Weather;
  time: TimeOfDay;
  private rng: () => number;

  constructor(
    playerDefs: UnitDef[],
    enemyDefs: UnitDef[],
    map?: TerrainMap,
    rng: () => number = Math.random,
    time?: TimeOfDay,
    weather?: Weather,
  ) {
    this.rng = rng;
    this.map = map ?? generateMap(rng);
    this.time = time ?? (rng() < 0.5 ? 'day' : 'night');
    this.weather = weather ?? (['clear', 'rain', 'snow', 'heat'] as const)[Math.floor(rng() * 4)];
    const playerStarts: Coord[] = [
      { r: 7, c: 2 },
      { r: 7, c: 4 },
      { r: 7, c: 6 },
    ];
    const enemyStarts: Coord[] = [
      { r: 2, c: 2 },
      { r: 2, c: 4 },
      { r: 2, c: 6 },
    ];
    this.units = [
      ...playerDefs.map((d, i) => this.makeUnit(d, 'player', playerStarts[i] ?? { r: 7, c: i })),
      ...enemyDefs.map((d, i) => this.makeUnit(d, 'enemy', enemyStarts[i] ?? { r: 2, c: i })),
    ];
    this.buildOrder();
  }

  private makeUnit(def: UnitDef, team: Team, pos: Coord): TrpgUnit {
    const ch = def.character;
    const job = getJob(ch.jobId);
    const weaponId = `trpg_${job.type === 'melee' ? 'sword' : job.type === 'ranged' ? 'bow' : 'staff'}`;
    const skillUses: Record<string, number> = {};
    for (const id of ch.skills) skillUses[id] = skillMaxUses(getSkill(id));

    // 테스트 캐릭터 능력치는 직업별 아키타입 빌드(만렙 100)로 통일한다.
    const build = TEST_BUILD[job.type];

    return {
      id: `${team}_${ch.jobId}`,
      name: ch.name,
      jobId: ch.jobId,
      faction: ch.faction,
      team,
      gender: def.gender,
      pos,
      hp: build.hp,
      maxHp: build.hp,
      attack: build.attack,
      magic: build.magic,
      endurance: build.endurance,
      defense: 0, // 방어력은 방어구로만(능력치로 올리지 않음)
      speed: build.speed,
      vision: 5,
      armorType: job.type === 'melee' ? 'plate' : job.type === 'ranged' ? 'mail' : 'leather',
      weaponId,
      skills: [...ch.skills],
      skillUses,
      alive: true,
      guardFactor: 1,
      attackMult: 1,
    };
  }

  private buildOrder() {
    // 눈: 라운드 시작 시 가벼운 방어구(천/가죽) 유닛의 체력을 1/16 감소.
    if (this.weather === 'snow') {
      for (const u of this.units) {
        if (!u.alive || !isLightArmor(u.armorType)) continue;
        const dmg = Math.max(1, Math.floor(u.maxHp / 16));
        u.hp = Math.max(0, u.hp - dmg);
        this.log.push(`${u.name}가 눈보라로 체력 ${dmg} 감소.`);
        if (u.hp <= 0) {
          u.alive = false;
          this.log.push(`${u.name}가 쓰러져 묘지로 이동했다.`);
        }
      }
      this.checkEnd();
    }
    // 폭염: 라운드 시작 시 모든 유닛의 체력을 1/16 감소. 단 정신력(부가효과 무시 확률)로 저항 가능.
    if (this.weather === 'heat') {
      for (const u of this.units) {
        if (!u.alive) continue;
        if (this.rng() < this.willpower(u)) {
          this.log.push(`${u.name}가 정신력으로 폭염을 버텨냈다.`);
          continue;
        }
        const dmg = Math.max(1, Math.floor(u.maxHp / 16));
        u.hp = Math.max(0, u.hp - dmg);
        this.log.push(`${u.name}가 폭염으로 체력 ${dmg} 감소.`);
        if (u.hp <= 0) {
          u.alive = false;
          this.log.push(`${u.name}가 쓰러져 묘지로 이동했다.`);
        }
      }
      this.checkEnd();
    }
    this.order = this.units
      .filter((u) => u.alive)
      .sort((a, b) => b.speed - a.speed || (a.team === 'player' ? -1 : 1))
      .map((u) => u.id);
    this.turnIndex = 0;
    this.movedThisTurn = false;
    this.actedThisTurn = false;
  }

  /** 지구력에서 산출한 원시 이동력(상한/페널티 적용 전, 연속값). */
  rawMove(unit: TrpgUnit): number {
    return moveFromEndurance(unit.endurance);
  }

  /** 정신력: 상대 디버프/부가효과를 무시할 확률(마력 기반, 최대 70%). */
  willpower(unit: TrpgUnit): number {
    return Math.min(WILLPOWER_CAP, (WILLPOWER_CAP * unit.magic) / WILLPOWER_MAGIC_FOR_CAP);
  }

  /** 이번 턴 이동 페널티 합(방어구 무게 + 물 + 날씨). 소수 허용(rawMove에서 차감). */
  movePenalty(unit: TrpgUnit): number {
    let p = 0;
    // 방어구 무게(날씨 무관): 중갑 −0.3, 판금 −0.5. 맑음에도 중장은 이동 감소.
    if (unit.armorType === 'mail') p += 0.3;
    else if (unit.armorType === 'plate') p += 0.5;
    if (this.map[unit.pos.r][unit.pos.c] === 'water') p += 0.5; // 물 위: rawMove −0.5
    if (this.weather === 'rain' && isHeavyArmor(unit.armorType)) p += 0.5; // 비: 중갑·판금 추가 −0.5
    if (this.weather === 'snow' && isLightArmor(unit.armorType)) p += 0.5; // 눈: 천·가죽 −0.5
    return p;
  }

  /**
   * 유효 이동력 E = min(CAP, rawMove − 페널티). 소수일 수 있다(완충 계산용).
   * - CAP(3)로 상한을 두되, rawMove가 3을 넘으면 그 초과분이 페널티를 먼저 흡수(완충).
   */
  effectiveMove(unit: TrpgUnit): number {
    return Math.min(MOVE_CAP, this.rawMove(unit) - this.movePenalty(unit));
  }

  /**
   * 실제 이동 가능 칸수.
   * - 유효 이동력 ≥ 1 → floor(유효 이동력).
   * - 0 < 유효 이동력 < 1 → **2턴에 1칸**(라운드 홀수에만 1칸, 짝수엔 0). 다른 행동은 가능.
   * - 0 이하 → 이동 불가.
   */
  moveTiles(unit: TrpgUnit): number {
    const e = this.effectiveMove(unit);
    if (e >= 1) return Math.floor(e);
    if (e > 0) return this.round % 2 === 1 ? 1 : 0; // 이동력 1 미만: 2턴에 한 번 이동
    return 0;
  }

  /** 이동력이 1 미만이라 2턴에 한 번만 이동 가능한 상태인지(UI 안내용). */
  isSlowMover(unit: TrpgUnit): boolean {
    const e = this.effectiveMove(unit);
    return e > 0 && e < 1;
  }

  /** 실제 방어력 = 방어구 보너스(천1/가죽5/중갑10/판금15) + 보정치(디버프), 최소 0. */
  effectiveDefense(unit: TrpgUnit): number {
    return Math.max(0, ARMOR_STATS[unit.armorType].def + unit.defense);
  }

  /** 날씨/시간대를 반영한 실제 시야(최소 0). 밤에는 3칸으로 제한. */
  effectiveVision(unit: TrpgUnit): number {
    let v = unit.vision;
    if (this.map[unit.pos.r][unit.pos.c] === 'hill') v += 1; // 언덕 위: 시야 +1
    if (this.weather === 'rain' || this.weather === 'snow') v -= 1;
    if (this.time === 'night') v = Math.min(v, 3);
    return Math.max(0, v);
  }

  /** 지정 칸에 상하좌우 인접(맨해튼 1)한 살아있는 아군이 있는지. 숲 안 캐릭터 감지용. */
  private allyOrthAdjacent(r: number, c: number): boolean {
    return this.units.some(
      (u) => u.alive && u.team === 'player' && Math.abs(u.pos.r - r) + Math.abs(u.pos.c - c) <= 1,
    );
  }

  /** 플레이어 팀이 볼 수 있는 칸 집합("r,c"). 각 아군 유닛의 시야 마름모 합집합. (숲 지형 자체는 항상 표시) */
  visibleSet(): Set<string> {
    const set = new Set<string>();
    for (const u of this.units) {
      if (!u.alive || u.team !== 'player') continue;
      for (const t of diamondTiles(u.pos, this.effectiveVision(u))) set.add(`${t.r},${t.c}`);
    }
    return set;
  }

  /**
   * 상대 유닛이 플레이어에게 보이는지.
   * - 아군은 항상 보임.
   * - 숲 안의 상대는 **상하좌우 인접 아군**이 있어야만 보임(없으면 숨음).
   * - 그 외는 해당 칸이 시야 안이면 보임.
   */
  unitVisibleToPlayer(u: TrpgUnit): boolean {
    if (u.team === 'player') return true;
    if (this.map[u.pos.r][u.pos.c] === 'forest') return this.allyOrthAdjacent(u.pos.r, u.pos.c);
    return this.visibleSet().has(`${u.pos.r},${u.pos.c}`);
  }

  /** 숲 안에서는 원거리·마법 무기로 공격할 수 없다(근접 무기만 가능). */
  forestBlocksAttack(unit: TrpgUnit): boolean {
    return this.map[unit.pos.r][unit.pos.c] === 'forest' && this.weaponOf(unit).type !== 'melee';
  }

  unitById(id: string): TrpgUnit | undefined {
    return this.units.find((u) => u.id === id);
  }

  current(): TrpgUnit | null {
    if (this.finished) return null;
    const id = this.order[this.turnIndex];
    const unit = id ? this.unitById(id) : undefined;
    return unit && unit.alive ? unit : null;
  }

  unitAt(r: number, c: number): TrpgUnit | null {
    return this.units.find((u) => u.alive && u.pos.r === r && u.pos.c === c) ?? null;
  }

  weaponOf(unit: TrpgUnit) {
    return getWeapon(unit.weaponId);
  }

  rangeOf(unit: TrpgUnit): number {
    return weaponRange(this.weaponOf(unit));
  }

  /**
   * 이동력 예산 내 각 칸까지의 최단 이동비용/경로를 다익스트라로 계산한다.
   * - 바위는 통과 불가. 물·언덕은 밟고 멈출 수만 있고 통과(관통) 불가.
   * - 적 유닛이 있는 칸은 장애물(통과 불가) → 넘어갈 수 없고 돌아가야 한다.
   * - 아군 유닛 칸은 통과는 되지만 그 칸에 멈출 수는 없다.
   */
  private computeDistances(unit: TrpgUnit): { dist: Map<string, number>; prev: Map<string, string>; budget: number } {
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const visited = new Set<string>();
    const startKey = `${unit.pos.r},${unit.pos.c}`;
    dist.set(startKey, 0);
    const budget = this.moveTiles(unit);

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
      // 물·언덕 타일은 밟고 멈출 수는 있으나 **통과 불가**(너머로는 진행 못 함). 출발 칸은 예외.
      const here = this.map[r][c];
      if ((here === 'water' || here === 'hill') && curKey !== startKey) continue;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const terrain = this.map[nr][nc];
        if (!isEnterable(terrain)) continue; // 바위
        const occ = this.unitAt(nr, nc);
        // 적 유닛은 장애물(통과 불가). 단 숲 안의 적은 시야 밖일 수 있어 경로 계산에서는 통과 가능으로 두고,
        // 실제 이동 시 그 숲 앞칸에서 멈춘다(planMoveTo에서 처리).
        if (occ && occ.team !== unit.team && terrain !== 'forest') continue;
        const nd = curDist + moveCost(terrain);
        if (nd > budget) continue;
        const nk = `${nr},${nc}`;
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, curKey);
        }
      }
    }
    return { dist, prev, budget };
  }

  /** 이동 가능한 도착 칸(비용 예산 내, 빈 칸만). 마름모 형태로 퍼진다. */
  reachableTiles(unit: TrpgUnit): Coord[] {
    const { dist, budget } = this.computeDistances(unit);
    const result: Coord[] = [];
    for (const [k, d] of dist) {
      if (d <= 0 || d > budget) continue;
      const [r, c] = k.split(',').map(Number);
      if (this.unitAt(r, c)) continue; // 아군 칸 등 점유 칸엔 멈출 수 없음
      result.push({ r, c });
    }
    return result;
  }

  private buildPath(prev: Map<string, string>, start: Coord, goal: Coord): Coord[] {
    const startKey = `${start.r},${start.c}`;
    const goalKey = `${goal.r},${goal.c}`;
    if (goalKey === startKey) return [{ ...start }];
    const path: Coord[] = [];
    let k: string | undefined = goalKey;
    while (k) {
      const [r, c] = k.split(',').map(Number);
      path.push({ r, c });
      if (k === startKey) break;
      k = prev.get(k);
    }
    return path.reverse();
  }

  /** 출발 칸부터 목표 칸까지의 경로(양 끝 포함). 도달 불가면 null. */
  pathTo(unit: TrpgUnit, coord: Coord): Coord[] | null {
    const { prev } = this.computeDistances(unit);
    const startKey = `${unit.pos.r},${unit.pos.c}`;
    const goalKey = `${coord.r},${coord.c}`;
    if (goalKey !== startKey && !prev.has(goalKey)) return null;
    return this.buildPath(prev, unit.pos, coord);
  }

  /** 원거리 시야(활 사선)가 바위에 막히는지. */
  private losBlocked(from: Coord, to: Coord): boolean {
    for (const t of lineBetween(from, to)) {
      if (blocksSight(this.map[t.r][t.c])) return true;
    }
    return false;
  }

  usableSkills(unit: TrpgUnit): Skill[] {
    const weapon = this.weaponOf(unit);
    return unit.skills.map((id) => getSkill(id)).filter((s) => skillUsableWithWeapon(s, weapon));
  }

  /** 해당 기술의 유효 대상 유닛 목록(자기 대상 기술은 자신). */
  targetsFor(unit: TrpgUnit, skill: Skill): TrpgUnit[] {
    if (skill.target === 'self' || skill.category === 'heal' || skill.category === 'buff' || skill.category === 'defense') {
      return [unit];
    }
    if (this.forestBlocksAttack(unit)) return []; // 숲 안: 원거리·마법 공격 불가
    const range = this.rangeOf(unit);
    const ranged = this.weaponOf(unit).type !== 'melee';
    return this.units.filter((t) => {
      if (!t.alive || t.team === unit.team) return false;
      if (manhattan(unit.pos, t.pos) > range) return false;
      if (ranged && this.losBlocked(unit.pos, t.pos)) return false; // 바위가 활 사선 차단
      return true;
    });
  }

  private randInt(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  private computeHit(attacker: TrpgUnit, target: TrpgUnit, skill: Skill): { damage: number; crit: boolean } {
    const weapon = this.weaponOf(attacker);
    const targetWeapon = this.weaponOf(target);
    const proc = rollWeaponProc(weapon, 0, this.rng);

    const atkStat = (skill.type === 'magic' ? attacker.magic : attacker.attack) * attacker.attackMult;
    const power = skill.power + weapon.basePower * 0.5;
    const defense = this.effectiveDefense(target) * (proc.pierce ? 0.5 : 1);
    const raw = (atkStat * power) / (defense + 50);

    // 무기 상성(들고 있는 무기끼리): 근거리>원거리>마법>근거리
    const matchup = typeAdvantageMultiplier(weapon.type, targetWeapon.type);
    const stab = getJob(attacker.jobId).type === skill.type ? 1.2 : 1;

    // 숙련도(강화)로 편차 감소. 현재 강화 0 -> ±20%.
    const varianceWidth = 0.2;
    const variance = 1 - varianceWidth + this.rng() * varianceWidth * 2;

    let dmg = raw * matchup * stab * variance;
    dmg = dmg * target.guardFactor; // 방어 상태면 0 또는 0.5
    if (proc.extraHit) dmg *= 1.3; // 활 연사 부가효과

    return { damage: Math.max(target.guardFactor === 0 ? 0 : 1, Math.round(dmg)), crit: false };
  }

  /** 한 대상에게 공격 1회(다단히트 포함)를 적용하고 로그를 남긴다. */
  private applyAttack(attacker: TrpgUnit, target: TrpgUnit, skill: Skill, lines: string[]) {
    const hitCount = skill.hits ? this.randInt(skill.hits.min, skill.hits.max) : 1;
    let total = 0;
    for (let i = 0; i < hitCount; i += 1) total += this.computeHit(attacker, target, skill).damage;
    if (target.guardFactor === 0) {
      total = 0;
      lines.push(`${attacker.name}의 ${skill.name}! 하지만 ${target.name}가 완전히 막아냈다!`);
    } else {
      const hitLabel = hitCount > 1 ? ` (${hitCount}회 명중)` : '';
      lines.push(`${attacker.name}의 ${skill.name}! ${target.name}에게 ${total}의 피해${hitLabel}.`);
    }
    target.guardFactor = 1;
    target.hp = Math.max(0, target.hp - total);
    if (target.hp <= 0) {
      target.alive = false;
      lines.push(`${target.name}가 쓰러져 묘지로 이동했다.`);
    }
  }

  /** 광역 기술의 유효 중심 칸: 사거리·시야 내이면서 십자 범위에 적이 1명 이상 걸리는 칸. */
  aoeCenters(unit: TrpgUnit, skill: Skill): Coord[] {
    if (this.forestBlocksAttack(unit)) return []; // 숲 안: 원거리·마법 공격 불가
    const range = this.rangeOf(unit);
    const ranged = this.weaponOf(unit).type !== 'melee';
    const radius = skill.aoeRadius ?? 1;
    const centers: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const center = { r, c };
        if (manhattan(unit.pos, center) > range) continue;
        if (ranged && this.losBlocked(unit.pos, center)) continue;
        const tiles = crossTiles(center, radius);
        const hitsEnemy = this.units.some(
          (u) => u.alive && u.team !== unit.team && tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c),
        );
        if (hitsEnemy) centers.push(center);
      }
    }
    return centers;
  }

  /** 광역 공격: 선택한 중심 칸의 십자 범위 안 모든 적에게 피해. */
  useSkillAoe(skillId: string, center: Coord): StepResult {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { lines };
    const skill = getSkill(skillId);
    if (this.forestBlocksAttack(unit)) {
      lines.push(`${unit.name}: 숲 안에서는 원거리·마법 무기로 공격할 수 없다.`);
      return { lines };
    }
    if ((unit.skillUses[skillId] ?? 0) <= 0) {
      lines.push(`${unit.name}: ${skill.name}의 사용 횟수가 없다.`);
      return { lines };
    }
    unit.skillUses[skillId] -= 1;
    const tiles = crossTiles(center, skill.aoeRadius ?? 1);
    const victims = this.units.filter(
      (u) => u.alive && u.team !== unit.team && tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c),
    );
    if (victims.length === 0) {
      lines.push(`${unit.name}의 ${skill.name}! 범위 안에 적이 없었다.`);
    } else {
      for (const v of victims) this.applyAttack(unit, v, skill, lines);
    }
    this.actedThisTurn = true;
    for (const l of lines) this.log.push(l);
    this.checkEnd();
    return { lines, attackerId: unit.id, targetIds: victims.map((v) => v.id) };
  }

  /** 현재 유닛이 기술을 사용한다. targetId 미지정 시 자기 대상 기술로 간주. */
  useSkill(skillId: string, targetId?: string): StepResult {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { lines };
    const skill = getSkill(skillId);
    const isSupport =
      skill.target === 'self' || skill.category === 'heal' || skill.category === 'buff' || skill.category === 'defense';
    if (!isSupport && this.forestBlocksAttack(unit)) {
      lines.push(`${unit.name}: 숲 안에서는 원거리·마법 무기로 공격할 수 없다.`);
      return { lines };
    }
    if ((unit.skillUses[skillId] ?? 0) <= 0) {
      lines.push(`${unit.name}: ${skill.name}의 사용 횟수가 없다.`);
      return { lines };
    }
    unit.skillUses[skillId] -= 1;
    const affected: string[] = [];

    if (skill.category === 'heal') {
      const heal = Math.max(1, Math.round(unit.maxHp * (skill.healPercent ?? 0)));
      const before = unit.hp;
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      lines.push(`${unit.name}의 ${skill.name}! 체력을 ${unit.hp - before} 회복했다.`);
      affected.push(unit.id);
    } else if (skill.category === 'buff') {
      unit.attackMult = Math.min(2, unit.attackMult * 1.2);
      lines.push(`${unit.name}의 ${skill.name}! 공격력이 상승했다.`);
      affected.push(unit.id);
    } else if (skill.category === 'defense') {
      unit.guardFactor = skill.fullGuard ? 0 : 0.5;
      lines.push(`${unit.name}가 ${skill.name} 태세를 취했다.`);
      affected.push(unit.id);
    } else if (skill.category === 'debuff') {
      const target = targetId ? this.unitById(targetId) : undefined;
      if (target) {
        if (this.rng() < this.willpower(target)) {
          lines.push(`${unit.name}의 ${skill.name}! 하지만 ${target.name}가 정신력으로 저항했다.`);
        } else {
          target.defense -= 1; // 방어력 보정치를 낮춤(실효 방어력 -1, 최소 0)
          lines.push(`${unit.name}의 ${skill.name}! ${target.name}의 방어력이 하락했다.`);
        }
        affected.push(target.id);
      }
    } else {
      const target = targetId ? this.unitById(targetId) : undefined;
      if (!target) {
        lines.push(`${unit.name}: 대상이 없다.`);
        return { lines, attackerId: unit.id };
      }
      this.applyAttack(unit, target, skill, lines);
      affected.push(target.id);
    }

    this.actedThisTurn = true;
    for (const l of lines) this.log.push(l);
    this.checkEnd();
    return { lines, attackerId: unit.id, targetIds: affected };
  }

  /** 무기 교체(그 턴 공격 기술 사용 불가). 요구 능력치를 만족해야 한다. */
  swapWeapon(weaponId: string): { ok: boolean; lines: string[] } {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { ok: false, lines };
    const weapon = getWeapon(weaponId);
    const req = weapon.requirement ?? {};
    const stats: Record<string, number> = { attack: unit.attack, defense: unit.defense, hp: unit.maxHp, speed: unit.speed };
    for (const [k, v] of Object.entries(req)) {
      if ((stats[k] ?? 0) < (v ?? 0)) {
        lines.push(`${unit.name}: ${weapon.name}의 요구 능력치(${k} ${v})를 만족하지 못한다.`);
        return { ok: false, lines };
      }
    }
    unit.weaponId = weaponId;
    lines.push(`${unit.name}가 무기를 ${weapon.name}(으)로 교체했다. (이번 턴 공격 불가)`);
    this.actedThisTurn = true; // 공격 기술 사용 불가 = 행동 종료
    for (const l of lines) this.log.push(l);
    return { ok: true, lines };
  }

  /** 방어구 교체(그 턴 공격 기술 사용 불가). 요구 공격력을 만족해야 한다. */
  swapArmor(armorType: ArmorType): { ok: boolean; lines: string[] } {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { ok: false, lines };
    const req = armorAttackReq(armorType);
    if (unit.attack < req) {
      lines.push(`${unit.name}: ${armorName(armorType)} 착용에 필요한 공격력(${req})이 부족하다. (공격력 ${unit.attack})`);
      return { ok: false, lines };
    }
    unit.armorType = armorType;
    lines.push(`${unit.name}가 방어구를 ${armorName(armorType)}(으)로 교체했다. (이번 턴 공격 불가)`);
    this.actedThisTurn = true;
    for (const l of lines) this.log.push(l);
    return { ok: true, lines };
  }

  /**
   * 이동을 예약하고 경로를 반환한다(양 끝 포함). 실제 위치 갱신은 호출측(애니메이션)에서
   * 마지막 칸으로 설정한다. 도달 불가/이미 이동함이면 null.
   */
  planMoveTo(coord: Coord): Coord[] | null {
    const unit = this.current();
    if (!unit || this.movedThisTurn) return null;
    if (this.unitAt(coord.r, coord.c) || !isEnterable(this.map[coord.r][coord.c])) return null;
    const { dist, prev, budget } = this.computeDistances(unit);
    const goalKey = `${coord.r},${coord.c}`;
    const dGoal = dist.get(goalKey);
    if (dGoal == null || dGoal <= 0 || dGoal > budget) return null; // 도달 불가

    let path = this.buildPath(prev, unit.pos, coord);
    // 경로상 적이 숨어있는 숲 칸을 만나면 그 앞칸에서 멈춘다(매복). 첫 번째 그런 칸 기준.
    for (let i = 1; i < path.length; i += 1) {
      const p = path[i];
      const occ = this.unitAt(p.r, p.c);
      if (this.map[p.r][p.c] === 'forest' && occ && occ.team !== unit.team) {
        path = path.slice(0, i); // path[i-1](숲 앞칸)까지만
        break;
      }
    }

    this.moveFrom = { ...unit.pos };
    this.movedThisTurn = true;
    const dest = path[path.length - 1];
    // 언덕에 오르면 그 턴에는 더 이상 행동(공격·무기 교체 등)할 수 없다.
    this.movedExhausted = this.map[dest.r][dest.c] === 'hill';
    return path;
  }

  /** 유닛 위치를 즉시 지정(애니메이션 완료 후/헤드리스 처리용). */
  setUnitPos(unit: TrpgUnit, coord: Coord) {
    unit.pos = { ...coord };
  }

  /** 이동을 되돌려(뒤로가기) 이동 전 위치/상태로 복구한다. 아직 행동하지 않았을 때만 가능. */
  undoMove(): boolean {
    const unit = this.current();
    if (!unit || !this.moveFrom || this.actedThisTurn) return false;
    unit.pos = { ...this.moveFrom };
    this.moveFrom = null;
    this.movedThisTurn = false;
    this.movedExhausted = false;
    return true;
  }

  /** 현재 유닛의 턴을 종료하고 다음 유닛으로 넘어간다. */
  endTurn() {
    if (this.finished) return;
    // 다음 살아있는 유닛으로
    this.moveFrom = null;
    this.movedExhausted = false;
    do {
      this.turnIndex += 1;
      if (this.turnIndex >= this.order.length) {
        this.round += 1;
        this.buildOrder();
        return;
      }
    } while (!this.current());
    this.movedThisTurn = false;
    this.actedThisTurn = false;
  }

  private checkEnd() {
    const playerAlive = this.units.some((u) => u.team === 'player' && u.alive);
    const enemyAlive = this.units.some((u) => u.team === 'enemy' && u.alive);
    if (!playerAlive || !enemyAlive) {
      this.finished = true;
      this.winner = playerAlive ? 'player' : 'enemy';
      this.log.push(this.winner === 'player' ? '전투 승리!' : '전투 패배...');
    }
  }

  /** AI 공격 시도: 사거리 내 대상이 있으면 공격(광역은 최다 명중 지점을 노림). */
  aiTryAttack(): StepResult {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { lines };
    const attacks = this.usableSkills(unit).filter((s) => s.category === 'attack' && (unit.skillUses[s.id] ?? 0) > 0);
    for (const skill of attacks) {
      if (skill.aoeRadius) {
        const centers = this.aoeCenters(unit, skill);
        if (centers.length > 0) {
          const radius = skill.aoeRadius;
          const countAt = (ctr: Coord) => {
            const tiles = crossTiles(ctr, radius);
            return this.units.filter((u) => u.alive && u.team !== unit.team && tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c)).length;
          };
          const best = centers.reduce((a, b) => (countAt(b) > countAt(a) ? b : a));
          return this.useSkillAoe(skill.id, best);
        }
      } else {
        const targets = this.targetsFor(unit, skill);
        if (targets.length > 0) {
          const target = targets.reduce((a, b) => (a.hp <= b.hp ? a : b));
          return this.useSkill(skill.id, target.id);
        }
      }
    }
    return { lines };
  }

  /** AI 이동 계획: 가장 가까운 적에게 최대한 다가가는 칸으로의 경로를 반환(예약만, 위치는 미갱신). */
  aiPlanMove(): Coord[] | null {
    const unit = this.current();
    if (!unit) return null;
    const foes = this.units.filter((u) => u.alive && u.team !== unit.team);
    if (foes.length === 0) return null;
    const nearest = foes.reduce((a, b) => (manhattan(unit.pos, a.pos) <= manhattan(unit.pos, b.pos) ? a : b));
    let best: Coord | null = null;
    let bestDist = manhattan(unit.pos, nearest.pos);
    for (const t of this.reachableTiles(unit)) {
      const d = manhattan(t, nearest.pos);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    if (!best) return null;
    return this.planMoveTo(best);
  }

  /** 적 턴 일괄 처리(헤드리스/시뮬레이션용). UI는 aiPlanMove/aiTryAttack를 분리해 애니메이션한다. */
  runEnemyTurn(): StepResult {
    const unit = this.current();
    if (!unit || unit.team !== 'enemy') return { lines: [] };
    const attack = this.aiTryAttack();
    if (attack.lines.length > 0) return attack;
    const path = this.aiPlanMove();
    if (path && path.length > 0) {
      this.setUnitPos(unit, path[path.length - 1]);
      this.log.push(`${unit.name}가 이동했다.`);
    }
    return this.aiTryAttack();
  }
}
