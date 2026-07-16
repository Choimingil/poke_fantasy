import { getJob } from '../data/jobs';
import { getSkill, skillPowerPercent, skillUsableWithWeapon } from '../data/skills';
import { getWeapon, weaponRange } from '../data/weapons';
import type { Character, Faction, Skill } from '../types';
import {
  blocksSight,
  crossTilesBlocked,
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
const ARMOR_STATS: Record<ArmorType, { defMult: number; strengthMult: number; reqLevel: number }> = {
  // 방어력 = 레벨(기준공격력) × defMult (천0.7/가죽0.9/중갑1.1/판금1.3).
  cloth: { defMult: 0.7, strengthMult: 0, reqLevel: 100 },
  leather: { defMult: 0.9, strengthMult: 0.5, reqLevel: 100 },
  mail: { defMult: 1.1, strengthMult: 1, reqLevel: 100 },
  plate: { defMult: 1.3, strengthMult: 1.5, reqLevel: 100 },
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
/** 테스트 캐릭터 레벨. 능력치 총합 = 5×(스탯수) + 3×(레벨−1). */
const CHAR_LEVEL = 50;
/** 만렙(100) 기준 한 스탯 최댓값 = 100×3+5 = 305. 정신력/회피율 분모. */
const STAT_MAX_AT_100 = 100 * 3 + 5;

/**
 * 테스트 캐릭터 아키타입 빌드(레벨 50, 분배 포인트 147 = 3×49, 기본 스탯 5).
 * 스탯 = 체력(hp) / 근력(attack, 물리) / 지력(magic, 마법) / 지구력(endurance) / 스피드(speed).
 *  - 전사: 근력 70 · 지구력 55(이동 1) · 체력 37 (판금)
 *  - 궁수: 근력 55 · 지구력 45(이동 1) · 스피드 30 · 체력 37 (중갑)
 *  - 법사: 지력 85 · 지구력 27(이동 1) · 스피드 18 · 체력 37 (가죽)
 */
interface StatBuild {
  hp: number;
  attack: number;
  magic: number;
  endurance: number;
  speed: number;
}
const TEST_BUILD: Record<'melee' | 'ranged' | 'magic', StatBuild> = {
  melee: { hp: 37, attack: 70, magic: 5, endurance: 55, speed: 5 },
  ranged: { hp: 37, attack: 55, magic: 5, endurance: 45, speed: 30 },
  magic: { hp: 37, attack: 5, magic: 85, endurance: 27, speed: 18 },
};

// ── 정신력 상수 ────────────────────────────────────────────────────
/** 정신력(디버프/부가효과 무시 확률) 상한. */
const WILLPOWER_CAP = 0.7;

// ── 데미지 공식 상수 ───────────────────────────────────────────────
/** 주스탯 기여 = 주스탯 / 이 값. */
const STAT_ATK_DIVISOR = 6;
/** 숙련도 하한(현재 강화 없음). 데미지 랜덤 계수 = [PROFICIENCY_BASE, 1]. */
const PROFICIENCY_BASE = 0.8;

// ── 무기 부가효과 상수 ─────────────────────────────────────────────
/** 적중 시 무기 부가효과 발동 확률. */
const WEAPON_PROC_CHANCE = 0.3;
/** 출혈/기절 지속 턴. */
const STATUS_TURNS = 2;
type WeaponEffect = 'bleed' | 'stun' | 'pierce' | 'focus' | 'crit' | 'none';
/**
 * 무기 종류별 적중 부가효과:
 * 검/단검=출혈, 둔기=기절, 창=관통(방어 무시), 활=집중(회피 무시), 석궁=급소(1.5배),
 * 마법서/투척=종류별(임시 출혈), 지팡이=광역(적중 효과 없음)·방패=방어(별도).
 */
function weaponEffectOf(kind: string): WeaponEffect {
  switch (kind) {
    case 'sword':
    case 'dagger':
      return 'bleed';
    case 'blunt':
      return 'stun';
    case 'spear':
      return 'pierce';
    case 'bow':
      return 'focus';
    case 'crossbow':
      return 'crit';
    case 'thrown':
    case 'tome':
      return 'bleed';
    default:
      return 'none';
  }
}
/** UI 표기용 부가효과 이름. */
const WEAPON_EFFECT_LABEL: Record<WeaponEffect, string> = {
  bleed: '출혈',
  stun: '기절',
  pierce: '관통',
  focus: '집중',
  crit: '급소',
  none: '없음',
};

export interface TrpgUnit {
  id: string;
  name: string;
  jobId: string;
  faction: Faction;
  team: Team;
  gender: 'male' | 'female';
  level: number;
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
  bleed: number; // 출혈 남은 턴(라운드 시작 시 maxHp/8 감소).
  stun: number; // 기절 남은 턴(그 턴 행동 불가).
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
      level: CHAR_LEVEL,
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
      bleed: 0,
      stun: 0,
    };
  }

  /** 현재 무기의 적중 부가효과(UI 표기용, 없으면 null). */
  weaponEffectLabel(unit: TrpgUnit): string | null {
    const e = weaponEffectOf(this.weaponOf(unit).kind);
    if (e === 'none') return this.weaponOf(unit).kind === 'staff' ? '광역' : null;
    return WEAPON_EFFECT_LABEL[e];
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
    // 출혈: 라운드 시작 시 출혈 유닛 체력 1/8 감소, 지속 턴 1 감소.
    for (const u of this.units) {
      if (!u.alive || u.bleed <= 0) continue;
      const dmg = Math.max(1, Math.floor(u.maxHp / 8));
      u.hp = Math.max(0, u.hp - dmg);
      u.bleed -= 1;
      this.log.push(`${u.name}가 출혈로 체력 ${dmg} 감소.`);
      if (u.hp <= 0) {
        u.alive = false;
        this.log.push(`${u.name}가 쓰러져 묘지로 이동했다.`);
      }
    }
    this.checkEnd();
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

  /** 정신력: 상대 디버프/부가효과를 무시할 확률 = min(0.7, (지력/(100×3+5)) × 0.7). */
  willpower(unit: TrpgUnit): number {
    return Math.min(WILLPOWER_CAP, (unit.magic / STAT_MAX_AT_100) * WILLPOWER_CAP);
  }

  /** 회피율: (스피드/(100×3+5))/2 + (자신레벨−공격자레벨)/100. [0,1] 클램프. */
  evasion(defender: TrpgUnit, attacker: TrpgUnit): number {
    const bySpeed = defender.speed / STAT_MAX_AT_100 / 2;
    const byLevel = (defender.level - attacker.level) / 100;
    return Math.max(0, Math.min(1, bySpeed + byLevel));
  }

  /** 무기 공격력(= 캐릭터 레벨). 물리·마법 공통. (단검 3/4는 단검 도입 시 반영) */
  weaponAttackValue(unit: TrpgUnit): number {
    return unit.level;
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

  /** 실제 방어력 = round(레벨 × 방어구 배수) + 보정치(디버프), 최소 0. */
  effectiveDefense(unit: TrpgUnit): number {
    return Math.max(0, Math.round(unit.level * ARMOR_STATS[unit.armorType].defMult) + unit.defense);
  }

  /** 날씨/시간대를 반영한 실제 시야(최소 0). 밤에는 3칸으로 제한. */
  effectiveVision(unit: TrpgUnit): number {
    let v = unit.vision;
    if (this.map[unit.pos.r][unit.pos.c] === 'hill') v += 1; // 언덕 위: 시야 +1
    if (this.weather === 'rain' || this.weather === 'snow') v -= 1;
    if (this.time === 'night') v = Math.min(v, 3);
    return Math.max(0, v);
  }

  /** 지정 칸에 상하좌우 인접(맨해튼 1)한 살아있는 team 유닛이 있는지. 숲 안 캐릭터 감지용. */
  private teamOrthAdjacent(r: number, c: number, team: Team): boolean {
    return this.units.some(
      (u) => u.alive && u.team === team && Math.abs(u.pos.r - r) + Math.abs(u.pos.c - c) <= 1,
    );
  }

  /**
   * 대상이 숲에 은폐되어 attackerTeam이 볼 수 없는지(공격/타게팅 불가).
   * 숲 안 유닛은 상대 팀이 **상하좌우 인접**해야만 노출된다(양방향 대칭).
   */
  forestConcealed(target: TrpgUnit, attackerTeam: Team): boolean {
    return (
      this.map[target.pos.r][target.pos.c] === 'forest' &&
      !this.teamOrthAdjacent(target.pos.r, target.pos.c, attackerTeam)
    );
  }

  /** team이 볼 수 있는 칸 집합("r,c"). 각 팀 유닛의 시야 마름모 합집합. (양 팀 동일 규칙) */
  private visibleSetForTeam(team: Team): Set<string> {
    const set = new Set<string>();
    for (const u of this.units) {
      if (!u.alive || u.team !== team) continue;
      for (const t of diamondTiles(u.pos, this.effectiveVision(u))) set.add(`${t.r},${t.c}`);
    }
    return set;
  }

  /** 플레이어 팀 시야 칸 집합(UI 안개용). */
  visibleSet(): Set<string> {
    return this.visibleSetForTeam('player');
  }

  /**
   * observerTeam 관점에서 유닛 u가 보이는지(양 팀 대칭 규칙).
   * - 같은 팀은 항상 보임.
   * - 숲 안의 상대는 **상하좌우 인접**한 observerTeam 유닛이 있어야만 보임.
   * - 그 외는 해당 칸이 observerTeam 시야 안이면 보임.
   */
  unitVisibleTo(u: TrpgUnit, observerTeam: Team): boolean {
    if (u.team === observerTeam) return true;
    if (this.map[u.pos.r][u.pos.c] === 'forest') return this.teamOrthAdjacent(u.pos.r, u.pos.c, observerTeam);
    return this.visibleSetForTeam(observerTeam).has(`${u.pos.r},${u.pos.c}`);
  }

  /** 상대 유닛이 플레이어에게 보이는지(UI용). */
  unitVisibleToPlayer(u: TrpgUnit): boolean {
    return this.unitVisibleTo(u, 'player');
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
    const range = skill.range ?? this.rangeOf(unit);
    const ranged = this.weaponOf(unit).type !== 'melee';
    return this.units.filter((t) => {
      if (!t.alive || t.team === unit.team) return false;
      if (manhattan(unit.pos, t.pos) > range) return false;
      if (ranged && this.losBlocked(unit.pos, t.pos)) return false; // 바위가 활 사선 차단
      if (this.forestConcealed(t, unit.team)) return false; // 숲 은폐(인접해야 노출)
      return true;
    });
  }

  private randInt(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  private computeHit(
    attacker: TrpgUnit,
    target: TrpgUnit,
    skill: Skill,
    opts?: { pierce?: boolean; crit?: boolean },
  ): { damage: number; crit: boolean } {
    // 최종공격력 = (주스탯/6 + 무기공격력) × (숙련도~100% 랜덤) × 기술위력(%).
    const mainStat = skill.type === 'magic' ? attacker.magic : attacker.attack;
    const weaponAtk = this.weaponAttackValue(attacker);
    const prof = PROFICIENCY_BASE + this.rng() * (1 - PROFICIENCY_BASE);
    const powerPct = skillPowerPercent(skill.power) / 100;
    const atkPower = (mainStat / STAT_ATK_DIVISOR + weaponAtk) * prof * powerPct * attacker.attackMult;

    // 최종데미지 = 최종공격력 − 방어력(관통 시 0). 방어 태세면 guardFactor(0/0.5), 급소면 1.5배.
    const defense = opts?.pierce ? 0 : this.effectiveDefense(target);
    let dmg = (atkPower - defense) * target.guardFactor;
    if (opts?.crit) dmg *= 1.5;
    dmg = Math.max(target.guardFactor === 0 ? 0 : 1, Math.round(dmg));
    return { damage: dmg, crit: !!opts?.crit };
  }

  /** 한 대상에게 공격 1회(다단히트 포함)를 적용하고 로그를 남긴다. */
  private applyAttack(attacker: TrpgUnit, target: TrpgUnit, skill: Skill, lines: string[]) {
    // 무기 부가효과(적중 시 30% 확률로 1가지 효과).
    const proc = this.rng() < WEAPON_PROC_CHANCE ? weaponEffectOf(this.weaponOf(attacker).kind) : 'none';

    // 회피 판정(집중=회피 무시). 실패하면 피해 없음.
    if (proc !== 'focus' && this.rng() < this.evasion(target, attacker)) {
      lines.push(`${attacker.name}의 ${skill.name}! 하지만 ${target.name}가 회피했다!`);
      target.guardFactor = 1;
      return;
    }
    const opts = { pierce: proc === 'pierce', crit: proc === 'crit' };
    const hitCount = skill.hits ? this.randInt(skill.hits.min, skill.hits.max) : 1;
    let total = 0;
    for (let i = 0; i < hitCount; i += 1) total += this.computeHit(attacker, target, skill, opts).damage;
    if (target.guardFactor === 0) {
      total = 0;
      lines.push(`${attacker.name}의 ${skill.name}! 하지만 ${target.name}가 완전히 막아냈다!`);
    } else {
      const tags = `${proc === 'crit' ? ' 급소!' : ''}${proc === 'pierce' ? ' 관통!' : ''}${proc === 'focus' ? ' 집중!' : ''}`;
      const hitLabel = hitCount > 1 ? ` (${hitCount}회 명중)` : '';
      lines.push(`${attacker.name}의 ${skill.name}!${tags} ${target.name}에게 ${total}의 피해${hitLabel}.`);
    }
    target.guardFactor = 1;
    target.hp = Math.max(0, target.hp - total);
    if (target.hp <= 0) {
      target.alive = false;
      lines.push(`${target.name}가 쓰러져 묘지로 이동했다.`);
      return;
    }
    // 상태이상 부여(생존 시).
    if (proc === 'bleed') {
      target.bleed = STATUS_TURNS;
      lines.push(`${target.name}가 출혈 상태가 되었다!`);
    } else if (proc === 'stun') {
      target.stun = STATUS_TURNS;
      lines.push(`${target.name}가 기절했다!`);
    }
  }

  /** 광역 십자 범위(중심 기준). 각 방향으로 **바위를 만나면 그 뒤(바위 포함)는 제외**. */
  aoeTiles(center: Coord, radius: number): Coord[] {
    return crossTilesBlocked(center, radius, (r, c) => this.map[r][c] === 'rock');
  }

  /** 광역 기술의 유효 중심 칸: 사거리·시야 내이면서 십자 범위에 적이 1명 이상 걸리는 칸. */
  aoeCenters(unit: TrpgUnit, skill: Skill): Coord[] {
    if (this.weaponOf(unit).kind !== 'staff') return []; // 광역은 지팡이만
    if (this.forestBlocksAttack(unit)) return []; // 숲 안: 원거리·마법 공격 불가
    const range = skill.range ?? this.rangeOf(unit);
    const ranged = this.weaponOf(unit).type !== 'melee';
    const radius = skill.aoeRadius ?? 1;
    const centers: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const center = { r, c };
        if (manhattan(unit.pos, center) > range) continue;
        if (ranged && this.losBlocked(unit.pos, center)) continue;
        const tiles = this.aoeTiles(center, radius);
        const hitsEnemy = this.units.some(
          (u) =>
            u.alive &&
            u.team !== unit.team &&
            !this.forestConcealed(u, unit.team) &&
            tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c),
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
    if (this.weaponOf(unit).kind !== 'staff') {
      lines.push(`${unit.name}: 광역 마법은 지팡이로만 사용할 수 있다.`);
      return { lines };
    }
    if (this.forestBlocksAttack(unit)) {
      lines.push(`${unit.name}: 숲 안에서는 원거리·마법 무기로 공격할 수 없다.`);
      return { lines };
    }
    if ((unit.skillUses[skillId] ?? 0) <= 0) {
      lines.push(`${unit.name}: ${skill.name}의 사용 횟수가 없다.`);
      return { lines };
    }
    unit.skillUses[skillId] -= 1;
    const tiles = this.aoeTiles(center, skill.aoeRadius ?? 1);
    // 광역은 아군 오사(friendly fire) 포함: 범위 내 모든 유닛 피격(시전자 제외, 숨은 적 제외).
    const victims = this.units.filter(
      (u) =>
        u.alive &&
        u.id !== unit.id &&
        !this.forestConcealed(u, unit.team) &&
        tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c),
    );
    if (victims.length === 0) {
      lines.push(`${unit.name}의 ${skill.name}! 범위 안에 아무도 없었다.`);
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
    // 요구 근력/마력 = 레벨×2. 양손 무기는 절반(양손 파지). 물리=근력, 마법=마력(지력).
    const isMagic = weapon.type === 'magic';
    const reqValue = weapon.handedness === 'twoHanded' ? Math.ceil(unit.level * 2 / 2) : unit.level * 2;
    const have = isMagic ? unit.magic : unit.attack;
    if (have < reqValue) {
      lines.push(`${unit.name}: ${weapon.name}의 요구 ${isMagic ? '마력' : '근력'}(${reqValue})을 만족하지 못한다. (보유 ${have})`);
      return { ok: false, lines };
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
    // 다음 행동 가능한 유닛으로(죽은 유닛·기절 유닛은 건너뛴다).
    this.moveFrom = null;
    this.movedExhausted = false;
    this.turnIndex += 1;
    let guard = 0;
    while (guard < this.order.length * 3 + 3) {
      guard += 1;
      if (this.turnIndex >= this.order.length) {
        this.round += 1;
        this.buildOrder(); // 라운드 효과 적용 + turnIndex 0으로
        if (this.finished) return;
        continue;
      }
      const cur = this.current();
      if (!cur) {
        this.turnIndex += 1;
        continue;
      }
      if (cur.stun > 0) {
        cur.stun -= 1;
        this.log.push(`${cur.name}가 기절해 이번 턴 움직이지 못했다.`);
        this.turnIndex += 1;
        continue;
      }
      break; // 행동 가능한 유닛
    }
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
          // 아군 오사가 있으므로 순이득(적 명중 − 아군 명중)이 가장 큰 중심을 고른다.
          const scoreAt = (ctr: Coord) => {
            const tiles = this.aoeTiles(ctr, radius);
            let score = 0;
            for (const u of this.units) {
              if (!u.alive || u.id === unit.id) continue;
              if (!tiles.some((t) => t.r === u.pos.r && t.c === u.pos.c)) continue;
              if (u.team === unit.team) score -= 1; // 아군 오사 회피
              else if (!this.forestConcealed(u, unit.team)) score += 1;
            }
            return score;
          };
          const best = centers.reduce((a, b) => (scoreAt(b) > scoreAt(a) ? b : a));
          if (scoreAt(best) > 0) return this.useSkillAoe(skill.id, best);
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
    const allFoes = this.units.filter((u) => u.alive && u.team !== unit.team);
    if (allFoes.length === 0) return null;
    // 플레이어와 동일한 시야 규칙 적용: 보이는 적을 우선 추격, 보이는 적이 없으면 전체 기준으로 전진.
    const visibleFoes = allFoes.filter((f) => this.unitVisibleTo(f, unit.team));
    const foes = visibleFoes.length > 0 ? visibleFoes : allFoes;
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
