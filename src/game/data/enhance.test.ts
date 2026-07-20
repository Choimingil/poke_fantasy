import { describe, expect, it } from 'vitest';
import { MAX_ENHANCE, enhancedValue, enhanceCost, weaponEnhanceExpMult } from './enhance';
import { weaponPower } from './weapons';

describe('장비 강화(§32)', () => {
  it('최대 강화 시 값이 다음 단계(레벨+10) 무강화와 같아진다', () => {
    const base = weaponPower(20, 'sword'); // 10
    const next = weaponPower(30, 'sword'); // 15
    expect(enhancedValue(base, next, MAX_ENHANCE)).toBeCloseTo(next);
    expect(enhancedValue(base, next, 0)).toBe(base);
  });

  it('수리공 특성은 늘어난 수치를 10% 더 준다', () => {
    const base = 10, next = 15;
    const normal = enhancedValue(base, next, MAX_ENHANCE, false);
    const repaired = enhancedValue(base, next, MAX_ENHANCE, true);
    expect(repaired).toBeGreaterThan(normal);
  });

  it('강화 비용은 단계가 오를수록 증가하고, 절약가는 골드가 싸다', () => {
    expect(enhanceCost(20, 1).gold).toBeGreaterThan(enhanceCost(20, 0).gold);
    expect(enhanceCost(20, 0, true).gold).toBeLessThan(enhanceCost(20, 0, false).gold);
  });

  it('무기 강화는 숙련 경험치 배수를 올린다(최대 +15%)', () => {
    expect(weaponEnhanceExpMult(0)).toBe(1);
    expect(weaponEnhanceExpMult(MAX_ENHANCE)).toBeCloseTo(1.15);
  });
});
