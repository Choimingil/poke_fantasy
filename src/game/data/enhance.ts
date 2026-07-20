/** 장비 강화(§32): 실패·파괴 없음. 최대 강화 단계는 5로 제한한다. */
export const MAX_ENHANCE = 5;

/**
 * 강화된 스탯 값. 강화로 늘어나는 총량은 "같은 레벨 최대 강화 ≈ 다음 단계(레벨+10) 무강화"가 되도록,
 * `nextTierBase − base`를 5단계에 걸쳐 선형 가산한다. 수리공 특성이면 늘어난 수치만 +10%.
 */
export function enhancedValue(base: number, nextTierBase: number, enhanceLevel: number, repairer = false): number {
  const steps = Math.max(0, Math.min(MAX_ENHANCE, enhanceLevel));
  const added = (steps / MAX_ENHANCE) * (nextTierBase - base) * (repairer ? 1.1 : 1);
  return base + added;
}

/** 무기 강화에 따른 숙련도 경험치 획득 배수(단계당 +3%, 최대 +15%). */
export function weaponEnhanceExpMult(enhanceLevel: number): number {
  return 1 + Math.max(0, Math.min(MAX_ENHANCE, enhanceLevel)) * 0.03;
}

/** 다음 강화 1단계 비용(골드 + 재료). 절약가 특성이면 골드 15% 감소. */
export function enhanceCost(level: number, enhanceLevel: number, thrifty = false): { gold: number; materials: number } {
  const gold = Math.round(level * 6 * (enhanceLevel + 1) * (thrifty ? 0.85 : 1));
  const materials = 1 + Math.floor(enhanceLevel / 2);
  return { gold, materials };
}
