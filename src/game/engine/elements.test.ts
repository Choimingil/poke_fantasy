import { describe, expect, it } from 'vitest';
import { elementMultiplier, weaknessOf } from './elements';

describe('elementMultiplier', () => {
  it('공격 속성이 방어 속성을 이기면(=방어측이 약점) 1.3배', () => {
    expect(elementMultiplier('fire', 'earth')).toBe(1.3);
    expect(elementMultiplier('earth', 'steel')).toBe(1.3);
    expect(elementMultiplier('steel', 'wood')).toBe(1.3);
    expect(elementMultiplier('wood', 'water')).toBe(1.3);
    expect(elementMultiplier('water', 'fire')).toBe(1.3);
  });

  it('방어 속성이 공격 속성을 이기면(=방어측이 강점) 0.7배', () => {
    expect(elementMultiplier('earth', 'fire')).toBe(0.7);
    expect(elementMultiplier('fire', 'water')).toBe(0.7);
  });

  it('무속성이 관여하면 항상 1배', () => {
    expect(elementMultiplier('none', 'fire')).toBe(1);
    expect(elementMultiplier('fire', 'none')).toBe(1);
    expect(elementMultiplier('none', 'none')).toBe(1);
  });

  it('상성 관계가 없는 조합은 1배', () => {
    expect(elementMultiplier('fire', 'steel')).toBe(1);
  });
});

describe('weaknessOf', () => {
  it('해당 속성이 이기는(=상대가 약점을 갖는) 속성을 반환한다', () => {
    expect(weaknessOf('fire')).toBe('earth');
    expect(weaknessOf('earth')).toBe('steel');
    expect(weaknessOf('steel')).toBe('wood');
    expect(weaknessOf('wood')).toBe('water');
    expect(weaknessOf('water')).toBe('fire');
  });
});
