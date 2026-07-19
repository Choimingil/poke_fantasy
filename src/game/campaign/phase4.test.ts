import { describe, expect, it } from 'vitest';
import { enemyStatMult, generateEnemyParty } from './enemyParty';
import { generateCharacter } from './generateCharacter';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('후반 스케일', () => {
  it('8라운드까지는 스케일이 1, 이후 라운드당 증가한다', () => {
    expect(enemyStatMult(1)).toBe(1);
    expect(enemyStatMult(8)).toBe(1);
    expect(enemyStatMult(9)).toBeGreaterThan(1);
    expect(enemyStatMult(12)).toBeGreaterThan(enemyStatMult(9));
  });

  it('statMult가 능력치를 키운다(같은 시드·레벨·직업)', () => {
    const base = generateCharacter('sword', 20, { id: 'a', name: 'a', rng: seq([0.3]) });
    const scaled = generateCharacter('sword', 20, { id: 'b', name: 'b', rng: seq([0.3]), statMult: 1.5 });
    expect(scaled.baseStats.hp).toBeGreaterThan(base.baseStats.hp);
    expect(scaled.baseStats.attack).toBeGreaterThan(base.baseStats.attack);
  });

  it('후반 라운드 적이 초반 라운드 적보다 강하다(레벨·스케일)', () => {
    const early = generateEnemyParty(2, seq([0.5]));
    const late = generateEnemyParty(12, seq([0.5]));
    const avgHp = (us: { baseStats: { hp: number } }[]) => us.reduce((s, u) => s + u.baseStats.hp, 0) / us.length;
    expect(avgHp(late.units)).toBeGreaterThan(avgHp(early.units));
  });
});
