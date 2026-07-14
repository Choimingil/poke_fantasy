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
export type Weather = 'clear' | 'rain' | 'snow';
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

/** 방어구 착용 요구 근력. */
export function armorRequiredStrength(t: ArmorType): number {
  return ARMOR_STATS[t].reqStr;
}

function isHeavyArmor(t: ArmorType): boolean {
  return t === 'mail' || t === 'plate';
}

function isLightArmor(t: ArmorType): boolean {
  return t === 'cloth' || t === 'leather';
}

/** 방어구별 방어력 보너스 / 이동력 제한(칸, 소수) / 요구 근력. */
const ARMOR_STATS: Record<ArmorType, { def: number; movePenalty: number; reqStr: number }> = {
  cloth: { def: 1, movePenalty: 0, reqStr: 0 },
  leather: { def: 2, movePenalty: 0.5, reqStr: 8 },
  mail: { def: 3, movePenalty: 1, reqStr: 14 },
  plate: { def: 4, movePenalty: 1.5, reqStr: 22 },
};

/** 직업별 기본 근력(진행 시스템 도입 전 임시값). 방어구 착용 가능 범위를 가른다. */
function baseStrengthFor(jobType: 'melee' | 'ranged' | 'magic'): number {
  return jobType === 'melee' ? 24 : jobType === 'ranged' ? 16 : 10;
}

// ── 이동력 밸런스 상수 ──────────────────────────────────────────────
/** 유효 이동력 상한(칸). 이 값을 넘는 이동력은 페널티 완충용으로만 쓰인다. */
const MOVE_CAP = 3;
/** 전직 이동력 강화 비율: 강화 포인트 N점당 원시 이동력 +1칸. */
const MOVE_POINTS_PER_TILE = 2;
/** 직업별 기본 이동력(방어구 적용 전). 기본 방어구 착용 시 유효 이동력이 모두 2가 되도록 설정. */
function baseMoveFor(jobType: 'melee' | 'ranged' | 'magic'): number {
  return jobType === 'melee' ? 4 : jobType === 'ranged' ? 3 : 2;
}

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
  attack: number;
  magic: number;
  strength: number; // 근력(방어구 착용 요구치 판정)
  defense: number; // 방어력 보정치(기본 0, 방어력은 방어구로만; 디버프로 감소 가능)
  speed: number;
  move: number; // 기본 이동거리(칸). 전사 2, 그 외 1.
  moveBonusPoints: number; // 전직 강화로 투자한 이동력 포인트(비율 변환). 기본 0.
  vision: number; // 기본 시야(칸). 기본 5.
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

/** 캐릭터의 마력 수치(마법 직업은 공격 수치를 마력으로, 그 외는 절반). */
function unitMagic(ch: Character): number {
  const job = getJob(ch.jobId);
  return job.type === 'magic' ? ch.baseStats.attack : Math.round(ch.baseStats.attack * 0.5);
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
    this.weather = weather ?? (['clear', 'rain', 'snow'] as const)[Math.floor(rng() * 3)];
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
    return {
      id: `${team}_${ch.jobId}`,
      name: ch.name,
      jobId: ch.jobId,
      faction: ch.faction,
      team,
      gender: def.gender,
      pos,
      hp: ch.baseStats.hp,
      maxHp: ch.baseStats.hp,
      attack: ch.baseStats.attack,
      magic: unitMagic(ch),
      strength: baseStrengthFor(job.type),
      defense: 0, // 방어력은 방어구로만(능력치로 올리지 않음)
      speed: ch.baseStats.speed,
      // 전사(근거리)는 이동력이 높다(2). 그 외 직업은 1.
      move: baseMoveFor(job.type),
      moveBonusPoints: 0,
      vision: 5,
      armorType: job.type === 'melee' ? 'plate' : job.type === 'ranged' ? 'leather' : 'cloth',
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
    this.order = this.units
      .filter((u) => u.alive)
      .sort((a, b) => b.speed - a.speed || (a.team === 'player' ? -1 : 1))
      .map((u) => u.id);
    this.turnIndex = 0;
    this.movedThisTurn = false;
    this.actedThisTurn = false;
  }

  /** 전직 강화 포인트를 비율로 변환해 더한 원시 이동력(상한 적용 전). */
  rawMove(unit: TrpgUnit): number {
    return unit.move + Math.floor(unit.moveBonusPoints / MOVE_POINTS_PER_TILE);
  }

  /** 이번 턴 이동 페널티 합(방어구 제한 + 물 + 비). 소수 허용. */
  movePenalty(unit: TrpgUnit): number {
    let p = ARMOR_STATS[unit.armorType].movePenalty; // 방어구별 제한(0/0.5/1/1.5)
    if (this.map[unit.pos.r][unit.pos.c] === 'water') p += 1; // 물 위
    if (this.weather === 'rain' && isHeavyArmor(unit.armorType)) p += 1; // 비 + 중갑/판금
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
   * 실제 이동 가능 칸수 = floor(유효 이동력).
   * 1 미만(0 이하)이면 그 턴에는 이동만 불가하고 다른 행동은 가능하다.
   */
  moveTiles(unit: TrpgUnit): number {
    return Math.floor(this.effectiveMove(unit));
  }

  /** 실제 방어력 = 방어구 보너스(천+1/가죽+2/중갑+3/판금+4) + 보정치(디버프), 최소 0. */
  effectiveDefense(unit: TrpgUnit): number {
    return Math.max(0, ARMOR_STATS[unit.armorType].def + unit.defense);
  }

  /** 날씨/시간대를 반영한 실제 시야(최소 0). 밤에는 2칸으로 제한. */
  effectiveVision(unit: TrpgUnit): number {
    let v = unit.vision;
    if (this.weather === 'rain' || this.weather === 'snow') v -= 1;
    if (this.time === 'night') v = Math.min(v, 2);
    return Math.max(0, v);
  }

  /** 플레이어 팀이 볼 수 있는 칸 집합("r,c"). 각 아군 유닛의 시야 마름모 합집합. */
  visibleSet(): Set<string> {
    const set = new Set<string>();
    for (const u of this.units) {
      if (!u.alive || u.team !== 'player') continue;
      for (const t of diamondTiles(u.pos, this.effectiveVision(u))) set.add(`${t.r},${t.c}`);
    }
    return set;
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
   * - 바위는 통과 불가, 언덕은 진입비용 2.
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
        if (occ && occ.team !== unit.team) continue; // 적 = 장애물, 통과 불가
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

  /**
   * 등반 칸: 이동력이 모자라도 마지막 한 칸을 "무리해서" 올라갈 수 있는 언덕/산 칸.
   * 이동력 예산 안의 어떤 칸에서 이웃으로 한 발 더 딛되, 그 비용이 예산을 넘는 경우.
   * 이 칸으로 이동하면 그 턴에는 더 이상 행동할 수 없다.
   */
  climbTiles(unit: TrpgUnit): Coord[] {
    const { dist, budget } = this.computeDistances(unit);
    if (budget < 1) return []; // 이동력이 0 이하면 등반도 불가
    const seen = new Set<string>();
    const res: Coord[] = [];
    for (const [k, d] of dist) {
      if (d > budget) continue;
      const [r, c] = k.split(',').map(Number);
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
        if (!isEnterable(terrain)) continue;
        if (this.unitAt(nr, nc)) continue;
        const nk = `${nr},${nc}`;
        if ((dist.get(nk) ?? Infinity) <= budget) continue; // 이미 정상 이동 가능
        if (d + moveCost(terrain) <= budget) continue; // 넘어서는 비용이 아님
        if (!seen.has(nk)) {
          seen.add(nk);
          res.push({ r: nr, c: nc });
        }
      }
    }
    return res;
  }

  /** 원거리 시야가 나무/바위에 막히는지. */
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
    const range = this.rangeOf(unit);
    const ranged = this.weaponOf(unit).type !== 'melee';
    return this.units.filter((t) => {
      if (!t.alive || t.team === unit.team) return false;
      if (manhattan(unit.pos, t.pos) > range) return false;
      if (ranged && this.losBlocked(unit.pos, t.pos)) return false; // 나무/절벽이 시야 차단
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

    const isBow = weapon.kind === 'bow';
    // 나무 위의 대상은 활 공격에 대해 엄폐(0.5배).
    const cover = isBow && this.map[target.pos.r][target.pos.c] === 'tree' ? 0.5 : 1;
    // 산 위에서 쏘는 활은 공격력 증가(1.3배).
    const highGround = isBow && this.map[attacker.pos.r][attacker.pos.c] === 'mountain' ? 1.3 : 1;

    let dmg = raw * matchup * stab * variance * cover * highGround;
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
        target.defense -= 1; // 방어력 보정치를 낮춤(실효 방어력 -1, 최소 0)
        lines.push(`${unit.name}의 ${skill.name}! ${target.name}의 방어력이 하락했다.`);
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

  /** 방어구 교체(그 턴 공격 기술 사용 불가). 요구 근력을 만족해야 한다. */
  swapArmor(armorType: ArmorType): { ok: boolean; lines: string[] } {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit) return { ok: false, lines };
    const reqStr = ARMOR_STATS[armorType].reqStr;
    if (unit.strength < reqStr) {
      lines.push(`${unit.name}: ${armorName(armorType)} 착용에 필요한 근력(${reqStr})이 부족하다. (근력 ${unit.strength})`);
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

    // 정상 이동(예산 내)
    if (dGoal != null && dGoal <= budget) {
      this.moveFrom = { ...unit.pos };
      this.movedThisTurn = true;
      this.movedExhausted = false;
      return this.buildPath(prev, unit.pos, coord);
    }

    // 등반 이동(예산 초과 마지막 한 칸): 이동 후 그 턴 행동 불가
    const cost = moveCost(this.map[coord.r][coord.c]);
    let bestT: Coord | null = null;
    let bestD = Infinity;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const tr = coord.r + dr;
      const tc = coord.c + dc;
      if (!inBounds(tr, tc)) continue;
      const dT = dist.get(`${tr},${tc}`);
      if (dT == null || dT > budget) continue;
      if (dT + cost <= budget) continue; // 정상 이동이면 위에서 처리됨
      if (dT < bestD) {
        bestD = dT;
        bestT = { r: tr, c: tc };
      }
    }
    if (!bestT) return null;
    const path = this.buildPath(prev, unit.pos, bestT);
    path.push({ ...coord });
    this.moveFrom = { ...unit.pos };
    this.movedThisTurn = true;
    this.movedExhausted = true;
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
