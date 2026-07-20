import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter, prepareForBattle } from './characterFactory';
import { maxHp } from './derivedStats';
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
    baseStats: { hp: 100, attack: 50, magicAttack: 10, speed, endurance: 10 },
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
    expect(b.currentHp).toBeLessThan(maxHp(b));
  });

  it('보호: 마름모 1칸(직교 인접) 아군을 향한 공격을 시전자가 대신 받는다', () => {
    const map = makeMap();
    const guardian = makeUnit('guardian', 30);
    const ally = makeUnit('ally', 20);
    const enemy = makeUnit('enemy', 99); // 가장 빠름
    prepareForBattle(guardian, { x: 1, y: 1 }, 'A');
    prepareForBattle(ally, { x: 1, y: 2 }, 'A'); // 직교 인접(맨해튼 1)
    prepareForBattle(enemy, { x: 1, y: 3 }, 'B'); // ally 바로 아래
    // rng=0.5: 명중(0.5*100<accuracy)은 통과하되, 회피 판정(rng < 회피율)은 실패시켜 공격이 확정으로 적중하게 한다.
    const battle = new GridBattle(map, [guardian, ally], [enemy], () => 0.5);
    guardian.statusEffects.push({ type: 'guarding', turnsRemaining: 2, magnitude: 1 });

    battle.takeTurn({ skillId: 'power_strike', targetId: 'ally' }); // 적이 ally 공격
    expect(ally.currentHp).toBe(maxHp(ally)); // ally는 무피해
    expect(guardian.currentHp).toBeLessThan(maxHp(guardian)); // 시전자가 대신 받음
  });

  it('사거리 밖의 적은 공격할 수 없다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 10);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 4, y: 4 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(b.currentHp).toBe(maxHp(b));
  });

  it('이동 예산을 벗어난 타일로는 이동할 수 없다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20);
    const b = makeUnit('b', 10);
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 4, y: 4 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.5);
    battle.takeTurn({ moveTo: { x: 4, y: 0 } }); // 거리 4 > 이동력(지구력 10 → 약 1.33)
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
    expect(b.currentHp).toBeLessThan(maxHp(b)); // 같은 턴에 공격까지 적중
  });

  it('처치 시 처치한 캐릭터만 경험치를 얻는다', () => {
    const map = makeMap();
    const a = makeUnit('a', 20, { baseStats: { hp: 100, attack: 5000, magicAttack: 10, speed: 20, endurance: 10 } });
    const b = makeUnit('b', 5, { baseStats: { hp: 10, attack: 5, magicAttack: 5, speed: 5, endurance: 5 } });
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
    const a = makeUnit('a', 20, { baseStats: { hp: 100, attack: 5000, magicAttack: 10, speed: 20, endurance: 10 } });
    const b = makeUnit('b', 5, { baseStats: { hp: 10, attack: 5, magicAttack: 5, speed: 5, endurance: 5 } });
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [a], [b], () => 0.01);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'b' });
    expect(battle.finished).toBe(true);
    expect(battle.winner).toBe('A');
  });

  it('시야 밖으로 나간 적의 마지막 목격 위치를 기억한다', () => {
    const map: BattleMap = { width: 10, height: 10, tiles: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ terrain: 'plain' as const }))) };
    const a = makeUnit('a', 20, { sight: 3 });
    const b = makeUnit('b', 10, { sight: 3 });
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B'); // 처음엔 시야 안
    const battle = new GridBattle(map, [a], [b], () => 0.5);

    battle.takeTurn({}); // a의 턴: 이 시점에 b를 확인
    expect(battle.knownEnemyPositions.A['b']).toEqual({ x: 1, y: 0 });

    b.position = { x: 9, y: 9 }; // 시야 밖으로 순간이동(테스트 편의상 직접 이동)
    battle.takeTurn({}); // b의 턴

    // a의 기억에는 여전히 마지막으로 확인했던 (1,0)이 남아있어야 한다
    expect(battle.knownEnemyPositions.A['b']).toEqual({ x: 1, y: 0 });
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
    expect(target.currentHp).toBe(maxHp(target));
    expect(guardian.currentHp).toBeLessThan(maxHp(guardian));
  });
});
