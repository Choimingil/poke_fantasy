import { getJob } from '../data/jobs';
import { getSkill, skillUsableWithWeapon } from '../data/skills';
import { getWeapon, weaponRange } from '../data/weapons';
import { rollWeaponProc } from '../engine/weaponEffects';
import { typeAdvantageMultiplier } from '../engine/typeChart';
import type { Character, Faction, Skill } from '../types';
import {
  DEFAULT_MAP,
  isAdjacentToCliff,
  isEnterable,
  inBounds,
  lineBetween,
  manhattan,
  moveCost,
  type Coord,
  type TerrainMap,
} from './map';

export type Team = 'player' | 'enemy';

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
  defense: number;
  speed: number;
  move: number; // 이동거리(칸). 현재 전부 1.
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
  private rng: () => number;

  constructor(playerDefs: UnitDef[], enemyDefs: UnitDef[], map: TerrainMap = DEFAULT_MAP, rng: () => number = Math.random) {
    this.map = map;
    this.rng = rng;
    const playerCols = [0, 2, 4];
    const enemyCols = [0, 2, 4];
    this.units = [
      ...playerDefs.map((d, i) => this.makeUnit(d, 'player', { r: 3, c: playerCols[i] ?? i })),
      ...enemyDefs.map((d, i) => this.makeUnit(d, 'enemy', { r: 1, c: enemyCols[i] ?? i })),
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
      defense: ch.baseStats.defense,
      speed: ch.baseStats.speed,
      move: 1,
      weaponId,
      skills: [...ch.skills],
      skillUses,
      alive: true,
      guardFactor: 1,
      attackMult: 1,
    };
  }

  private buildOrder() {
    this.order = this.units
      .filter((u) => u.alive)
      .sort((a, b) => b.speed - a.speed || (a.team === 'player' ? -1 : 1))
      .map((u) => u.id);
    this.turnIndex = 0;
    this.movedThisTurn = false;
    this.actedThisTurn = false;
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
    return weaponRange(this.weaponOf(unit)) + (isAdjacentToCliff(this.map, unit.pos) ? 1 : 0);
  }

  /** 이동 가능한 칸(이동력 예산 내, 절벽·물·점유 칸 제외). */
  reachableTiles(unit: TrpgUnit): Coord[] {
    const budget = unit.move;
    const result: Coord[] = [];
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const r = unit.pos.r + dr;
      const c = unit.pos.c + dc;
      if (!inBounds(r, c)) continue;
      const terrain = this.map[r][c];
      if (!isEnterable(terrain)) continue;
      if (moveCost(terrain) > budget) continue; // 물(2)은 이동 1로 진입 불가
      if (this.unitAt(r, c)) continue;
      result.push({ r, c });
    }
    return result;
  }

  /** 원거리 시야가 나무/절벽에 막히는지. */
  private losBlocked(from: Coord, to: Coord): boolean {
    for (const t of lineBetween(from, to)) {
      const terrain = this.map[t.r][t.c];
      if (terrain === 'tree' || terrain === 'cliff') return true;
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
    const defense = target.defense * (proc.pierce ? 0.5 : 1);
    const raw = (atkStat * power) / (defense + 50);

    // 무기 상성(들고 있는 무기끼리): 근거리>원거리>마법>근거리
    const matchup = typeAdvantageMultiplier(weapon.type, targetWeapon.type);
    const stab = getJob(attacker.jobId).type === skill.type ? 1.2 : 1;

    // 숙련도(강화)로 편차 감소. 현재 강화 0 -> ±20%.
    const varianceWidth = 0.2;
    const variance = 1 - varianceWidth + this.rng() * varianceWidth * 2;

    // 나무 위의 대상은 원거리 공격에 대해 엄폐(0.5배).
    const ranged = weapon.type !== 'melee';
    const cover = ranged && this.map[target.pos.r][target.pos.c] === 'tree' ? 0.5 : 1;

    let dmg = (raw * matchup * stab * variance * cover) / 1;
    dmg = dmg * target.guardFactor; // 방어 상태면 0 또는 0.5
    if (proc.extraHit) dmg *= 1.3; // 활 연사 부가효과

    return { damage: Math.max(target.guardFactor === 0 ? 0 : 1, Math.round(dmg)), crit: false };
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

    if (skill.category === 'heal') {
      const heal = Math.max(1, Math.round(unit.maxHp * (skill.healPercent ?? 0)));
      const before = unit.hp;
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      lines.push(`${unit.name}의 ${skill.name}! 체력을 ${unit.hp - before} 회복했다.`);
    } else if (skill.category === 'buff') {
      unit.attackMult = Math.min(2, unit.attackMult * 1.2);
      lines.push(`${unit.name}의 ${skill.name}! 공격력이 상승했다.`);
    } else if (skill.category === 'defense') {
      unit.guardFactor = skill.fullGuard ? 0 : 0.5;
      lines.push(`${unit.name}가 ${skill.name} 태세를 취했다.`);
    } else if (skill.category === 'debuff') {
      const target = targetId ? this.unitById(targetId) : undefined;
      if (target) {
        target.defense = Math.max(1, Math.round(target.defense * 0.8));
        lines.push(`${unit.name}의 ${skill.name}! ${target.name}의 방어력이 하락했다.`);
      }
    } else {
      // attack
      const target = targetId ? this.unitById(targetId) : undefined;
      if (!target) {
        lines.push(`${unit.name}: 대상이 없다.`);
        return { lines };
      }
      const hitCount = skill.hits ? this.randInt(skill.hits.min, skill.hits.max) : 1;
      let total = 0;
      for (let i = 0; i < hitCount; i += 1) total += this.computeHit(unit, target, skill).damage;
      if (target.guardFactor === 0) {
        total = 0;
        lines.push(`${unit.name}의 ${skill.name}! 하지만 ${target.name}가 완전히 막아냈다!`);
      } else {
        const hitLabel = hitCount > 1 ? ` (${hitCount}회 명중)` : '';
        lines.push(`${unit.name}의 ${skill.name}! ${target.name}에게 ${total}의 피해${hitLabel}.`);
      }
      target.guardFactor = 1;
      target.hp = Math.max(0, target.hp - total);
      if (target.hp <= 0) {
        target.alive = false;
        lines.push(`${target.name}가 쓰러져 묘지로 이동했다.`);
      }
    }

    this.actedThisTurn = true;
    for (const l of lines) this.log.push(l);
    this.checkEnd();
    return { lines };
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

  moveTo(coord: Coord): boolean {
    const unit = this.current();
    if (!unit || this.movedThisTurn) return false;
    if (!this.reachableTiles(unit).some((t) => t.r === coord.r && t.c === coord.c)) return false;
    unit.pos = { ...coord };
    this.movedThisTurn = true;
    return true;
  }

  /** 현재 유닛의 턴을 종료하고 다음 유닛으로 넘어간다. */
  endTurn() {
    if (this.finished) return;
    // 다음 살아있는 유닛으로
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

  /** 적 AI: 사거리 내 대상이 있으면 공격, 없으면 가장 가까운 적에게 한 칸 이동 후 재시도. */
  runEnemyTurn(): StepResult {
    const unit = this.current();
    const lines: string[] = [];
    if (!unit || unit.team !== 'enemy') return { lines };

    const tryAttack = (): boolean => {
      const attacks = this.usableSkills(unit).filter((s) => s.category === 'attack' && (unit.skillUses[s.id] ?? 0) > 0);
      for (const skill of attacks) {
        const targets = this.targetsFor(unit, skill);
        if (targets.length > 0) {
          const target = targets.reduce((a, b) => (a.hp <= b.hp ? a : b));
          const res = this.useSkill(skill.id, target.id);
          lines.push(...res.lines);
          return true;
        }
      }
      return false;
    };

    if (tryAttack()) return { lines };

    // 이동: 가장 가까운 플레이어에게 다가가는 칸 선택
    const foes = this.units.filter((u) => u.alive && u.team === 'player');
    if (foes.length > 0) {
      const nearest = foes.reduce((a, b) => (manhattan(unit.pos, a.pos) <= manhattan(unit.pos, b.pos) ? a : b));
      const tiles = this.reachableTiles(unit);
      let best: Coord | null = null;
      let bestDist = manhattan(unit.pos, nearest.pos);
      for (const t of tiles) {
        const d = manhattan(t, nearest.pos);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      if (best) {
        this.moveTo(best);
        const moveLine = `${unit.name}가 이동했다.`;
        this.log.push(moveLine);
        lines.push(moveLine);
      }
      tryAttack();
    }
    return { lines };
  }
}
