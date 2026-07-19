import { describe, expect, it } from 'vitest';
import { getSkill, skillTypeLabel } from './skills';

describe('skillTypeLabel', () => {
  it('주술 + 지팡이·마법서 전용 기술은 마법', () => {
    expect(skillTypeLabel(getSkill('incantation'))).toBe('마법');
    expect(skillTypeLabel(getSkill('staff_bolt'))).toBe('마법');
    expect(skillTypeLabel(getSkill('staff_weaken'))).toBe('마법'); // 위력 없어도 지팡이 전용이면 마법
    expect(skillTypeLabel(getSkill('tome_heal'))).toBe('마법');
  });

  it('그 외 위력이 있는 기술은 물리(고정 피해 포함)', () => {
    expect(skillTypeLabel(getSkill('power_strike'))).toBe('물리');
    expect(skillTypeLabel(getSkill('fist'))).toBe('물리');
    expect(skillTypeLabel(getSkill('rockfall'))).toBe('물리');
    expect(skillTypeLabel(getSkill('bow_skyshot'))).toBe('물리');
    expect(skillTypeLabel(getSkill('xbow_lethal'))).toBe('물리'); // 고정 피해도 물리
  });

  it('그 외 위력이 없는 기술은 변화', () => {
    expect(skillTypeLabel(getSkill('protect'))).toBe('변화');
    expect(skillTypeLabel(getSkill('taunt'))).toBe('변화');
    expect(skillTypeLabel(getSkill('far_sight'))).toBe('변화');
    expect(skillTypeLabel(getSkill('spear_lock'))).toBe('변화');
  });
});
