import type { Character } from '../types';
import type { BattleObjective, GridBattle } from '../engine/battle';
import { isBossRound, enemyCountForRound } from './enemyParty';

/** 기본 목표(§40 초반 3종). 중반 이후 목표(거점·호위 등)는 후속 단계. */
type PrimaryObjectiveType = 'annihilate' | 'killCommander' | 'surviveTurns';
/** 선택 목표(§40, 최대 1개). */
type OptionalObjectiveType = 'fastWin' | 'defeatHalf';
/** 전투 평가(§41). */
export type BattleRating = 'victory' | 'complete' | 'overwhelming';

export interface RoundObjectives {
  primary: PrimaryObjectiveType;
  primaryTurnLimit?: number;
  optional: OptionalObjectiveType;
  optionalTurnLimit?: number; // fastWin: 이 라운드 이내 승리
  optionalCount?: number; // defeatHalf: 처치 목표 수
}

/** 라운드별 전투 목표(기본 1 + 선택 1). 결정적. */
export function objectivesForRound(round: number): RoundObjectives {
  const enemies = enemyCountForRound(round);
  if (isBossRound(round)) {
    return { primary: 'killCommander', optional: 'fastWin', optionalTurnLimit: enemies + 6 };
  }
  if (round % 4 === 3) {
    return { primary: 'surviveTurns', primaryTurnLimit: 5, optional: 'defeatHalf', optionalCount: Math.ceil(enemies / 2) };
  }
  return { primary: 'annihilate', optional: 'fastWin', optionalTurnLimit: enemies + 4 };
}

const PRIMARY_LABEL: Record<PrimaryObjectiveType, string> = {
  annihilate: '적 전멸', killCommander: '지휘관 처치', surviveTurns: '제한 턴 생존',
};

export function primaryObjectiveLabel(o: RoundObjectives): string {
  if (o.primary === 'surviveTurns') return `${PRIMARY_LABEL.surviveTurns}(${o.primaryTurnLimit}라운드)`;
  return PRIMARY_LABEL[o.primary];
}

export function optionalObjectiveLabel(o: RoundObjectives): string {
  if (o.optional === 'fastWin') return `${o.optionalTurnLimit}라운드 이내 승리`;
  return `적 ${o.optionalCount}명 이상 처치`;
}

export const RATING_LABEL: Record<BattleRating, string> = {
  victory: '승리', complete: '완전 승리', overwhelming: '압도적 승리',
};

/** 라운드 목표를 전투 엔진용 승리 조건으로 변환한다. */
export function buildBattleObjective(round: number, teamB: Character[]): BattleObjective {
  const o = objectivesForRound(round);
  if (o.primary === 'killCommander') {
    const cmd = teamB.find((c) => c.isBoss) ?? teamB[0];
    return { primary: 'killCommander', commanderId: cmd?.id };
  }
  if (o.primary === 'surviveTurns') return { primary: 'surviveTurns', turnLimit: o.primaryTurnLimit };
  return { primary: 'annihilate' };
}

export interface BattleEvaluation {
  won: boolean;
  optionalMet: boolean;
  noAllyDown: boolean;
  rating: BattleRating | null;
}

/** 전투 결과를 목표 기준으로 평가한다(§41). */
export function evaluateBattle(round: number, battle: GridBattle): BattleEvaluation {
  const o = objectivesForRound(round);
  const won = battle.winner === 'A';
  const allySurvivors = battle.teamA.filter((a) => a.currentHp > 0).length;
  const enemiesDefeated = battle.teamB.filter((e) => e.currentHp <= 0).length;
  const noAllyDown = allySurvivors === battle.teamA.length;
  let optionalMet = false;
  if (won) {
    optionalMet = o.optional === 'fastWin'
      ? battle.round <= (o.optionalTurnLimit ?? 99)
      : enemiesDefeated >= (o.optionalCount ?? 1);
  }
  let rating: BattleRating | null = null;
  if (won && optionalMet && noAllyDown) rating = 'overwhelming';
  else if (won && optionalMet) rating = 'complete';
  else if (won) rating = 'victory';
  return { won, optionalMet, noAllyDown, rating };
}

/** 평가 등급별 추가 명성·골드(§41). */
export function ratingReward(rating: BattleRating | null): { reputation: number; gold: number } {
  if (rating === 'overwhelming') return { reputation: 25, gold: 60 };
  if (rating === 'complete') return { reputation: 10, gold: 30 };
  return { reputation: 0, gold: 0 };
}
