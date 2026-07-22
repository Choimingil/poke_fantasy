import { describe, expect, it } from 'vitest';
import type { BattleMap, Character } from '../types';
import { createCharacter, prepareForBattle } from '../engine/characterFactory';
import { GridBattle } from '../engine/battle';
import { evaluateBattle, objectivesForRound, ratingReward } from './objectives';

function makeMap(size = 6): BattleMap {
  const tiles = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ terrain: 'plain' as const })));
  return { width: size, height: size, tiles };
}

function unit(id: string, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({ id, name: id, baseStats: { hp: 100, attack: 400, magicAttack: 5, speed: 20, endurance: 10 }, sight: 6, starterWeaponTemplateId: 'sword_short' });
  return { ...c, ...overrides };
}

describe('전투 목표(§40)', () => {
  it('지휘관 처치: 지휘관이 쓰러지면 잔당이 남아도 승리한다', () => {
    const map = makeMap();
    const hero = unit('hero', { baseStats: { hp: 100, attack: 5000, magicAttack: 5, speed: 50, endurance: 10 } });
    const commander = unit('cmd', { baseStats: { hp: 5, attack: 5, magicAttack: 5, speed: 5, endurance: 5 }, isBoss: true });
    const minion = unit('m', { baseStats: { hp: 300, attack: 5, magicAttack: 5, speed: 1, endurance: 5 } });
    prepareForBattle(hero, { x: 0, y: 0 }, 'A');
    prepareForBattle(commander, { x: 1, y: 0 }, 'B');
    prepareForBattle(minion, { x: 5, y: 5 }, 'B');
    const battle = new GridBattle(map, [hero], [commander, minion], () => 0.5, 'clear', 'day', { primary: 'killCommander', commanderId: 'cmd' });
    battle.takeTurn({ skillId: 'power_strike', targetId: 'cmd' });
    expect(commander.currentHp).toBe(0);
    expect(battle.finished).toBe(true);
    expect(battle.winner).toBe('A'); // 부하가 살아 있어도 승리
    expect(minion.currentHp).toBeGreaterThan(0);
  });

  it('평가: 승리+선택목표+무손실이면 압도적 승리', () => {
    const map = makeMap();
    const hero = unit('hero');
    const enemy = unit('e', { baseStats: { hp: 1, attack: 1, magicAttack: 1, speed: 1, endurance: 1 } });
    prepareForBattle(hero, { x: 0, y: 0 }, 'A');
    prepareForBattle(enemy, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [hero], [enemy], () => 0.5);
    battle.takeTurn({ skillId: 'power_strike', targetId: 'e' });
    const evalResult = evaluateBattle(1, battle); // 1라운드=적 전멸+빠른 승리
    expect(evalResult.won).toBe(true);
    expect(evalResult.rating).toBe('overwhelming'); // 빠른 승리 + 아군 무손실
    expect(ratingReward('overwhelming').reputation).toBeGreaterThan(ratingReward('victory').reputation);
  });

  it('라운드 목표는 결정적이다(보스 라운드=지휘관 처치)', () => {
    expect(objectivesForRound(5).primary).toBe('killCommander');
    expect(objectivesForRound(3).primary).toBe('surviveTurns');
    expect(objectivesForRound(1).primary).toBe('annihilate');
  });
});
