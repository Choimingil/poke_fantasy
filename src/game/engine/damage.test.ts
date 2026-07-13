import { describe, expect, it } from 'vitest';
import { getJob } from '../data/jobs';
import { getSkill } from '../data/skills';
import { getWeapon } from '../data/weapons';
import { createCharacter } from './characterFactory';
import { calculateDamage } from './damage';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function makeAttacker() {
  return createCharacter({
    id: 'atk',
    name: '공격자',
    jobId: 'east_duelist',
    faction: 'east',
    stats: { attack: 50, defense: 30, hp: 100, speed: 20 },
    weapon: { templateId: 'sword_1h_east', enhancementLevel: 0 },
    skills: ['slash'],
  });
}

function makeDefender() {
  return createCharacter({
    id: 'def',
    name: '방어자',
    jobId: 'east_striker', // ranged job -> melee skill이 상성상 유리(2배)
    faction: 'east',
    stats: { attack: 40, defense: 30, hp: 100, speed: 15 },
    weapon: { templateId: 'bow_2h_east', enhancementLevel: 0 },
    skills: ['quick_shot'],
  });
}

describe('calculateDamage', () => {
  it('최소 데미지는 1 이상이다', () => {
    const attacker = makeAttacker();
    attacker.baseStats.attack = 1;
    const defender = makeDefender();
    defender.baseStats.defense = 999;
    const result = calculateDamage({
      attacker,
      attackerJob: getJob(attacker.jobId),
      defender,
      defenderJob: getJob(defender.jobId),
      skill: getSkill('slash'),
      weapon: getWeapon('sword_1h_east'),
      defendingTeamHasFieldGuard: false,
      rng: sequenceRng([0.99, 0.99, 0.5]),
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('상성상 유리(근거리->격수)하면 불리한 경우보다 데미지가 4배 더 크다(2배/0.5배 대비)', () => {
    const attacker = makeAttacker();
    const rangedDefender = makeDefender(); // ranged job: melee가 유리(2배)
    const magicDefender = createCharacter({
      id: 'def2', name: '마법방어자', jobId: 'east_shaman', faction: 'east',
      stats: { attack: 40, defense: 30, hp: 100, speed: 15 },
      weapon: { templateId: 'staff_2h_east', enhancementLevel: 0 }, skills: [],
    }); // magic job: melee가 불리(0.5배)

    const rng = sequenceRng([0.99, 0.99, 0.5]); // proc 미발동, crit 미발동, variance 중앙값
    const favorable = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender: rangedDefender, defenderJob: getJob(rangedDefender.jobId),
      skill: getSkill('slash'), weapon: getWeapon('sword_1h_east'), defendingTeamHasFieldGuard: false, rng,
    });
    const rng2 = sequenceRng([0.99, 0.99, 0.5]);
    const unfavorable = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender: magicDefender, defenderJob: getJob(magicDefender.jobId),
      skill: getSkill('slash'), weapon: getWeapon('sword_1h_east'), defendingTeamHasFieldGuard: false, rng: rng2,
    });

    expect(favorable.damage).toBeGreaterThan(unfavorable.damage * 3.5);
    expect(favorable.damage).toBeLessThan(unfavorable.damage * 4.5);
  });

  it('등장 중 딜반감 특성(장군/기사) 보유 시 최종 데미지가 0.75배가 된다', () => {
    const attacker = makeAttacker();
    const defender = makeDefender();
    const base = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender, defenderJob: getJob(defender.jobId),
      skill: getSkill('slash'), weapon: getWeapon('sword_1h_east'), defendingTeamHasFieldGuard: false,
      rng: sequenceRng([0.99, 0.99, 0.5]),
    });
    const guarded = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender, defenderJob: getJob(defender.jobId),
      skill: getSkill('slash'), weapon: getWeapon('sword_1h_east'), defendingTeamHasFieldGuard: true,
      rng: sequenceRng([0.99, 0.99, 0.5]),
    });
    expect(guarded.damage).toBeGreaterThan(base.damage * 0.7);
    expect(guarded.damage).toBeLessThan(base.damage * 0.8);
  });

  it('창/쇠뇌/지팡이류 무기는 관통 발동 시 방어력을 절반으로 낮춘다', () => {
    const attacker = makeAttacker();
    const defender = makeDefender();
    const noPierce = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender, defenderJob: getJob(defender.jobId),
      skill: getSkill('power_strike'), weapon: getWeapon('spear_2h_east'), defendingTeamHasFieldGuard: false,
      rng: sequenceRng([0.99, 0.99, 0.5]), // pierce roll 0.99 -> chance(0.3) 미만 아님 -> pierce 미발동
    });
    const pierce = calculateDamage({
      attacker, attackerJob: getJob(attacker.jobId), defender, defenderJob: getJob(defender.jobId),
      skill: getSkill('power_strike'), weapon: getWeapon('spear_2h_east'), defendingTeamHasFieldGuard: false,
      rng: sequenceRng([0.0, 0.99, 0.5]), // pierce roll 0.0 -> 발동
    });
    expect(pierce.damage).toBeGreaterThan(noPierce.damage);
  });
});
