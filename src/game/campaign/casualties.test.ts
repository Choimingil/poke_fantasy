import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { createCharacter } from '../engine/characterFactory';
import { maxHp, INJURED_HP_MULT } from '../engine/derivedStats';
import type { Campaign } from './types';
import { applyCasualties, treatmentCost } from './casualties';

function unit(id: string, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({ id, name: id, baseStats: { hp: 30, attack: 20, magicAttack: 5, speed: 10, endurance: 10 }, sight: 6, starterWeaponTemplateId: 'sword_short' });
  return { ...c, ...overrides };
}

function campaignWith(roster: Character[], deployedIds: string[], extra: Partial<Campaign> = {}): Campaign {
  return {
    version: 1, heroKind: 'sword', round: 3, gold: 100, reputation: 0,
    roster, deployedIds, stash: { weapons: [], armor: [] }, recruits: [], shop: [], nextId: 1,
    ...extra,
  };
}

describe('사상자 처리(§42)', () => {
  it('성한 동료가 전투 불능이면 부상 상태가 된다', () => {
    const hero = unit('hero');
    const ally = unit('a1');
    const camp = campaignWith([hero, ally], ['hero', 'a1']);
    const r = applyCasualties(camp, ['a1'], 3);
    expect(r.newlyInjured).toEqual(['a1']);
    expect(r.roster.find((c) => c.id === 'a1')?.injured).toBe(true);
    expect(r.fallen).toHaveLength(0);
  });

  it('부상 상태에서 다시 전투 불능이면 전사(묘지)한다', () => {
    const ally = unit('a1', { injured: true });
    const camp = campaignWith([unit('hero'), ally], ['hero', 'a1']);
    const r = applyCasualties(camp, ['a1'], 4);
    expect(r.fallen.map((f) => f.id)).toEqual(['a1']);
    expect(r.graveyard.map((f) => f.id)).toEqual(['a1']);
    expect(r.roster.find((c) => c.id === 'a1')).toBeUndefined();
    expect(r.deployedIds).not.toContain('a1');
  });

  it('주인공은 부상 상태에서 전투 불능이어도 전사하지 않는다', () => {
    const hero = unit('hero', { injured: true });
    const camp = campaignWith([hero, unit('a1')], ['hero', 'a1']);
    const r = applyCasualties(camp, ['hero'], 5);
    expect(r.fallen).toHaveLength(0);
    expect(r.roster.find((c) => c.id === 'hero')?.injured).toBe(true);
  });

  it('출전해 살아남은 부상자는 회복한다', () => {
    const ally = unit('a1', { injured: true });
    const camp = campaignWith([unit('hero'), ally], ['hero', 'a1']);
    const r = applyCasualties(camp, [], 3); // 아무도 쓰러지지 않음
    expect(r.recovered).toEqual(['a1']);
    expect(r.roster.find((c) => c.id === 'a1')?.injured).toBe(false);
  });

  it('출전하지 않은 부상자는 부상을 유지한다', () => {
    const benched = unit('a2', { injured: true });
    const camp = campaignWith([unit('hero'), benched], ['hero']);
    const r = applyCasualties(camp, [], 3);
    expect(r.recovered).toHaveLength(0);
    expect(r.roster.find((c) => c.id === 'a2')?.injured).toBe(true);
  });

  it('부상 시 최대 체력이 감소한다', () => {
    const healthy = unit('a1');
    const injured = unit('a1', { injured: true });
    expect(maxHp(injured)).toBeLessThan(maxHp(healthy));
    expect(maxHp(injured)).toBe(Math.max(1, Math.round(maxHp(healthy) * INJURED_HP_MULT)));
  });

  it('치료 비용은 레벨에 비례한다', () => {
    expect(treatmentCost(5)).toBeGreaterThan(treatmentCost(1));
  });
});
