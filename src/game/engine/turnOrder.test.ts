import { describe, expect, it } from 'vitest';
import { getJob } from '../data/jobs';
import { getSkill } from '../data/skills';
import { createCharacter } from './characterFactory';
import { determineTurnOrder, type TurnCandidate } from './turnOrder';

function makeCandidate(overrides: {
  id: string;
  speed: number;
  weaponSpeed: number;
  jobId: string;
  skillId: string;
  hp?: number;
  maxHp?: number;
  paralyzed?: boolean;
}): TurnCandidate {
  const character = createCharacter({
    id: overrides.id,
    name: overrides.id,
    jobId: overrides.jobId,
    faction: 'east',
    stats: { attack: 10, defense: 10, hp: overrides.maxHp ?? 100, speed: overrides.speed },
    weapon: { templateId: 'sword_1h_east', enhancementLevel: 0 },
    skills: [],
  });
  character.currentHp = overrides.hp ?? character.baseStats.hp;
  if (overrides.paralyzed) character.statusEffects.push({ effect: 'paralysis', turnsRemaining: 3 });
  return {
    characterId: character.id,
    character,
    job: getJob(overrides.jobId),
    skill: getSkill(overrides.skillId),
    weaponSpeed: overrides.weaponSpeed,
  };
}

describe('determineTurnOrder', () => {
  it('직업 스피드 + 무기 스피드 합산치가 높은 쪽이 먼저 행동한다', () => {
    const fast = makeCandidate({ id: 'fast', speed: 30, weaponSpeed: 20, jobId: 'east_general', skillId: 'slash' });
    const slow = makeCandidate({ id: 'slow', speed: 10, weaponSpeed: 5, jobId: 'east_general', skillId: 'slash' });
    const order = determineTurnOrder([slow, fast]);
    expect(order.map((c) => c.characterId)).toEqual(['fast', 'slow']);
  });

  it('스킬 우선도가 스피드보다 우선한다', () => {
    const slowButPriority = makeCandidate({ id: 'priority', speed: 1, weaponSpeed: 1, jobId: 'east_general', skillId: 'guard' });
    const fast = makeCandidate({ id: 'fast', speed: 100, weaponSpeed: 100, jobId: 'east_general', skillId: 'slash' });
    const order = determineTurnOrder([fast, slowButPriority]);
    expect(order[0].characterId).toBe('priority');
  });

  it('마비 상태는 스피드를 절반으로 낮춘다', () => {
    const paralyzed = makeCandidate({ id: 'paralyzed', speed: 100, weaponSpeed: 0, jobId: 'east_general', skillId: 'slash', paralyzed: true });
    const normal = makeCandidate({ id: 'normal', speed: 60, weaponSpeed: 0, jobId: 'east_general', skillId: 'slash' });
    const order = determineTurnOrder([paralyzed, normal]);
    expect(order.map((c) => c.characterId)).toEqual(['normal', 'paralyzed']);
  });

  it('동양 궁수는 체력이 가득 찼을 때만 원거리 공격 우선도가 +1 된다', () => {
    const fullHpArcher = makeCandidate({
      id: 'archer_full', speed: 5, weaponSpeed: 5, jobId: 'east_archer', skillId: 'quick_shot', hp: 100, maxHp: 100,
    });
    const fasterOther = makeCandidate({ id: 'other', speed: 50, weaponSpeed: 50, jobId: 'east_general', skillId: 'slash' });
    const order = determineTurnOrder([fasterOther, fullHpArcher]);
    expect(order[0].characterId).toBe('archer_full');

    const hurtArcher = makeCandidate({
      id: 'archer_hurt', speed: 5, weaponSpeed: 5, jobId: 'east_archer', skillId: 'quick_shot', hp: 50, maxHp: 100,
    });
    const order2 = determineTurnOrder([fasterOther, hurtArcher]);
    expect(order2[0].characterId).toBe('other');
  });
});
