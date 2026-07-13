import { getJob } from '../data/jobs';
import { getSkill } from '../data/skills';
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

export class Battle {
  readonly log: string[] = [];
  turnNumber = 0;
  finished = false;
  winner: Side | null = null;
  teamA: Character[];
  teamB: Character[];
  private rng: () => number;

  constructor(teamA: Character[], teamB: Character[], rng: () => number = Math.random) {
    this.teamA = teamA;
    this.teamB = teamB;
    this.rng = rng;
    this.teamA[0].isActive = true;
    this.teamB[0].isActive = true;
    this.triggerEntryEffects('A');
    this.triggerEntryEffects('B');
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

  runTurn(actionA: BattleAction, actionB: BattleAction): string[] {
    if (this.finished) return [];
    this.turnNumber += 1;
    const startIdx = this.log.length;
    this.log.push(`--- ${this.turnNumber}턴 ---`);

    const candidates: TurnCandidate[] = [];
    const sideOf = new Map<string, Side>();

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
      if (weapon.type !== skill.type) {
        this.log.push(`${character.name}는 ${skill.name}을(를) 사용할 수 없다 (무기 타입 불일치).`);
        continue;
      }
      if (skill.category === 'defense' && weapon.kind !== 'shield') {
        this.log.push(`${character.name}는 ${skill.name}을(를) 사용할 수 없다 (방패 필요).`);
        continue;
      }

      sideOf.set(character.id, side);
      candidates.push({ characterId: character.id, character, job, skill, weaponSpeed: weapon.baseSpeed });
    }

    const order = determineTurnOrder(candidates, this.rng);

    for (const c of order) {
      if (c.character.currentHp <= 0) continue;

      const tick = tickStatusAtTurnStart(c.character);
      if (tick.dotDamage > 0) this.log.push(`${c.character.name}는 상태이상 데미지 ${tick.dotDamage}를 입었다.`);
      for (const exp of tick.expired) this.log.push(`${c.character.name}의 ${exp} 상태가 해제되었다.`);
      if (c.character.currentHp <= 0) {
        this.log.push(`${c.character.name}는 쓰러졌다.`);
        continue;
      }
      if (tick.skipTurn) {
        this.log.push(`${c.character.name}는 행동할 수 없다.`);
        continue;
      }

      const side = sideOf.get(c.character.id)!;
      const target = this.getActive(this.otherSide(side));

      const hitRoll = this.rng() * 100;
      if (hitRoll >= c.skill.accuracy) {
        this.log.push(`${c.character.name}의 ${c.skill.name}이(가) 빗나갔다.`);
        continue;
      }

      this.resolveSkillEffect(c.character, side, target, c);

      if (target.currentHp <= 0) this.log.push(`${target.name}가 쓰러졌다.`);
    }

    this.checkBattleEnd();
    return this.log.slice(startIdx);
  }

  private resolveSkillEffect(actor: Character, side: Side, target: Character, c: TurnCandidate) {
    const { skill, job: actorJob } = c;
    const weapon = getWeapon(actor.equippedWeapon.templateId);

    switch (skill.category) {
      case 'attack': {
        const defenderJob = getJob(target.jobId);
        const result = calculateDamage({
          attacker: actor,
          attackerJob: actorJob,
          defender: target,
          defenderJob,
          skill,
          weapon,
          defendingTeamHasFieldGuard: this.teamHasFieldGuard(this.otherSide(side)),
          rng: this.rng,
        });
        target.currentHp = Math.max(0, target.currentHp - result.damage);
        target.hitsTakenThisBattle += 1;
        target.guarding = false;
        this.log.push(
          `${actor.name}의 ${skill.name}! ${target.name}에게 ${result.damage}의 데미지${result.crit ? ' (급소)' : ''}.`,
        );
        if (result.extraHitDamage > 0) {
          target.currentHp = Math.max(0, target.currentHp - result.extraHitDamage);
          this.log.push(`연사 추가타격! ${result.extraHitDamage}의 추가 데미지.`);
        }
        if (result.proc.bonusStatus) {
          const applied = tryApplyStatus(target, result.proc.bonusStatus, 1, this.rng);
          if (applied) this.log.push(`${target.name}는 ${result.proc.bonusStatus} 상태가 되었다.`);
        }
        if (skill.statusEffect) {
          const applied = tryApplyStatus(target, skill.statusEffect.effect, skill.statusEffect.chance, this.rng);
          if (applied) this.log.push(`${target.name}는 ${skill.statusEffect.effect} 상태가 되었다.`);
        }
        break;
      }
      case 'heal': {
        const healAmount = Math.max(1, Math.round(actor.baseStats.hp * (skill.healPercent ?? 0)));
        const before = actor.currentHp;
        actor.currentHp = Math.min(actor.baseStats.hp, actor.currentHp + healAmount);
        this.log.push(`${actor.name}가 ${skill.name}으로 체력을 ${actor.currentHp - before} 회복했다.`);
        break;
      }
      case 'buff': {
        actor.statMultipliers.attack = Math.min(2, actor.statMultipliers.attack * 1.2);
        this.log.push(`${actor.name}의 공격력이 상승했다.`);
        break;
      }
      case 'debuff': {
        target.statMultipliers.defense = Math.max(0.5, target.statMultipliers.defense * 0.8);
        this.log.push(`${target.name}의 방어력이 하락했다.`);
        break;
      }
      case 'defense': {
        actor.guarding = true;
        this.log.push(`${actor.name}가 방어태세를 취했다.`);
        break;
      }
      case 'status':
      default:
        break;
    }
  }

  private checkBattleEnd() {
    const aAlive = this.teamA.some((c) => c.currentHp > 0);
    const bAlive = this.teamB.some((c) => c.currentHp > 0);
    if (!aAlive || !bAlive) {
      this.finished = true;
      this.winner = aAlive ? 'A' : bAlive ? 'B' : null;
      this.log.push(this.winner ? `전투 종료: ${this.winner === 'A' ? 'A팀' : 'B팀'} 승리!` : '전투 종료: 무승부');
    }
  }
}
