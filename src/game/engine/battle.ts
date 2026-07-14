import { getJob } from '../data/jobs';
import { getSkill, skillUsableWithWeapon } from '../data/skills';
import { getWeapon } from '../data/weapons';
import type { Character } from '../types';
import { calculateDamage } from './damage';
import { tickStatusAtTurnStart, tryApplyStatus } from './status';
import { determineTurnOrder, type TurnCandidate } from './turnOrder';

export type Side = 'A' | 'B';

export interface BattleAction {
  switchWeaponTo?: string;
  skillId?: string;
}

/** UI 애니메이션이 참고할 수 있도록 한 캐릭터의 행동 1회를 구조화한 결과 */
export interface TurnStepResult {
  actorId: string;
  actorSide: Side;
  actorName: string;
  skillId?: string;
  skillName?: string;
  targetSide: Side | null;
  targetName: string | null;
  lines: string[];
  skipped: 'fainted' | 'sleep' | 'stun' | null;
  missed: boolean;
  isAttack: boolean;
  isHeal: boolean;
  damage: number;
  extraHitDamage: number;
  crit: boolean;
  targetFainted: boolean;
}

export class Battle {
  readonly log: string[] = [];
  turnNumber = 0;
  finished = false;
  winner: Side | null = null;
  teamA: Character[];
  teamB: Character[];
  private rng: () => number;
  private turnQueue: TurnCandidate[] = [];
  private sideOf = new Map<string, Side>();

  constructor(teamA: Character[], teamB: Character[], rng: () => number = Math.random) {
    this.teamA = teamA;
    this.teamB = teamB;
    this.rng = rng;
    this.teamA[0].isActive = true;
    this.teamB[0].isActive = true;
    this.triggerEntryEffects('A');
    this.triggerEntryEffects('B');
  }

  private randInt(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  private team(side: Side): Character[] {
    return side === 'A' ? this.teamA : this.teamB;
  }

  private otherSide(side: Side): Side {
    return side === 'A' ? 'B' : 'A';
  }

  getActive(side: Side): Character {
    return this.team(side).find((c) => c.isActive) ?? this.team(side)[0];
  }

  private triggerEntryEffects(side: Side) {
    const character = this.getActive(side);
    const job = getJob(character.jobId);
    if (!job.traits.includes('priestEntryHeal')) return;

    const team = this.team(side);
    const lowest = team.reduce((min, c) => (c.currentHp / c.baseStats.hp < min.currentHp / min.baseStats.hp ? c : min));
    const healAmount = Math.max(1, Math.round(lowest.baseStats.hp * 0.25));
    const before = lowest.currentHp;
    lowest.currentHp = Math.min(lowest.baseStats.hp, lowest.currentHp + healAmount);
    if (lowest.currentHp > before) {
      this.log.push(`${character.name} 등장: ${lowest.name}의 체력을 ${lowest.currentHp - before} 회복했다.`);
    }
  }

  private teamHasFieldGuard(side: Side): boolean {
    return this.team(side).some((c) => c.isActive && getJob(c.jobId).traits.includes('onFieldDamageReduction'));
  }

  /** 이번 턴에 실행될 행동 큐를 스피드 순으로 준비한다(무기 교체는 즉시 적용). */
  beginTurn(actionA: BattleAction, actionB: BattleAction): void {
    if (this.finished) return;
    this.turnNumber += 1;
    this.log.push(`--- ${this.turnNumber}턴 ---`);

    const candidates: TurnCandidate[] = [];
    this.sideOf = new Map<string, Side>();

    for (const { side, action } of [
      { side: 'A' as Side, action: actionA },
      { side: 'B' as Side, action: actionB },
    ]) {
      const character = this.getActive(side);
      character.weaponSwitchedThisTurn = false;
      if (character.currentHp <= 0) continue;
      const job = getJob(character.jobId);

      let turnConsumedBySwitch = false;
      if (action.switchWeaponTo) {
        const newWeapon = getWeapon(action.switchWeaponTo);
        const sameWeapon = character.equippedWeapon.templateId === newWeapon.id;
        character.equippedWeapon = {
          templateId: newWeapon.id,
          enhancementLevel: sameWeapon ? character.equippedWeapon.enhancementLevel : 0,
        };
        character.weaponSwitchedThisTurn = true;
        this.log.push(`${character.name}가 무기를 ${newWeapon.name}(으)로 교체했다.`);
        turnConsumedBySwitch = !job.traits.includes('freeWeaponSwitch');
      }

      if (turnConsumedBySwitch || !action.skillId) continue;

      const skill = getSkill(action.skillId);
      const weapon = getWeapon(character.equippedWeapon.templateId);
      if (!skillUsableWithWeapon(skill, weapon)) {
        this.log.push(`${character.name}는 ${skill.name}을(를) 사용할 수 없다 (무기 타입 불일치).`);
        continue;
      }

      this.sideOf.set(character.id, side);
      candidates.push({ characterId: character.id, character, job, skill, weaponSpeed: weapon.baseSpeed });
    }

    this.turnQueue = determineTurnOrder(candidates, this.rng);
  }

  hasPendingStep(): boolean {
    return this.turnQueue.length > 0;
  }

  /** 큐의 맨 앞 캐릭터 행동 1회를 처리하고, 애니메이션에 필요한 구조화된 결과를 반환한다. */
  resolveNextStep(): TurnStepResult {
    const c = this.turnQueue.shift();
    if (!c) throw new Error('resolveNextStep() called with an empty queue');

    const startIdx = this.log.length;
    const base = {
      actorId: c.character.id,
      actorSide: this.sideOf.get(c.character.id)!,
      actorName: c.character.name,
      skillId: c.skill.id,
      skillName: c.skill.name,
    };

    if (c.character.currentHp <= 0) {
      return { ...base, targetSide: null, targetName: null, lines: [], skipped: 'fainted', missed: false, isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false, targetFainted: false };
    }

    const tick = tickStatusAtTurnStart(c.character);
    if (tick.dotDamage > 0) this.log.push(`${c.character.name}는 상태이상 데미지 ${tick.dotDamage}를 입었다.`);
    for (const exp of tick.expired) this.log.push(`${c.character.name}의 ${exp} 상태가 해제되었다.`);

    if (c.character.currentHp <= 0) {
      this.log.push(`${c.character.name}는 쓰러졌다.`);
      this.checkBattleEnd();
      return { ...base, targetSide: null, targetName: null, lines: this.log.slice(startIdx), skipped: 'fainted', missed: false, isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false, targetFainted: false };
    }
    if (tick.skipTurn) {
      this.log.push(`${c.character.name}는 행동할 수 없다.`);
      const skipped = c.character.statusEffects.some((s) => s.effect === 'stun') ? 'stun' : 'sleep';
      return { ...base, targetSide: null, targetName: null, lines: this.log.slice(startIdx), skipped, missed: false, isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false, targetFainted: false };
    }

    const side = base.actorSide;
    const target = this.getActive(this.otherSide(side));

    // 연속 사용 페널티: 직전 턴에 같은 기술을 썼다면 명중률이 낮아진다(예: 방어).
    const effectiveAccuracy =
      c.skill.consecutivePenaltyAccuracy != null && c.character.lastSkillId === c.skill.id
        ? c.skill.consecutivePenaltyAccuracy
        : c.skill.accuracy;
    c.character.lastSkillId = c.skill.id;

    const hitRoll = this.rng() * 100;
    if (hitRoll >= effectiveAccuracy) {
      this.log.push(`${c.character.name}의 ${c.skill.name}이(가) 빗나갔다.`);
      return { ...base, targetSide: this.otherSide(side), targetName: target.name, lines: this.log.slice(startIdx), skipped: null, missed: true, isAttack: c.skill.category === 'attack', isHeal: false, damage: 0, extraHitDamage: 0, crit: false, targetFainted: false };
    }

    const effect = this.resolveSkillEffect(c.character, side, target, c);

    if (target.currentHp <= 0 && effect.isAttack) this.log.push(`${target.name}가 쓰러졌다.`);
    this.checkBattleEnd();

    return {
      ...base,
      targetSide: effect.isAttack ? this.otherSide(side) : effect.isHeal ? side : null,
      targetName: effect.isAttack ? target.name : effect.isHeal ? c.character.name : null,
      lines: this.log.slice(startIdx),
      skipped: null,
      missed: false,
      isAttack: effect.isAttack,
      isHeal: effect.isHeal,
      damage: effect.damage,
      extraHitDamage: effect.extraHitDamage,
      crit: effect.crit,
      targetFainted: effect.isAttack && target.currentHp <= 0,
    };
  }

  /** 한 턴(양측 행동)을 애니메이션 없이 즉시 끝까지 처리하는 편의 메서드. 테스트/시뮬레이션용. */
  runTurn(actionA: BattleAction, actionB: BattleAction): string[] {
    const startIdx = this.log.length;
    this.beginTurn(actionA, actionB);
    while (this.hasPendingStep()) this.resolveNextStep();
    return this.log.slice(startIdx);
  }

  private resolveSkillEffect(actor: Character, side: Side, target: Character, c: TurnCandidate) {
    const { skill, job: actorJob } = c;
    const weapon = getWeapon(actor.equippedWeapon.templateId);

    switch (skill.category) {
      case 'attack': {
        const defenderJob = getJob(target.jobId);
        const damageCtx = {
          attacker: actor,
          attackerJob: actorJob,
          defender: target,
          defenderJob,
          skill,
          weapon,
          defendingTeamHasFieldGuard: this.teamHasFieldGuard(this.otherSide(side)),
          rng: this.rng,
        };

        // 다단히트 기술은 1회 위력으로 min~max회 공격한다.
        const hitCount = skill.hits ? this.randInt(skill.hits.min, skill.hits.max) : 1;
        let baseDamage = 0;
        let extraHitDamage = 0;
        let anyCrit = false;
        let bonusStatus: ReturnType<typeof calculateDamage>['proc']['bonusStatus'];
        for (let i = 0; i < hitCount; i += 1) {
          const result = calculateDamage(damageCtx);
          if (i === 0) baseDamage = result.damage;
          else extraHitDamage += result.damage;
          extraHitDamage += result.extraHitDamage;
          if (result.crit) anyCrit = true;
          if (!bonusStatus && result.proc.bonusStatus) bonusStatus = result.proc.bonusStatus;
        }

        // 완전방어(방어) 상태의 대상은 이번 공격 피해를 0으로 만든다.
        const blocked = target.guardingFull;
        let totalDamage = baseDamage + extraHitDamage;
        if (blocked) {
          totalDamage = 0;
          baseDamage = 0;
          extraHitDamage = 0;
        }

        target.currentHp = Math.max(0, target.currentHp - totalDamage);
        target.hitsTakenThisBattle += 1;
        target.guarding = false;
        target.guardingFull = false;

        if (blocked) {
          this.log.push(`${actor.name}의 ${skill.name}! 하지만 ${target.name}가 방어로 피해를 완전히 막았다!`);
        } else {
          const hitLabel = hitCount > 1 ? ` (${hitCount}회 명중)` : '';
          this.log.push(
            `${actor.name}의 ${skill.name}! ${target.name}에게 ${totalDamage}의 데미지${anyCrit ? ' (급소)' : ''}${hitLabel}.`,
          );
        }
        if (totalDamage > 0 && bonusStatus) {
          const applied = tryApplyStatus(target, bonusStatus, 1, this.rng);
          if (applied) this.log.push(`${target.name}는 ${bonusStatus} 상태가 되었다.`);
        }
        if (totalDamage > 0 && skill.statusEffect) {
          const applied = tryApplyStatus(target, skill.statusEffect.effect, skill.statusEffect.chance, this.rng);
          if (applied) this.log.push(`${target.name}는 ${skill.statusEffect.effect} 상태가 되었다.`);
        }
        return { isAttack: true, isHeal: false, damage: baseDamage, extraHitDamage, crit: anyCrit };
      }
      case 'heal': {
        const healAmount = Math.max(1, Math.round(actor.baseStats.hp * (skill.healPercent ?? 0)));
        const before = actor.currentHp;
        actor.currentHp = Math.min(actor.baseStats.hp, actor.currentHp + healAmount);
        this.log.push(`${actor.name}가 ${skill.name}으로 체력을 ${actor.currentHp - before} 회복했다.`);
        return { isAttack: false, isHeal: true, damage: 0, extraHitDamage: 0, crit: false };
      }
      case 'buff': {
        actor.statMultipliers.attack = Math.min(2, actor.statMultipliers.attack * 1.2);
        this.log.push(`${actor.name}의 공격력이 상승했다.`);
        return { isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false };
      }
      case 'debuff': {
        target.statMultipliers.defense = Math.max(0.5, target.statMultipliers.defense * 0.8);
        this.log.push(`${target.name}의 방어력이 하락했다.`);
        return { isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false };
      }
      case 'defense': {
        if (skill.fullGuard) {
          actor.guardingFull = true;
          this.log.push(`${actor.name}가 완전방어 태세를 취했다.`);
        } else {
          actor.guarding = true;
          this.log.push(`${actor.name}가 방어태세를 취했다.`);
        }
        return { isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false };
      }
      case 'status':
      default:
        return { isAttack: false, isHeal: false, damage: 0, extraHitDamage: 0, crit: false };
    }
  }

  private checkBattleEnd() {
    if (this.finished) return;
    const aAlive = this.teamA.some((c) => c.currentHp > 0);
    const bAlive = this.teamB.some((c) => c.currentHp > 0);
    if (!aAlive || !bAlive) {
      this.finished = true;
      this.winner = aAlive ? 'A' : bAlive ? 'B' : null;
      this.log.push(this.winner ? `전투 종료: ${this.winner === 'A' ? 'A팀' : 'B팀'} 승리!` : '전투 종료: 무승부');
      this.turnQueue = [];
    }
  }
}
