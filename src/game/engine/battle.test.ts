import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter, prepareForBattle } from './characterFactory';
import { GridBattle } from './battle';

function makeMap(): BattleMap {
  const tiles = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) row.push({ terrain: 'plain' as const });
    tiles.push(row);
  }
  return { width: 5, height: 5, tiles };
}

function makeUnit(id: string, speed: number, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id,
    name: id,
    baseStats: { hp: 100, attack: 50, magicAttack: 10, defense: 10, speed },
    rawMove: 2,
    sight: 5,
    starterWeaponTemplateId: 'sword_short',
  });
  return { ...c, ...overrides };
}

describe('GridBattle', () => {
  it('사거리 내 적에게 공격 스킬을 사용하면 데미지를 입힌다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 10);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.5);

    expect(battle.currentUnit()?.id).toBe('a');
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(b.currentHp).toBeLessThan(100);
  });

  it('보호: 마름모 1칸(직교 인접) 아군을 향한 공격을 시전자가 대신 받는다', () => {
    const map = makeMap();
    const guardian = makeUnit('guardian', 30);
    const ally = makeUnit('ally', 20);
    const enemy = makeUnit('enemy', 99); // 가장 빠름
    prepareForBattle(guardian, { x: 1, y: 1 }, 'A');
    prepareForBattle(ally, { x: 1, y: 2 }, 'A'); // 직교 인접(맨해튼 1)
    prepareForBattle(enemy, { x: 1, y: 3 }, 'B'); // ally 바로 아래
    const battle = new GridBattle(map, [guardian, ally], [enemy], () => 0);
    guardian.statusEffects.push({ type: 'guarding', turnsRemaining: 2, magnitude: 1 });

    battle.takeTurn({ skillId: 'power_strike', targetId: 'ally' }); // 적이 ally 공격
    expect(ally.currentHp).toBe(100); // ally는 무피해
    expect(guardian.currentHp).toBeLessThan(100); // 시전자가 대신 받음
  });

  it('사거리 밖의 적은 공격할 수 없다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 10);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 4, y: 4 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(b.currentHp).toBe(100);
  });

  it('이동 예산을 벗어난 타일로는 이동할 수 없다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20, { rawMove: 2 });
    const b = makeUnit('b', 10);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 4, y: 4 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ moveTo: { x: 4, y: 0 } }); // 거리 4 > 이동력 2
    expect(a.position).toEqual({ x: 0, y: 0 });
  });

  it('무기 교체는 티어3 미만이면 턴을 소모한다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 5);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    const bowInstance = a.inventory.find((w) => w.templateId === 'bow_short');
    expect(bowInstance).toBeUndefined(); // sword_short 캐릭터는 활을 갖고 있지 않음 - 인벤토리에 추가로 넣어 테스트
    a.inventory.push({ instanceId: 'a-bow', templateId: 'bow_short', level: 10 });

    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ switchWeaponTo: 'a-bow' });
    expect(a.equippedWeaponId).toBe('a-bow');
    // 턴을 소모했으므로 다음 차례는 b여야 한다
    expect(battle.currentUnit()?.id).toBe('b');
  });

  it('무기 교체는 티어3 이상이면 턴을 소모하지 않고 같은 턴에 스킬도 쓸 수 있다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 5);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    a.inventory.push({ instanceId: 'a-bow', templateId: 'bow_short', level: 10 });
    a.weaponMastery.bow = 3;

    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ switchWeaponTo: 'a-bow', skillId: 'power_strike', targetId: 'b' });
    expect(a.equippedWeaponId).toBe('a-bow');
    expect(b.currentHp).toBeLessThan(100); // 같은 턴에 공격까지 적중
  });

  it('처치 시 처치한 캐릭터만 경험치를 얻는다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20, { baseStats: { hp: 100, attack: 500, magicAttack: 10, defense: 10, speed: 20 } });
    const b = makeUnit('b', 5, { baseStats: { hp: 10, attack: 5, magicAttack: 5, defense: 1, speed: 5 } });
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.01);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(b.currentHp).toBe(0);
    expect(battle.killEvents).toEqual([{ killerId: 'a', victimId: 'b' }]);
    expect(a.xp).toBeGreaterThan(0);
  });

  it('한 팀의 유닛이 모두 쓰러지면 전투가 종료되고 승자가 기록된다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20, { baseStats: { hp: 100, attack: 500, magicAttack: 10, defense: 10, speed: 20 } });
    const b = makeUnit('b', 5, { baseStats: { hp: 10, attack: 5, magicAttack: 5, defense: 1, speed: 5 } });
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.01);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(battle.finished).toBe(true);
    expect(battle.winner).toBe('A');
  });

  it('보호 상태의 아군이 근처에 있으면 공격이 그 아군에게 대신 향한다', () => {
    const map = makeMap();
    const a = makeUnit('a', 30);
    const guardian = makeUnit('guardian', 25);
    const target = makeUnit('target', 20);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(guardian, { x: 2, y: 0 }, 'B');
    prepareForBattle(target, { x: 1, y: 0 }, 'B');
    guardian.statusEffects.push({ type: 'guarding', turnsRemaining: 2, magnitude: 1 });

    const battle = new GridBattle(map, [a], [guardian, target], () => 0.5);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'target' });
    expect(target.currentHp).toBe(100);
    expect(guardian.currentHp).toBeLessThan(100);
  });
});
