import type { ArmorKind, SpriteGender, WeaponKind } from '../types';
import type { GridBattle } from '../engine/battle';
import type { BattleOutcome, Campaign } from './types';
import { CAMPAIGN_VERSION, MAX_ROSTER } from './types';
import { generateCharacter } from './generateCharacter';
import { rollRecruits } from './recruit';
import { rollShop } from './shop';
import { roundReputationGain } from './reputation';
import { battleGold } from './gold';
import { evaluateBattle, ratingReward } from './objectives';
import { applyCasualties, treatmentCost } from './casualties';

export interface HeroSetup {
  heroKind: WeaponKind;
  name: string;
  gender: SpriteGender;
  armorKind: ArmorKind; // 천 또는 가죽(§2.1)
  traitId: string;
  /** 시작 시 등장한 특성 후보 3개(튜토리얼 종료 후 재확인용). */
  traitCandidates: string[];
}

/**
 * 주인공을 만들어 새 캠페인을 시작한다. 주인공은 반드시 **레벨 1**로 시작하며(전직 없음·숙련 초보·레벨 1 일반 장비),
 * 선택한 고유 특성 하나를 지닌다(§2.1).
 */
export function newCampaign(setup: HeroSetup, rng: () => number = Math.random): Campaign {
  const heroKind = setup.heroKind;
  const hero = generateCharacter(heroKind, 1, {
    id: 'hero', name: setup.name, gender: setup.gender, armorKind: setup.armorKind, traitId: setup.traitId, rng,
  });
  const rolledRecruits = rollRecruits(0, 1, rng);
  const rolledShop = rollShop(1, rolledRecruits.nextId, rng);
  return {
    version: CAMPAIGN_VERSION,
    heroKind,
    round: 1,
    gold: 0,
    reputation: 0,
    roster: [hero],
    deployedIds: ['hero'],
    stash: { weapons: [], armor: [] },
    recruits: rolledRecruits.recruits,
    shop: rolledShop.shop,
    nextId: rolledShop.nextId,
    heroTraitCandidates: setup.traitCandidates,
  };
}

/** 튜토리얼 종료 후 특성 재확인(§43.13): 주인공 특성을 바꾸고 재확인 상태를 해제한다. */
export function confirmHeroTrait(campaign: Campaign, traitId: string): Campaign {
  return {
    ...campaign,
    roster: campaign.roster.map((c) => (c.id === 'hero' ? { ...c, traitId } : c)),
    heroTraitCandidates: undefined,
  };
}

/** 특성 재확인을 건너뛰고 현재 특성을 유지한다. */
export function dismissHeroTraitConfirm(campaign: Campaign): Campaign {
  return { ...campaign, heroTraitCandidates: undefined };
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
    rating: evaluateBattle(round, battle).rating,
    downedAllyIds: battle.teamA.filter((a) => a.currentHp <= 0).map((a) => a.id),
  };
}

/** 부상 치료(§42): 골드를 소모해 부상 상태를 해제한다(골드 부족·비부상 시 변화 없음). */
export function treatInjury(campaign: Campaign, charId: string): Campaign {
  const c = campaign.roster.find((x) => x.id === charId);
  if (!c || !c.injured) return campaign;
  const cost = treatmentCost(c.level);
  if (campaign.gold < cost) return campaign;
  return {
    ...campaign,
    gold: campaign.gold - cost,
    roster: campaign.roster.map((x) => (x.id === charId ? { ...x, injured: false } : x)),
  };
}

export interface SettleResult {
  campaign: Campaign;
  reputationGained: number;
  goldGained: number;
  newlyInjured: string[]; // 이번 전투로 부상당한 로스터 id(§42)
  fallenNames: string[]; // 이번 전투로 전사한 동료 이름(§42)
}

/** 전투 결과로 명성·골드를 정산하고 승리 시 라운드를 진행한다(라운드 진행 시 모집 후보 갱신). */
export function settleBattle(campaign: Campaign, outcome: BattleOutcome, rng: () => number = Math.random): SettleResult {
  // 전투 평가(§41) 등급 보너스를 기본 보상에 더한다.
  const bonus = ratingReward(outcome.rating);
  const reputationGained = roundReputationGain(outcome) + bonus.reputation;
  const goldGained = battleGold(outcome) + bonus.gold;
  const reputation = campaign.reputation + reputationGained;
  // 강화 재료: 승리 시 +1, 보스 처치 시 추가 +1(§32).
  const materialsGained = outcome.won ? 1 + (outcome.bossDefeated ? 1 : 0) : 0;
  // 사상자 처리(§42): 전투 불능 → 부상/전사, 생존한 부상자 회복(승패 무관).
  const casualties = applyCasualties(campaign, outcome.downedAllyIds ?? [], campaign.round);
  const next: Campaign = {
    ...campaign,
    reputation,
    gold: campaign.gold + goldGained,
    materials: (campaign.materials ?? 0) + materialsGained,
    round: outcome.won ? campaign.round + 1 : campaign.round,
    roster: casualties.roster,
    deployedIds: casualties.deployedIds,
    graveyard: casualties.graveyard,
  };
  // 승리로 라운드가 진행되면 새 명성 기준으로 모집 후보·상점 상품을 갱신(지나간 것은 사라진다).
  if (outcome.won) {
    const rolledRecruits = rollRecruits(reputation, campaign.nextId, rng);
    const rolledShop = rollShop(next.round, rolledRecruits.nextId, rng);
    next.recruits = rolledRecruits.recruits;
    next.shop = rolledShop.shop;
    next.nextId = rolledShop.nextId;
  }
  return {
    campaign: next,
    reputationGained,
    goldGained,
    newlyInjured: casualties.newlyInjured,
    fallenNames: casualties.fallen.map((f) => f.name),
  };
}
