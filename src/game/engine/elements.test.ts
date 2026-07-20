import { describe, expect, it } from 'vitest';
import { elementMultiplier, weaknessOf } from './elements';

describe('elementMultiplier', () => {
  it('공격 속성이 방어 속성에 강하면(유리) 1.3배', () => {
    // 순환: 불→나무→물→불
    expect(elementMultiplier('fire', 'wood')).toBe(1.3);
    expect(elementMultiplier('wood', 'water')).toBe(1.3);
    expect(elementMultiplier('water', 'fire')).toBe(1.3);
    // 추가 상성: 강철→불, 땅→강철, 나무→땅
    expect(elementMultiplier('steel', 'fire')).toBe(1.3);
    expect(elementMultiplier('earth', 'steel')).toBe(1.3);
    expect(elementMultiplier('wood', 'earth')).toBe(1.3);
  });

  it('방어 속성이 공격 속성에 강하면(불리) 0.7배', () => {
    expect(elementMultiplier('wood', 'fire')).toBe(0.7); // 불이 나무에 강함 → 나무 공격은 불리
    expect(elementMultiplier('fire', 'water')).toBe(0.7); // 물이 불에 강함
    expect(elementMultiplier('fire', 'steel')).toBe(0.7); // 강철이 불에 강함
    expect(elementMultiplier('steel', 'earth')).toBe(0.7); // 땅이 강철에 강함
    expect(elementMultiplier('earth', 'wood')).toBe(0.7); // 나무가 땅에 강함
  });

  it('무속성이 관여하면 항상 1배', () => {
    expect(elementMultiplier('none', 'fire')).toBe(1);
    expect(elementMultiplier('fire', 'none')).toBe(1);
    expect(elementMultiplier('none', 'none')).toBe(1);
  });

  it('상성 관계가 없는 조합은 1배', () => {
    expect(elementMultiplier('fire', 'earth')).toBe(1); // 불과 땅은 무관
    expect(elementMultiplier('water', 'steel')).toBe(1); // 물·강철은 서로 무관
    expect(elementMultiplier('steel', 'wood')).toBe(1);
  });
});

describe('weaknessOf', () => {
  it('해당 속성이 강점을 가지는(=상대가 약점을 갖는) 속성을 반환한다', () => {
    expect(weaknessOf('fire')).toBe('wood');
    expect(weaknessOf('wood')).toBe('water');
    expect(weaknessOf('water')).toBe('fire');
    expect(weaknessOf('steel')).toBe('fire');
    expect(weaknessOf('earth')).toBe('steel');
  });
});
