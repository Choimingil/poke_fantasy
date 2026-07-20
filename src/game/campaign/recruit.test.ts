import { describe, expect, it } from 'vitest';
import { qualityForReputation, recruitCost, rollRecruits } from './recruit';
import { newCampaign, recruitFromCandidate } from './state';
const hs = (heroKind: import('../types').WeaponKind) => ({ heroKind, name: '주인공', gender: 'male' as const, armorKind: 'cloth' as const, traitId: 'toughness', traitCandidates: [] as string[] });

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('qualityForReputation 경계', () => {
  it('0/20/50/100 경계에서 등급이 바뀐다', () => {
    expect(qualityForReputation(0)).toBe('recruit');
    expect(qualityForReputation(19)).toBe('recruit');
    expect(qualityForReputation(20)).toBe('veteran');
    expect(qualityForReputation(49)).toBe('veteran');
    expect(qualityForReputation(50)).toBe('elite');
    expect(qualityForReputation(99)).toBe('elite');
    expect(qualityForReputation(100)).toBe('hero');
  });
});

describe('rollRecruits', () => {
  it('3~5명, 고유 id, 명성 등급에 맞는 품질로 생성한다', () => {
    const { recruits, nextId } = rollRecruits(60, 1, seq([0.5, 0.2, 0.8, 0.1, 0.9, 0.4, 0.3]));
    expect(recruits.length).toBeGreaterThanOrEqual(3);
    expect(recruits.length).toBeLessThanOrEqual(5);
    const ids = recruits.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // 고유
    expect(recruits.every((r) => r.quality === 'elite')).toBe(true); // 명성 60 → 엘리트
    expect(nextId).toBe(1 + recruits.length);
    expect(recruits.every((r) => r.cost > 0)).toBe(true);
  });

  it('모집 비용은 품질이 높을수록 비싸다', () => {
    expect(recruitCost(10, 'recruit')).toBeLessThan(recruitCost(10, 'hero'));
  });
});

describe('recruitFromCandidate', () => {
  it('골드가 충분하면 로스터에 추가하고 골드를 차감·후보를 제거한다', () => {
    let c = newCampaign(hs('sword'), seq([0.5]));
    c = { ...c, gold: 10000 };
    const cand = c.recruits[0];
    const before = c.roster.length;
    const after = recruitFromCandidate(c, cand.id);
    expect(after.roster.length).toBe(before + 1);
    expect(after.roster.some((u) => u.id === cand.character.id)).toBe(true);
    expect(after.gold).toBe(10000 - cand.cost);
    expect(after.recruits.some((r) => r.id === cand.id)).toBe(false);
  });

  it('골드가 부족하면 모집되지 않는다', () => {
    let c = newCampaign(hs('sword'), seq([0.5]));
    c = { ...c, gold: 0 };
    const cand = c.recruits[0];
    const after = recruitFromCandidate(c, cand.id);
    expect(after).toBe(c); // 변화 없음
  });
});
