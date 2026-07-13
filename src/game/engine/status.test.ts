import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { tickStatusAtTurnStart, tryApplyStatus } from './status';

function makeCharacter() {
  return createCharacter({
    id: 'c1',
    name: '테스터',
    jobId: 'east_general',
    faction: 'east',
    stats: { attack: 10, defense: 10, hp: 160, speed: 10 },
    weapon: { templateId: 'sword_1h_east', enhancementLevel: 0 },
    skills: [],
  });
}

describe('tryApplyStatus', () => {
  it('rng가 확률보다 낮으면 상태이상이 적용된다', () => {
    const character = makeCharacter();
    const applied = tryApplyStatus(character, 'poison', 0.5, () => 0.1);
    expect(applied).toBe(true);
    expect(character.statusEffects).toHaveLength(1);
  });

  it('rng가 확률보다 높으면 적용되지 않는다', () => {
    const character = makeCharacter();
    const applied = tryApplyStatus(character, 'poison', 0.5, () => 0.9);
    expect(applied).toBe(false);
    expect(character.statusEffects).toHaveLength(0);
  });

  it('방어구 강화도가 높을수록 상태이상 적용 확률이 낮아진다', () => {
    const character = makeCharacter();
    character.armorEnhancementLevel = 10; // 저항 50% (5%*10)
    const applied = tryApplyStatus(character, 'poison', 0.5, () => 0.3); // 원래 확률 0.5 -> 저항 후 0.25, rng 0.3은 적용 실패해야 함
    expect(applied).toBe(false);
  });
});

describe('tickStatusAtTurnStart', () => {
  it('중독 상태는 매 턴 최대체력의 1/16만큼 도트 데미지를 준다', () => {
    const character = makeCharacter();
    character.statusEffects.push({ effect: 'poison', turnsRemaining: 2 });
    const result = tickStatusAtTurnStart(character);
    expect(result.dotDamage).toBe(10); // 160/16 = 10
    expect(character.currentHp).toBe(150);
  });

  it('수면/기절 상태는 해당 턴 행동을 불가능하게 하고 1턴 후 해제된다', () => {
    const character = makeCharacter();
    character.statusEffects.push({ effect: 'sleep', turnsRemaining: 1 });
    const result = tickStatusAtTurnStart(character);
    expect(result.skipTurn).toBe(true);
    expect(result.expired).toContain('sleep');
    expect(character.statusEffects).toHaveLength(0);
  });
});
