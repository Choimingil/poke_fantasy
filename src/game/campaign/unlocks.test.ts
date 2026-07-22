import { describe, expect, it } from 'vitest';
import { isUnlocked, unlockedThisRound } from './unlocks';

describe('초반 시스템 해금(§44)', () => {
  it('시스템은 지정 라운드부터 열린다', () => {
    expect(isUnlocked('recruit', 1)).toBe(false);
    expect(isUnlocked('recruit', 2)).toBe(true);
    expect(isUnlocked('shop', 2)).toBe(false);
    expect(isUnlocked('shop', 3)).toBe(true);
    expect(isUnlocked('enhance', 3)).toBe(false);
    expect(isUnlocked('enhance', 4)).toBe(true);
  });

  it('해당 라운드에 새로 열린 시스템을 알려준다', () => {
    expect(unlockedThisRound(2)).toEqual(['recruit']);
    expect(unlockedThisRound(3)).toEqual(['shop']);
    expect(unlockedThisRound(4)).toEqual(['enhance']);
    expect(unlockedThisRound(5)).toEqual([]);
  });
});
