import type { BattleMap, Character, GridPos, WeaponKind } from '../types';
import { getSkill } from '../data/skills';
import { getWeapon } from '../data/weapons';
import { getUsableSkillIds, masteryTier, TIER1_BONUS } from '../data/promotions';
import { resolveSkill } from './skills';
import { chebyshev, computeReachableTiles, effectiveMove } from './grid';
import { isVisibleTo } from './vision';
import { determineTurnOrder } from './turnOrder';
import { applyTileBurnDamage, tickMapStatus, tickStatusAtTurnStart } from './status';
import { grantXp, xpForKill, type LevelUpResult } from './leveling';

export type Side = 'A' | 'B';

export interface UnitAction {
  moveTo?: GridPos;
  skillId?: string;
  targetId?: string;
  targetPos?: GridPos;
  switchWeaponTo?: string;
}

export interface KillEvent {
  killerId: string;
  victimId: string;
}

const GUARD_DEFAULT_RADIUS = 1;

export class GridBattle {
  map: BattleMap;
  teamA: Character[];
  teamB: Character[];
  round = 0;
  roundQueue: Character[] = [];
  bonusQueue: Character[] = [];
  log: string[] = [];
  killEvents: KillEvent[] = [];
  levelUpEvents: LevelUpResult[] = [];
  finished = false;
  winner: Side | null = null;
  negatedShields = new Set<string>();
  private rng: () => number;

  constructor(map: BattleMap, teamA: Character[], teamB: Character[], rng: () => number = Math.random) {
    this.map = map;
    this.teamA = teamA;
    this.teamB = teamB;
    this.rng = rng;
    for (const c of teamA) c.side = 'A';
    for (const c of teamB) c.side = 'B';
    this.beginRound();
  }

  private allUnits(): Character[] {
    return [...this.teamA, ...this.teamB];
  }

  private otherTeamOf(c: Character): Character[] {
    return c.side === 'A' ? this.teamB : this.teamA;
  }

  private ownTeamOf(c: Character): Character[] {
    return c.side === 'A' ? this.teamA : this.teamB;
  }

  private beginRound(): void {
    this.round += 1;
    this.log.push(`--- ${this.round}라운드 ---`);
    this.roundQueue = determineTurnOrder(this.allUnits(), this.rng);
  }

  currentUnit(): Character | null {
    return this.roundQueue[0] ?? this.bonusQueue[0] ?? null;
  }

  hasPendingAction(): boolean {
    return !this.finished && this.currentUnit() !== null;
  }

  private weaponKindOf(c: Character): WeaponKind {
    const inst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
    if (!inst) throw new Error(`Character ${c.id} has no equipped weapon instance`);
    return getWeapon(inst.templateId).kind;
  }

  private grantKillXp(killerId: string, victimId: string): void {
    const killer = this.allUnits().find((u) => u.id === killerId);
    const victim = this.allUnits().find((u) => u.id === victimId);
    if (!killer || !victim) return;
    this.killEvents.push({ killerId, victimId });
    const results = grantXp(killer, xpForKill(victim.level));
    this.levelUpEvents.push(...results);
  }

  /** 보호 상태의 아군이 근처에 있으면 공격을 그 아군에게 대신 돌린다 */
  private resolveGuardRedirect(target: Character): Character {
    const guardian = this.ownTeamOf(target).find(
      (ally) =>
        ally.id !== target.id &&
        ally.currentHp > 0 &&
        ally.statusEffects.some((s) => s.type === 'guarding') &&
        chebyshev(ally.position, target.position) <= (ally.statusEffects.find((s) => s.type === 'guarding')?.magnitude ?? GUARD_DEFAULT_RADIUS),
    );
    return guardian ?? target;
  }

  takeTurn(action: UnitAction): void {
    if (this.finished) return;
    const fromRoundQueue = this.roundQueue.length > 0;
    const unit = fromRoundQueue ? this.roundQueue.shift()! : this.bonusQueue.shift();
    if (!unit) return;

    if (unit.currentHp <= 0) {
      this.afterAction();
      return;
    }

    if (fromRoundQueue) {
      const tick = tickStatusAtTurnStart(unit);
      for (const expired of tick.expired) this.log.push(`${unit.name}의 ${expired} 상태가 해제되었다.`);
      const burn = applyTileBurnDamage(unit, this.map);
      if (burn > 0) this.log.push(`${unit.name}는 화염 피해로 ${burn}의 데미지를 입었다.`);
      if (unit.currentHp <= 0) {
        this.log.push(`${unit.name}가 쓰러졌다.`);
        this.checkBattleEnd();
        this.afterAction();
        return;
      }
    }

    if (action.switchWeaponTo) {
      const newInstance = unit.inventory.find((w) => w.instanceId === action.switchWeaponTo);
      if (newInstance) {
        const kind = getWeapon(newInstance.templateId).kind;
        const free = masteryTier(unit, kind) >= 3;
        unit.equippedWeaponId = newInstance.instanceId;
        this.log.push(`${unit.name}가 무기를 교체했다.`);
        if (!free) {
          this.afterAction();
          return;
        }
      }
    }

    if (action.moveTo) {
      const budget = effectiveMove(unit, this.map);
      const reachable = computeReachableTiles(this.map, unit, this.allUnits(), budget);
      if (reachable.some((p) => p.x === action.moveTo!.x && p.y === action.moveTo!.y)) {
        unit.position = action.moveTo;
        this.log.push(`${unit.name}가 이동했다.`);
      }
    }

    if (action.skillId) {
      this.resolveSkillAction(unit, action);
    }

    this.checkBattleEnd();
    this.afterAction();
  }

  private resolveSkillAction(unit: Character, action: UnitAction): void {
    const skill = getSkill(action.skillId!);
    const weaponKind = this.weaponKindOf(unit);
    const weapon = getWeapon(unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!.templateId);

    if (!getUsableSkillIds(unit, weaponKind).includes(skill.id)) {
      this.log.push(`${unit.name}는 ${skill.name}을(를) 사용할 수 없다.`);
      return;
    }
    if (skill.maxUses !== undefined && (unit.skillUses[skill.id] ?? 0) <= 0) {
      this.log.push(`${unit.name}는 ${skill.name}의 사용 횟수를 모두 소진했다.`);
      return;
    }
    if (skill.requiresTerrain && this.map.tiles[unit.position.y][unit.position.x].terrain !== skill.requiresTerrain) {
      this.log.push(`${unit.name}는 ${skill.name}을(를) 사용할 수 없다 (지형 조건 불충족).`);
      return;
    }

    let target: Character | undefined;
    let targetPos: GridPos = unit.position;

    if (skill.targetMode === 'enemy' || skill.targetMode === 'anyInSight') {
      target = this.otherTeamOf(unit).find((u) => u.id === action.targetId && u.currentHp > 0);
      if (!target) {
        this.log.push(`${unit.name}의 ${skill.name}이(가) 대상을 찾지 못했다.`);
        return;
      }
      if (skill.ignoresRange || skill.targetMode === 'anyInSight') {
        if (!isVisibleTo(unit, target, this.map)) {
          this.log.push(`${unit.name}의 시야 밖이라 ${skill.name}을(를) 사용할 수 없다.`);
          return;
        }
      } else {
        const range = skill.range === 'weapon' ? weapon.range : (skill.range ?? weapon.range);
        if (chebyshev(unit.position, target.position) > range) {
          this.log.push(`${unit.name}의 ${skill.name}이(가) 사거리 밖이다.`);
          return;
        }
      }
      target = this.resolveGuardRedirect(target);
      targetPos = target.position;
    } else if (skill.targetMode === 'tile') {
      if (action.targetPos) targetPos = action.targetPos;
      if (skill.range) {
        const range = skill.range === 'weapon' ? weapon.range : skill.range;
        if (chebyshev(unit.position, targetPos) > range) {
          this.log.push(`${unit.name}의 ${skill.name}이(가) 사거리 밖이다.`);
          return;
        }
      }
    }

    if (skill.maxUses !== undefined) {
      unit.skillUses[skill.id] = (unit.skillUses[skill.id] ?? skill.maxUses) - 1;
    }

    const tier1Acc = masteryTier(unit, weaponKind) >= 1 ? (TIER1_BONUS[weaponKind]?.accuracyBonus ?? 0) : 0;
    const hitRoll = this.rng() * 100;
    if (hitRoll >= skill.accuracy + tier1Acc) {
      this.log.push(`${unit.name}의 ${skill.name}이(가) 빗나갔다.`);
      return;
    }

    resolveSkill({
      map: this.map,
      actorTeam: this.ownTeamOf(unit),
      enemyTeam: this.otherTeamOf(unit),
      actor: unit,
      skill,
      weapon,
      targetId: target?.id,
      targetPos,
      negatedShields: this.negatedShields,
      log: this.log,
      rng: this.rng,
      onKill: (killerId, victimId) => this.grantKillXp(killerId, victimId),
      onBonusAction: (unitId) => {
        const bonusUnit = this.allUnits().find((u) => u.id === unitId);
        if (bonusUnit && bonusUnit.currentHp > 0 && !this.bonusQueue.includes(bonusUnit)) {
          bonusUnit.bonusActionPending = true;
          this.bonusQueue.push(bonusUnit);
        }
      },
    });
  }

  private afterAction(): void {
    if (this.finished) return;
    if (this.roundQueue.length === 0 && this.bonusQueue.length === 0) {
      tickMapStatus(this.map);
      this.beginRound();
    }
  }

  private checkBattleEnd(): void {
    if (this.finished) return;
    const aAlive = this.teamA.some((c) => c.currentHp > 0);
    const bAlive = this.teamB.some((c) => c.currentHp > 0);
    if (!aAlive || !bAlive) {
      this.finished = true;
      this.winner = aAlive ? 'A' : bAlive ? 'B' : null;
      this.log.push(this.winner ? `전투 종료: ${this.winner === 'A' ? 'A팀' : 'B팀'} 승리!` : '전투 종료: 무승부');
      this.roundQueue = [];
      this.bonusQueue = [];
    }
  }
}
