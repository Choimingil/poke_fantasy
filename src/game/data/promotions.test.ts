import { describe, expect, it } from 'vitest';
import { createCharacter } from '../engine/characterFactory';
import { getBattleSkillIds, getUsableSkillIds, masteryTier, spendPromotion, MAX_TIER } from './promotions';

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

describe('getUsableSkillIds - 주먹(폴백)', () => {
  it('선택 목록에는 주먹이 노출되지 않는다', () => {
    const c = makeSwordCharacter();
    expect(getUsableSkillIds(c, 'sword')).not.toContain('fist');
  });
});

describe('getBattleSkillIds', () => {
  it('사용 가능한 로드아웃 스킬이 있으면 그대로 반환한다', () => {
    const c = makeSwordCharacter();
    c.skillLoadout = ['power_strike', 'protect'];
    const ids = getBattleSkillIds(c, 'sword', () => true);
    expect(ids).toEqual(['power_strike', 'protect']);
    expect(ids).not.toContain('fist');
  });

  it('사용 가능한 스킬이 하나도 없으면 주먹으로 대체된다', () => {
    const c = makeSwordCharacter();
    c.skillLoadout = ['power_strike'];
    // 모든 스킬이 사용 불가(횟수 소진 등)인 상황을 흉내
    const ids = getBattleSkillIds(c, 'sword', () => false);
    expect(ids).toEqual(['fist']);
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
