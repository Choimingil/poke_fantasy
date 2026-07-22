import { describe, expect, it } from 'vitest';
import { getWeapon } from '../data/weapons';
import { meetsEquipLevel } from '../engine/equipment';
import { baseReputation, battleReputationBonus, roundReputationGain } from './reputation';
import { battleGold } from './gold';
import { generateCharacter } from './generateCharacter';
import { generateEnemyParty, themeForRound, enemyCountForRound, isBossRound } from './enemyParty';
import { newCampaign, settleBattle } from './state';
const hs = (heroKind: import('../types').WeaponKind) => ({ heroKind, name: '주인공', gender: 'male' as const, armorKind: 'cloth' as const, traitId: 'toughness', traitCandidates: [] as string[] });
import type { BattleOutcome } from './types';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('명성', () => {
  it('기본 명성은 라운드마다 10씩 증가한다(1R=0, 2R=10, 3R=20)', () => {
    expect(baseReputation(1)).toBe(0);
    expect(baseReputation(2)).toBe(10);
    expect(baseReputation(3)).toBe(20);
  });

  it('성과 보너스: 적 전멸 +20, 아군 생존 ×5, 보스 처치 +50', () => {
    expect(battleReputationBonus({ round: 1, won: true, enemiesDefeated: 3, allySurvivors: 2, bossDefeated: false, rating: null })).toBe(20 + 10);
    expect(battleReputationBonus({ round: 5, won: true, enemiesDefeated: 4, allySurvivors: 1, bossDefeated: true, rating: null })).toBe(20 + 5 + 50);
  });

  it('패배 시 라운드 명성은 0이다', () => {
    expect(roundReputationGain({ round: 3, won: false, enemiesDefeated: 1, allySurvivors: 0, bossDefeated: false, rating: null })).toBe(0);
  });
});

describe('골드', () => {
  it('처치당 +10, 승리 시 라운드×20, 보스 +100', () => {
    expect(battleGold({ round: 3, won: true, enemiesDefeated: 2, allySurvivors: 1, bossDefeated: false, rating: null })).toBe(20 + 60);
    expect(battleGold({ round: 5, won: true, enemiesDefeated: 4, allySurvivors: 1, bossDefeated: true, rating: null })).toBe(40 + 100 + 100);
    expect(battleGold({ round: 2, won: false, enemiesDefeated: 1, allySurvivors: 0, bossDefeated: false, rating: null })).toBe(10);
  });
});

describe('settleBattle', () => {
  const base = newCampaign(hs('sword'), seq([0.5]));
  it('승리 시 라운드 진행 + 명성·골드 증가', () => {
    const outcome: BattleOutcome = { round: 1, won: true, enemiesDefeated: 2, allySurvivors: 1, bossDefeated: false, rating: null };
    const { campaign, reputationGained, goldGained } = settleBattle(base, outcome);
    expect(campaign.round).toBe(2);
    expect(reputationGained).toBe(0 + 20 + 5); // base0 + 전멸20 + 생존1×5
    expect(goldGained).toBe(20 + 20);
    expect(campaign.reputation).toBe(25);
  });

  it('패배 시 라운드 유지', () => {
    const outcome: BattleOutcome = { round: 1, won: false, enemiesDefeated: 1, allySurvivors: 0, bossDefeated: false, rating: null };
    const { campaign } = settleBattle(base, outcome);
    expect(campaign.round).toBe(1);
  });
});

describe('generateCharacter', () => {
  it('능력치 합 = 25 + (level-1)*3, 무기·방어구 장착 가능', () => {
    for (const level of [5, 12, 30]) {
      const c = generateCharacter('bow', level, { id: 'x', name: 't', rng: seq([0.3, 0.7, 0.1]) });
      const sum = c.baseStats.hp + c.baseStats.attack + c.baseStats.magicAttack + c.baseStats.speed + c.baseStats.endurance;
      expect(sum).toBe(25 + (level - 1) * 3);
      const w = c.inventory.find((i) => i.instanceId === c.equippedWeaponId)!;
      expect(getWeapon(w.templateId).kind).toBe('bow');
      expect(meetsEquipLevel(c, w.level)).toBe(true);
    }
  });

  it('마법 직업은 지력이 주스탯이다', () => {
    const mage = generateCharacter('staff', 20, { id: 'm', name: 'm', rng: seq([0.2]) });
    expect(mage.baseStats.magicAttack).toBeGreaterThan(mage.baseStats.attack);
    const w = mage.inventory.find((i) => i.instanceId === mage.equippedWeaponId)!;
    expect(w.element).toBeDefined(); // 지팡이는 속성 보유
  });
});

describe('적 파티 생성', () => {
  it('테마는 라운드로 결정되고, 인원은 라운드에 따라 증가한다', () => {
    expect(themeForRound(1)).toBe('spear');
    const { units, theme } = generateEnemyParty(3, seq([0.5]));
    expect(theme).toBe(themeForRound(3));
    expect(units.length).toBe(enemyCountForRound(3));
  });

  it('보스 라운드에는 isBoss 유닛이 정확히 1명 등장한다', () => {
    expect(isBossRound(5)).toBe(true);
    const { units } = generateEnemyParty(5, seq([0.5]));
    expect(units.filter((u) => u.isBoss).length).toBe(1);
    const boss = units.find((u) => u.isBoss)!;
    const minion = units.find((u) => !u.isBoss)!;
    expect(boss.baseStats.hp).toBeGreaterThan(minion.baseStats.hp);
  });

  it('일반 라운드에는 보스가 없다', () => {
    const { units } = generateEnemyParty(3, seq([0.5]));
    expect(units.some((u) => u.isBoss)).toBe(false);
  });
});

describe('newCampaign', () => {
  it('주인공 1명, 라운드 1, 자원 0으로 시작한다', () => {
    const c = newCampaign(hs('dagger'), seq([0.5]));
    expect(c.roster).toHaveLength(1);
    expect(c.roster[0].id).toBe('hero');
    expect(c.round).toBe(1);
    expect(c.gold).toBe(0);
    expect(c.reputation).toBe(0);
    expect(c.deployedIds).toEqual(['hero']);
  });
});
