import type { BattleOutcome } from './types';

/** 전투 골드: 처치당 +10, 라운드 클리어 +round×20(승리 시), 보스 처치 +100. */
export function battleGold(o: BattleOutcome): number {
  let g = o.enemiesDefeated * 10;
  if (o.won) g += o.round * 20;
  if (o.bossDefeated) g += 100;
  return g;
}
