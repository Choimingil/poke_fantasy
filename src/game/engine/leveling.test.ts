import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { grantXp, spendStatPoint, xpForKill, MAX_LEVEL, STAT_POINTS_PER_LEVEL } from './leveling';

function makeCharacter(level = 1) {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    level,
    baseStats: { hp: 5, attack: 5, magicAttack: 5, speed: 5, endurance: 5 },
    sight: 3,
    starterWeaponTemplateId: 'sword_short',
  });
}

describe('grantXp', () => {
  it('레벨업마다 능력치 포인트를 3점씩 지급한다(스탯을 직접 올리지 않음)', () => {
    const c = makeCharacter(1);
    const before = { ...c.baseStats };
    const results = grantXp(c, xpForKill(1) * 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].statPointsGained).toBe(STAT_POINTS_PER_LEVEL);
    expect(c.unspentStatPoints).toBe(results.length * STAT_POINTS_PER_LEVEL);
    expect(c.baseStats).toEqual(before); // 포인트만 쌓이고 스탯은 그대로
  });

  it('최대 레벨(100)을 넘어 레벨업하지 않는다', () => {
    const c = makeCharacter(MAX_LEVEL);
    const results = grantXp(c, 1_000_000);
    expect(results).toHaveLength(0);
    expect(c.level).toBe(MAX_LEVEL);
  });
});

describe('spendStatPoint', () => {
  it('포인트가 있으면 능력치를 1 올리고 포인트를 소모한다', () => {
    const c = makeCharacter(1);
    c.unspentStatPoints = 2;
    expect(spendStatPoint(c, 'attack')).toBe(true);
    expect(c.baseStats.attack).toBe(6);
    expect(c.unspentStatPoints).toBe(1);
  });

  it('포인트가 없으면 실패한다', () => {
    const c = makeCharacter(1);
    c.unspentStatPoints = 0;
    expect(spendStatPoint(c, 'attack')).toBe(false);
    expect(c.baseStats.attack).toBe(5);
  });
});
