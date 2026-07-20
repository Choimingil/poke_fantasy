import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { maxHp } from './derivedStats';
import { effectiveBaseStat, carryCapacityTraitBonus } from './traitEffects';
import { rollHeroTraitCandidates, getTrait } from '../data/traits';

function mk(traitId?: string) {
  const c = createCharacter({
    id: 'c', name: 'c', level: 10,
    baseStats: { hp: 30, attack: 40, magicAttack: 10, speed: 20, endurance: 10 },
    sight: 5, starterWeaponTemplateId: 'sword_short',
  });
  c.traitId = traitId;
  return c;
}

describe('특성: 강인한 체질(toughness)', () => {
  it('최대 체력이 10% 증가한다', () => {
    const base = maxHp(mk());
    const tough = maxHp(mk('toughness'));
    expect(tough).toBe(Math.round(base * 1.1));
  });
});

describe('특성: 균형 감각(balance)', () => {
  it('가장 낮은 능력치를 +5로 판정한다(여기선 지력 10 → 15)', () => {
    const c = mk('balance');
    expect(effectiveBaseStat(c, 'magicAttack')).toBe(15); // 최저(지력 10)
    expect(effectiveBaseStat(c, 'attack')).toBe(40); // 최저 아님
  });
  it('특성이 없으면 원래 값', () => {
    expect(effectiveBaseStat(mk(), 'magicAttack')).toBe(10);
  });
});

describe('특성: 짐꾼(porter)', () => {
  it('적재량 보너스 +2', () => {
    expect(carryCapacityTraitBonus(mk('porter'))).toBe(2);
    expect(carryCapacityTraitBonus(mk())).toBe(0);
  });
});

describe('주인공 특성 후보 생성(§43.12)', () => {
  it('서로 다른 범주 버킷에서 3개를 뽑는다', () => {
    const seq = (() => { let i = 0; const v = [0.1, 0.5, 0.9, 0.2, 0.6, 0.3]; return () => v[i++ % v.length]; })();
    const cands = rollHeroTraitCandidates('sword', seq);
    expect(cands).toHaveLength(3);
    const cats = cands.map((id) => getTrait(id)!.category);
    // 버킷1: 공격/방어, 버킷2: 기동/지원/지휘, 버킷3: 성장/범용
    expect(['attack', 'defense']).toContain(cats[0]);
    expect(['mobility', 'support', 'command']).toContain(cats[1]);
    expect(['growth', 'utility']).toContain(cats[2]);
  });
});
