import type { WeaponKind } from '../types';
import type { GridBattle } from '../engine/battle';
import type { BattleOutcome, Campaign } from './types';
import { CAMPAIGN_VERSION, MAX_ROSTER } from './types';
import { generateCharacter } from './generateCharacter';
import { rollRecruits } from './recruit';
import { roundReputationGain } from './reputation';
import { battleGold } from './gold';

/** 선택한 직업으로 주인공 1명을 만들어 새 캠페인을 시작한다(레벨 10, 초급 전용기술 보유). */
export function newCampaign(heroKind: WeaponKind, rng: () => number = Math.random): Campaign {
  const hero = generateCharacter(heroKind, 10, { id: 'hero', name: '주인공', rng });
  const { recruits, nextId } = rollRecruits(0, 1, rng);
  return {
    version: CAMPAIGN_VERSION,
    heroKind,
    round: 1,
    gold: 0,
    reputation: 0,
    roster: [hero],
    deployedIds: ['hero'],
    stash: { weapons: [], armor: [] },
    recruits,
    shop: [],
    nextId,
  };
}

/** 후보를 골드로 모집해 로스터에 추가한다(골드 부족·인원 초과 시 변화 없음). */
export function recruitFromCandidate(campaign: Campaign, candidateId: string): Campaign {
  const cand = campaign.recruits.find((r) => r.id === candidateId);
  if (!cand) return campaign;
  if (campaign.gold < cand.cost) return campaign;
  if (campaign.roster.length >= MAX_ROSTER) return campaign;
  return {
    ...campaign,
    gold: campaign.gold - cand.cost,
    roster: [...campaign.roster, cand.character],
    recruits: campaign.recruits.filter((r) => r.id !== candidateId),
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

/** 전투 결과로 명성·골드를 정산하고 승리 시 라운드를 진행한다(라운드 진행 시 모집 후보 갱신). */
export function settleBattle(campaign: Campaign, outcome: BattleOutcome, rng: () => number = Math.random): SettleResult {
  const reputationGained = roundReputationGain(outcome);
  const goldGained = battleGold(outcome);
  const reputation = campaign.reputation + reputationGained;
  const next: Campaign = {
    ...campaign,
    reputation,
    gold: campaign.gold + goldGained,
    round: outcome.won ? campaign.round + 1 : campaign.round,
  };
  // 승리로 라운드가 진행되면 새 명성 기준으로 모집 후보를 갱신(지나간 후보는 사라진다).
  if (outcome.won) {
    const rolled = rollRecruits(reputation, campaign.nextId, rng);
    next.recruits = rolled.recruits;
    next.nextId = rolled.nextId;
  }
  return { campaign: next, reputationGained, goldGained };
}
