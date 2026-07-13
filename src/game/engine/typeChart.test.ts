import { describe, expect, it } from 'vitest';
import { getJob } from '../data/jobs';
import { getSkill } from '../data/skills';
import { stabMultiplier, typeAdvantageMultiplier } from './typeChart';

describe('typeAdvantageMultiplier', () => {
  it('전사(근거리) > 격수(원거리) > 법사(마법) > 전사 순환 상성을 따른다', () => {
    expect(typeAdvantageMultiplier('melee', 'ranged')).toBe(2);
    expect(typeAdvantageMultiplier('ranged', 'magic')).toBe(2);
    expect(typeAdvantageMultiplier('magic', 'melee')).toBe(2);
  });

  it('역상성일 경우 0.5배를 반환한다', () => {
    expect(typeAdvantageMultiplier('ranged', 'melee')).toBe(0.5);
    expect(typeAdvantageMultiplier('magic', 'ranged')).toBe(0.5);
    expect(typeAdvantageMultiplier('melee', 'magic')).toBe(0.5);
  });

  it('같은 타입이면 1배(무관)를 반환한다', () => {
    expect(typeAdvantageMultiplier('melee', 'melee')).toBe(1);
  });
});

describe('stabMultiplier', () => {
  it('직업 타입과 스킬 타입이 일치하면 1.5배', () => {
    const job = getJob('east_general'); // melee, 특성: onFieldDamageReduction (파워부스트 없음)
    const meleeSkill = getSkill('slash');
    expect(stabMultiplier(job, meleeSkill)).toBe(1.5);
  });

  it('타입이 일치하지 않으면 1배', () => {
    const job = getJob('east_general'); // melee
    const magicSkill = getSkill('fire_bolt');
    expect(stabMultiplier(job, magicSkill)).toBe(1);
  });

  it('협객(meleePowerBoost)은 근거리 자속이 2배로 강화된다', () => {
    const duelist = getJob('east_duelist');
    const meleeSkill = getSkill('slash');
    expect(stabMultiplier(duelist, meleeSkill)).toBe(2);
  });

  it('주술사(magicPowerBoost)는 마법 자속만 2배이고 다른 타입은 영향 없다', () => {
    const shaman = getJob('east_shaman'); // type: magic
    expect(stabMultiplier(shaman, getSkill('fire_bolt'))).toBe(2);
  });
});
