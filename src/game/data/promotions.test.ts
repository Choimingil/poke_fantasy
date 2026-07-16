import { describe, expect, it } from 'vitest';
import { createCharacter } from '../engine/characterFactory';
import { getUsableSkillIds, masteryTier, spendPromotion, MAX_TIER } from './promotions';

function makeSwordCharacter() {
  return createCharacter({
    id: 'c1',
    name: '검사',
    baseStats: { hp: 100, attack: 20, magicAttack: 5, defense: 10, speed: 10 },
    rawMove: 3,
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
}

describe('getUsableSkillIds', () => {
  it('티어 0에서는 공통 스킬만 사용 가능하다', () => {
    const c = makeSwordCharacter();
    const ids = getUsableSkillIds(c, 'sword');
    expect(ids).toContain('power_strike');
    expect(ids).not.toContain('sword_draw');
  });

  it('티어 2에서 초급 전용기술이 해금된다', () => {
    const c = makeSwordCharacter();
    c.weaponMastery.sword = 2;
    const ids = getUsableSkillIds(c, 'sword');
    expect(ids).toContain('sword_draw');
    expect(ids).not.toContain('sword_awaken');
    expect(ids).not.toContain('sword_flurry');
  });

  it('티어 4에서는 초급+중급이, 티어 6에서는 전부 해금된다', () => {
    const c = makeSwordCharacter();
    c.weaponMastery.sword = 4;
    let ids = getUsableSkillIds(c, 'sword');
    expect(ids).toContain('sword_draw');
    expect(ids).toContain('sword_awaken');
    expect(ids).not.toContain('sword_flurry');

    c.weaponMastery.sword = 6;
    ids = getUsableSkillIds(c, 'sword');
    expect(ids).toContain('sword_flurry');
  });
});

describe('spendPromotion', () => {
  it('보유한 전직 포인트가 없으면 실패한다', () => {
    const c = makeSwordCharacter();
    expect(spendPromotion(c, 'sword')).toBe(false);
  });

  it('전직 포인트를 소모해 해당 무기 종류의 티어를 1 올린다', () => {
    const c = makeSwordCharacter();
    c.unspentPromotions = 2;
    expect(spendPromotion(c, 'sword')).toBe(true);
    expect(masteryTier(c, 'sword')).toBe(1);
    expect(c.unspentPromotions).toBe(1);
  });

  it('MAX_TIER를 넘어서 승급할 수 없다', () => {
    const c = makeSwordCharacter();
    c.weaponMastery.sword = MAX_TIER;
    c.unspentPromotions = 1;
    expect(spendPromotion(c, 'sword')).toBe(false);
  });
});
