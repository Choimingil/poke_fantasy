import type { BattleOutcome } from './types';

/** 라운드 기본 명성: 1라운드 0, 2라운드 10, 3라운드 20 … (라운드가 오를수록 증가). */
export function baseReputation(round: number): number {
  return Math.max(0, (round - 1) * 10);
}

/** 전투 성과 명성 보너스: 적 전멸 +20, 아군 생존 수 ×5, 보스 처치 +50. */
export function battleReputationBonus(o: BattleOutcome): number {
  let bonus = 0;
  if (o.won) bonus += 20; // 적 전멸(승리)
  bonus += o.allySurvivors * 5;
  if (o.bossDefeated) bonus += 50;
  return bonus;
}

/** 라운드 클리어 시 획득 명성(기본 + 성과 보너스). 승리했을 때만 지급. */
export function roundReputationGain(o: BattleOutcome): number {
  if (!o.won) return 0;
  return baseReputation(o.round) + battleReputationBonus(o);
}
