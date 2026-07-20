import type { BattleMap, Character, CombatFloatEvent, GridPos, StatusEffectType, WeaponKind } from '../types';
import { getSkill } from '../data/skills';
import { effectiveWeaponPower, getWeapon, isRangedOrMagicKind } from '../data/weapons';
import { FALLBACK_SKILL_ID, FREE_SWAP_TIER, getUsableSkillIds, hasWeaponPassive, masteryTier, gainProficiencyExp, PROFICIENCY_MAX_GAIN_PER_SKILL } from '../data/promotions';
import { resolveSkill } from './skills';
import { manhattan, computeReachableTiles, effectiveMove, lineCrossesRock } from './grid';
import { isVisibleTo, isVisibleToTeam } from './vision';
import { determineTurnOrder } from './turnOrder';
import { applyDamageOverTime, applyTileBurnDamage, isImmobilized, consumeShock, tickMapStatus, tickStatusAtTurnStart } from './status';
import { proficiencyExpTraitMult } from './traitEffects';
import { weaponEnhanceExpMult } from '../data/enhance';
import { grantXp, xpForKill, type LevelUpResult } from './leveling';
import { weatherTurnStartDamage, type Weather } from './weather';
import type { TimeOfDay } from './daytime';

export type Side = 'A' | 'B';

export interface UnitAction {
  moveTo?: GridPos;
  skillId?: string;
  targetId?: string;
  targetPos?: GridPos;
  switchWeaponTo?: string;
  switchArmorTo?: string;
  /** 도약사격·기습 후속 이동 목적지(플레이어 지정). 없으면 AI가 자동 결정. */
  followupMoveTo?: GridPos;
}

export interface KillEvent {
  killerId: string;
  victimId: string;
}

const GUARD_DEFAULT_RADIUS = 1;

/** 지속 중에는 재사용할 수 없는 자가 버프(스킬 id → 상태 타입). */
const NO_RECAST_WHILE_ACTIVE: Record<string, StatusEffectType> = {
  protect: 'guarding',
  river_surge: 'riverSurge',
  climb: 'climbing',
  far_sight: 'farSight',
  forest_vision: 'forestVision',
};

export class GridBattle {
  map: BattleMap;
  teamA: Character[];
  teamB: Character[];
  weather: Weather;
  time: TimeOfDay;
  round = 0;
  roundQueue: Character[] = [];
  bonusQueue: Character[] = [];
  log: string[] = [];
  /** 직전 takeTurn 동안 발생한 전투 표시(데미지/빗나감/회복). UI가 피격 대상 위에 띄운다. */
  lastTurnEvents: CombatFloatEvent[] = [];
  killEvents: KillEvent[] = [];
  levelUpEvents: LevelUpResult[] = [];
  finished = false;
  winner: Side | null = null;
  /** 무력화된 방패 instanceId → 남은 라운드 수(돌진: 3턴). */
  negatedShields = new Map<string, number>();
  /** 라운드당 반응(경호·협공) 발동 횟수. beginRound에서 리셋. */
  private reactionCountThisRound = new Map<string, number>();
  /** 이번 라운드에 이미 재행동한 유닛(중복 재행동 방지). */
  private recastedThisRound = new Set<string>();
  /** 공격 후 추가 이동/행동 대기 상태(UI/AI가 해소). */
  pendingFollowup: { unitId: string; kind: 'move' | 'action'; radius: number } | null = null;
  /** 각 진영이 마지막으로 확인한 상대 유닛 위치(현재 시야 밖이어도 유지) — 시야 밖일 때 이동 판단에 사용 */
  knownEnemyPositions: Record<Side, Record<string, GridPos>> = { A: {}, B: {} };
  private rng: () => number;

  constructor(map: BattleMap, teamA: Character[], teamB: Character[], rng: () => number = Math.random, weather: Weather = 'clear', time: TimeOfDay = 'day') {
    this.map = map;
    this.teamA = teamA;
    this.teamB = teamB;
    this.rng = rng;
    this.weather = weather;
    this.time = time;
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
    this.reactionCountThisRound.clear();
    this.recastedThisRound.clear();
    // 방패 무력화(돌진) 라운드 만료 처리
    for (const [id, remaining] of [...this.negatedShields.entries()]) {
      if (remaining <= 1) this.negatedShields.delete(id);
      else this.negatedShields.set(id, remaining - 1);
    }
    this.roundQueue = determineTurnOrder(this.allUnits(), this.round);
  }

  /** 경호(둔기)·협공(투척) 반응을 라운드당 한도 내에서 소모. 성공 시 true. */
  private consumeReaction(unitId: string, limit = 1): boolean {
    const used = this.reactionCountThisRound.get(unitId) ?? 0;
    if (used >= limit) return false;
    this.reactionCountThisRound.set(unitId, used + 1);
    return true;
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

  /** 양 진영이 현재 시야로 확인 가능한 상대 유닛의 위치를 각자의 '마지막 확인 위치' 기억에 갱신한다. */
  private updateKnownPositions(): void {
    const cond = { time: this.time, weather: this.weather };
    for (const side of ['A', 'B'] as Side[]) {
      const observers = (side === 'A' ? this.teamA : this.teamB).filter((u) => u.currentHp > 0);
      const enemies = side === 'A' ? this.teamB : this.teamA;
      for (const enemy of enemies) {
        if (enemy.currentHp <= 0) continue;
        if (isVisibleToTeam(enemy, observers, this.map, cond)) {
          this.knownEnemyPositions[side][enemy.id] = { ...enemy.position };
        }
      }
    }
  }

  /** 보호(스킬)·광역보호·경호(패시브) 순으로 공격을 아군에게 대신 돌린다 */
  private resolveGuardRedirect(target: Character): Character {
    const allies = this.ownTeamOf(target).filter((a) => a.id !== target.id && a.currentHp > 0);
    // 1) 활성 보호(보호 스킬): 지속 중 무제한 리다이렉트
    const active = allies.find((a) => {
      const g = a.statusEffects.find((s) => s.type === 'guarding');
      return g && manhattan(a.position, target.position) <= (g.magnitude ?? GUARD_DEFAULT_RADIUS);
    });
    if (active) return active;
    // 2) 광역보호 상태: 반경 2, 라운드당 2회
    const wide = allies.find((a) => a.statusEffects.some((s) => s.type === 'guardWide') && manhattan(a.position, target.position) <= 2);
    if (wide && this.consumeReaction(wide.id, 2)) return wide;
    // 3) 경호 패시브(둔기 T5): 인접 1칸, 라운드당 1회
    const passive = allies.find(
      (a) => this.weaponKindOf(a) === 'blunt' && hasWeaponPassive(a, 'blunt', 'guardian') && manhattan(a.position, target.position) <= 1,
    );
    if (passive && this.consumeReaction(passive.id, 1)) return passive;
    return target;
  }

  takeTurn(action: UnitAction): void {
    if (this.finished) return;
    this.lastTurnEvents = [];
    this.updateKnownPositions();
    const fromRoundQueue = this.roundQueue.length > 0;
    const unit = fromRoundQueue ? this.roundQueue.shift()! : this.bonusQueue.shift();
    if (!unit) return;

    if (unit.currentHp <= 0) {
      this.afterAction();
      return;
    }

    let stunnedThisTurn = false;
    if (fromRoundQueue) {
      // 출혈+맹독 합산 지속피해(한 턴 최대체력 20% 상한)와 충격 판정은 지속시간이 깎이기 전에 확인한다.
      const dot = applyDamageOverTime(unit);
      if (dot > 0) this.log.push(`${unit.name}는 지속 피해로 ${dot}의 데미지를 입었다.`);
      stunnedThisTurn = consumeShock(unit);

      const tick = tickStatusAtTurnStart(unit);
      for (const expired of tick.expired) this.log.push(`${unit.name}의 ${expired} 상태가 해제되었다.`);
      const burn = applyTileBurnDamage(unit, this.map);
      if (burn > 0) this.log.push(`${unit.name}는 화염 피해로 ${burn}의 데미지를 입었다.`);
      const heat = weatherTurnStartDamage(unit, this.weather, this.rng);
      if (heat > 0) this.log.push(`${unit.name}는 폭염으로 ${heat}의 데미지를 입었다.`);
      if (unit.currentHp <= 0) {
        this.log.push(`${unit.name}가 쓰러졌다.`);
        this.checkBattleEnd();
        this.afterAction();
        return;
      }
      if (stunnedThisTurn) {
        this.log.push(`${unit.name}는 충격으로 이번 턴에 행동할 수 없다.`);
        this.afterAction();
        return;
      }
    }

    unit.movedStepsThisTurn = 0;
    let swappedThisTurn = false;
    if (action.switchWeaponTo) {
      const newInstance = unit.inventory.find((w) => w.instanceId === action.switchWeaponTo);
      if (newInstance) {
        const kind = getWeapon(newInstance.templateId).kind;
        // 2차 전직(무료교체) 또는 빠른교체 상태면 턴을 소모하지 않는다.
        const free = masteryTier(unit, kind) >= FREE_SWAP_TIER || unit.statusEffects.some((s) => s.type === 'quickSwap');
        unit.equippedWeaponId = newInstance.instanceId;
        swappedThisTurn = true;
        this.log.push(`${unit.name}가 무기를 교체했다.`);
        if (!free) {
          this.afterAction();
          return;
        }
      }
    } else if (action.switchArmorTo) {
      const newArmor = unit.armor.find((a) => a.instanceId === action.switchArmorTo);
      if (newArmor) {
        unit.equippedArmorId = newArmor.instanceId;
        this.log.push(`${unit.name}가 방어구를 교체했다.`);
        this.afterAction();
        return;
      }
    }

    let steppedOntoHill = false;
    if (action.moveTo && isImmobilized(unit)) {
      this.log.push(`${unit.name}는 봉쇄되어 이동할 수 없다.`);
    } else if (action.moveTo) {
      const budget = effectiveMove(unit);
      const reachable = computeReachableTiles(this.map, unit, this.allUnits(), budget, this.weather);
      if (reachable.some((p) => p.x === action.moveTo!.x && p.y === action.moveTo!.y)) {
        unit.movedStepsThisTurn = manhattan(unit.position, action.moveTo);
        unit.position = action.moveTo;
        this.log.push(`${unit.name}가 이동했다.`);
        // 언덕에 올라선 턴에는 (등반 상태가 아니면) 추가 행동을 할 수 없다.
        if (this.map.tiles[unit.position.y][unit.position.x].terrain === 'hill' && !unit.statusEffects.some((s) => s.type === 'climbing')) {
          steppedOntoHill = true;
        }
      }
    }

    if (action.skillId) {
      if (steppedOntoHill) {
        this.log.push(`${unit.name}는 언덕에 올라 이번 턴에는 행동할 수 없다.`);
      } else {
        this.resolveSkillAction(unit, action, swappedThisTurn);
      }
    }

    this.checkBattleEnd();
    this.afterAction();
  }

  /** 스킬 사거리(천궁 언덕 보너스 포함). */
  private skillRangeFor(unit: Character, skill: ReturnType<typeof getSkill>, weaponRange: number): number {
    let range = skill.range === 'weapon' ? weaponRange : (skill.range ?? weaponRange);
    if (skill.hillRangeBonus && this.map.tiles[unit.position.y][unit.position.x].terrain === 'hill') range += skill.hillRangeBonus;
    return range;
  }

  private resolveSkillAction(unit: Character, action: UnitAction, swappedThisTurn = false): void {
    const skill = getSkill(action.skillId!);
    const weaponKind = this.weaponKindOf(unit);
    const weaponInstance = unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!;
    const weapon = getWeapon(weaponInstance.templateId);

    if (skill.id !== FALLBACK_SKILL_ID && !getUsableSkillIds(unit, weaponKind).includes(skill.id)) {
      this.log.push(`${unit.name}는 ${skill.name}을(를) 사용할 수 없다.`);
      return;
    }
    // 빠른교체로 이번 턴 무기를 바꿨으면 전용(무기) 기술은 사용할 수 없다.
    if (swappedThisTurn && skill.weaponKind !== 'common') {
      this.log.push(`${unit.name}는 교체한 턴에는 전용 기술을 사용할 수 없다.`);
      return;
    }
    if (skill.maxUses !== undefined && (unit.skillUses[skill.id] ?? 0) <= 0) {
      this.log.push(`${unit.name}는 ${skill.name}의 사용 횟수를 모두 소진했다.`);
      return;
    }
    // 보호·급류·등반·천리안·투시는 효과 지속 중에는 재사용할 수 없다.
    const activeStatus = NO_RECAST_WHILE_ACTIVE[skill.id];
    if (activeStatus && unit.statusEffects.some((s) => s.type === activeStatus)) {
      this.log.push(`${unit.name}의 ${skill.name}이(가) 이미 지속 중이다.`);
      return;
    }
    if (skill.requiresTerrain && this.map.tiles[unit.position.y][unit.position.x].terrain !== skill.requiresTerrain) {
      this.log.push(`${unit.name}는 ${skill.name}을(를) 사용할 수 없다 (지형 조건 불충족).`);
      return;
    }
    // 숲 안에서는 근접 무기만 행동할 수 있다.
    if (this.map.tiles[unit.position.y][unit.position.x].terrain === 'forest' && isRangedOrMagicKind(weaponKind)) {
      this.log.push(`${unit.name}는 숲 안에서는 근접 무기로만 행동할 수 있다.`);
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
      // 은신 중인 상대는 겨냥할 수 없다.
      if (target.statusEffects.some((s) => s.type === 'hidden')) {
        this.log.push(`${unit.name}의 ${skill.name}이(가) 대상을 찾지 못했다.`);
        return;
      }
      const range = this.skillRangeFor(unit, skill, weapon.range);
      if (skill.ignoresRange || skill.targetMode === 'anyInSight') {
        if (!isVisibleTo(unit, target, this.map, { time: this.time, weather: this.weather })) {
          this.log.push(`${unit.name}의 시야 밖이라 ${skill.name}을(를) 사용할 수 없다.`);
          return;
        }
        if (skill.range !== undefined && manhattan(unit.position, target.position) > range) {
          this.log.push(`${unit.name}의 ${skill.name}이(가) 사거리 밖이다.`);
          return;
        }
      } else if (manhattan(unit.position, target.position) > range) {
        this.log.push(`${unit.name}의 ${skill.name}이(가) 사거리 밖이다.`);
        return;
      }
      target = this.resolveGuardRedirect(target);
      targetPos = target.position;
    } else if (skill.targetMode === 'tile') {
      if (action.targetPos) targetPos = action.targetPos;
      if (skill.range) {
        const range = this.skillRangeFor(unit, skill, weapon.range);
        if (manhattan(unit.position, targetPos) > range) {
          this.log.push(`${unit.name}의 ${skill.name}이(가) 사거리 밖이다.`);
          return;
        }
      }
    } else if (skill.targetMode === 'allyAdjacentTile') {
      // 축지: 목적지는 시야 내 아군 인접 1칸의 빈 타일이어야 한다.
      if (!action.targetPos || !this.isValidWarpTile(unit, action.targetPos)) {
        this.log.push(`${unit.name}의 ${skill.name} 목적지가 올바르지 않다.`);
        return;
      }
      targetPos = action.targetPos;
    }

    // 원거리·마법 공격은 바위 타일을 넘어서 타격할 수 없다.
    if ((skill.targetMode === 'enemy' || skill.targetMode === 'tile' || skill.targetMode === 'anyInSight') && isRangedOrMagicKind(weaponKind) && lineCrossesRock(this.map, unit.position, targetPos)) {
      this.log.push(`${unit.name}의 ${skill.name}이(가) 바위에 가로막혔다.`);
      return;
    }

    if (skill.maxUses !== undefined) {
      // 명상(마법서 T5): 사용횟수 2회 이상 마법서 기술은 20% 확률로 사용횟수를 소모하지 않음(재행동 제외, 라운드당 1회).
      const meditation =
        weaponKind === 'tome' &&
        skill.id !== 'tome_recast' &&
        skill.maxUses >= 2 &&
        hasWeaponPassive(unit, 'tome', 'meditation') &&
        this.rng() < 0.2 &&
        this.consumeReaction(unit.id);
      if (meditation) {
        this.log.push(`${unit.name}의 명상으로 ${skill.name}의 사용 횟수가 소모되지 않았다.`);
      } else {
        unit.skillUses[skill.id] = (unit.skillUses[skill.id] ?? skill.maxUses) - 1;
      }
    }

    // 피해를 주는 공격은 대상별로 명중·회피를 통합 판정(applyAttack)하므로 여기선 굴리지 않는다.
    // 위력 0 보조/디버프 기술만 캐스팅 시점에 한 번 명중 판정한다(회피 미적용, 정신력 저항은 별도).
    const dealsPerTargetDamage = skill.power > 0 || skill.fixedDamagePercent !== undefined;
    if (!dealsPerTargetDamage) {
      const hitRoll = this.rng() * 100;
      if (hitRoll >= skill.accuracy) {
        this.log.push(`${unit.name}의 ${skill.name}이(가) 빗나갔다.`);
        if (target) this.lastTurnEvents.push({ targetId: target.id, kind: 'miss' });
        return;
      }
    }

    // 이번 기술 사용에서 각 공격자가 직접 피해를 준 횟수(무기 숙련 경험치 상한 적용용).
    const proficiencyHits = new Map<string, { kind: WeaponKind; hits: number }>();
    resolveSkill({
      map: this.map,
      actorTeam: this.ownTeamOf(unit),
      enemyTeam: this.otherTeamOf(unit),
      actor: unit,
      skill,
      weapon,
      weaponPower: effectiveWeaponPower(weaponInstance.level, weapon.kind, !!unit.equippedShieldId, weaponInstance.enhanceLevel ?? 0, unit.traitId === 'repairer'),
      targetId: target?.id,
      targetPos,
      negatedShields: this.negatedShields,
      log: this.log,
      combatEvents: this.lastTurnEvents,
      rng: this.rng,
      noteDirectDamage: (attacker, kind) => {
        const entry = proficiencyHits.get(attacker.id) ?? { kind, hits: 0 };
        entry.hits += 1;
        proficiencyHits.set(attacker.id, entry);
      },
      onKill: (killerId, victimId) => this.grantKillXp(killerId, victimId),
      onBonusAction: (unitId) => {
        const bonusUnit = this.allUnits().find((u) => u.id === unitId);
        if (bonusUnit) this.grantBonusAction(bonusUnit);
      },
      consumeReaction: (unitId) => this.consumeReaction(unitId),
      requestFollowup: (unitId, opts) => {
        const u = this.allUnits().find((x) => x.id === unitId);
        if (!u || u.currentHp <= 0) return;
        if (opts.kind === 'move') {
          const radius = opts.radius ?? 1;
          const dest = action.followupMoveTo;
          if (dest && this.isReachableWithin(u, dest, radius)) {
            u.position = { x: dest.x, y: dest.y };
            this.log.push(`${u.name}가 추가로 이동했다.`);
          } else if (!dest) {
            // 지정된 목적지가 없으면(AI) 가장 가까운 적 쪽으로 자동 이동.
            this.autoFollowupMove(u, radius);
          }
        } else {
          this.grantBonusAction(u);
        }
      },
    });

    // 무기 숙련 경험치 누적: 한 번의 기술 사용에서 얻는 경험치는 최대 2배(상한)까지만.
    for (const [id, { kind, hits }] of proficiencyHits) {
      const u = this.allUnits().find((x) => x.id === id);
      if (!u) continue;
      const w = u.inventory.find((i) => i.instanceId === u.equippedWeaponId);
      const mult = proficiencyExpTraitMult(u) * weaponEnhanceExpMult(w?.enhanceLevel ?? 0); // 훈련광 특성 + 무기 강화
      gainProficiencyExp(u, kind, Math.min(hits, PROFICIENCY_MAX_GAIN_PER_SKILL) * mult);
    }
  }

  private grantBonusAction(unit: Character): void {
    if (unit.currentHp <= 0 || this.recastedThisRound.has(unit.id) || this.bonusQueue.includes(unit)) return;
    this.recastedThisRound.add(unit.id);
    unit.bonusActionPending = true;
    this.bonusQueue.push(unit);
  }

  /** 도약사격·기습 후속 이동: 반경 내에서 가장 가까운 적 쪽으로 자동 이동(AI·기본 처리). */
  private autoFollowupMove(unit: Character, radius: number): void {
    const enemies = this.otherTeamOf(unit).filter((u) => u.currentHp > 0);
    if (enemies.length === 0) return;
    const reachable = computeReachableTiles(this.map, unit, this.allUnits(), radius, this.weather);
    if (reachable.length === 0) return;
    const nearest = (pos: GridPos) => Math.min(...enemies.map((e) => manhattan(pos, e.position)));
    let best = unit.position;
    let bestDist = nearest(unit.position);
    for (const p of reachable) {
      const d = nearest(p);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (best !== unit.position) {
      unit.position = best;
      this.log.push(`${unit.name}가 추가로 이동했다.`);
    }
  }

  /** 후속 이동 목적지가 반경 내 실제로 도달 가능한 빈 타일인지 검증. */
  private isReachableWithin(unit: Character, dest: GridPos, radius: number): boolean {
    if (dest.x === unit.position.x && dest.y === unit.position.y) return true; // 제자리(이동 생략)
    return computeReachableTiles(this.map, unit, this.allUnits(), radius, this.weather).some((p) => p.x === dest.x && p.y === dest.y);
  }

  /** 축지 목적지 검증: 시야 내 다른 아군의 인접 1칸이며 비어 있는(바위·점유 아님) 타일 */
  private isValidWarpTile(unit: Character, pos: GridPos): boolean {
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.map.width || pos.y >= this.map.height) return false;
    if (this.map.tiles[pos.y][pos.x].terrain === 'rock') return false;
    if (this.allUnits().some((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y)) return false;
    const cond = { time: this.time, weather: this.weather };
    return this.ownTeamOf(unit).some(
      (a) => a.id !== unit.id && a.currentHp > 0 && isVisibleTo(unit, a, this.map, cond) && manhattan(a.position, pos) === 1,
    );
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
