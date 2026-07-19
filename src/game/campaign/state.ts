import type { WeaponKind } from '../types';
import type { GridBattle } from '../engine/battle';
import type { BattleOutcome, Campaign } from './types';
import { CAMPAIGN_VERSION } from './types';
import { generateCharacter } from './generateCharacter';
import { roundReputationGain } from './reputation';
import { battleGold } from './gold';

/** 선택한 직업으로 주인공 1명을 만들어 새 캠페인을 시작한다(레벨 10, 초급 전용기술 보유). */
export function newCampaign(heroKind: WeaponKind, rng: () => number = Math.random): Campaign {
  const hero = generateCharacter(heroKind, 10, { id: 'hero', name: '주인공', rng });
  return {
    version: CAMPAIGN_VERSION,
    heroKind,
    round: 1,
    gold: 0,
    reputation: 0,
    roster: [hero],
    deployedIds: ['hero'],
    stash: { weapons: [], armor: [] },
    recruits: [],
    shop: [],
    nextId: 1,
  };
}

/** 끝난 전투로부터 성과 요약을 만든다(플레이어 = A팀). */
export function outcomeFromBattle(battle: GridBattle, round: number): BattleOutcome {
  const enemies = battle.teamB;
  return {
    round,
    won: battle.winner === 'A',
    enemiesDefeated: enemies.filter((e) => e.currentHp <= 0).length,
    allySurvivors: battle.teamA.filter((a) => a.currentHp > 0).length,
    bossDefeated: enemies.some((e) => e.isBoss && e.currentHp <= 0),
  };
}

export interface SettleResult {
  campaign: Campaign;
  reputationGained: number;
  goldGained: number;
}

/** 전투 결과로 명성·골드를 정산하고 승리 시 라운드를 진행한다. */
export function settleBattle(campaign: Campaign, outcome: BattleOutcome): SettleResult {
  const reputationGained = roundReputationGain(outcome);
  const goldGained = battleGold(outcome);
  return {
    campaign: {
      ...campaign,
      reputation: campaign.reputation + reputationGained,
      gold: campaign.gold + goldGained,
      round: outcome.won ? campaign.round + 1 : campaign.round,
    },
    reputationGained,
    goldGained,
  };
}
