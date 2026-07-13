import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { Battle } from './battle';

function make(id: string, jobId: string, overrides: Partial<Parameters<typeof createCharacter>[0]> = {}) {
  return createCharacter({
    id,
    name: id,
    jobId,
    faction: jobId.startsWith('east') ? 'east' : 'west',
    stats: { attack: 40, defense: 20, hp: 100, speed: 20 },
    weapon: { templateId: 'sword_1h_east', enhancementLevel: 0 },
    skills: ['slash'],
    ...overrides,
  });
}

describe('Battle', () => {
  it('무기 타입이 스킬 타입과 다르면 스킬을 사용할 수 없다', () => {
    const a = make('a', 'east_general', { skills: ['fire_bolt'] }); // 검(근거리) 장착 + 마법 스킬
    const b = make('b', 'east_general');
    const battle = new Battle([a], [b], () => 0.01);
    const lines = battle.runTurn({ skillId: 'fire_bolt' }, { skillId: 'slash' });
    expect(lines.some((l) => l.includes('무기 타입 불일치'))).toBe(true);
    expect(a.currentHp).toBeLessThan(100); // a는 스킬을 못 쓰고, b의 공격은 정상적으로 a에게 적중
  });

  it('무기 교체는 턴을 소모하며, 그 사이 상대는 정상적으로 공격한다', () => {
    const a = make('a', 'east_general');
    const b = make('b', 'east_general');
    const battle = new Battle([a], [b], () => 0.99);
    battle.runTurn({ switchWeaponTo: 'blunt_1h_east' }, { skillId: 'slash' });
    expect(a.equippedWeapon.templateId).toBe('blunt_1h_east');
    expect(a.currentHp).toBeLessThan(100); // 무기교체로 턴을 소모해 공격을 못했고 b의 공격을 받음
    expect(b.currentHp).toBe(100); // a는 이번 턴에 공격하지 않음
  });

  it('닌자/레인저 등 자유교체 특성 보유 시 무기 교체와 스킬 사용을 같은 턴에 할 수 있다', () => {
    const ninja = make('ninja', 'east_ninja', { skills: ['fire_bolt'] });
    const opponent = make('opp', 'east_general');
    const battle = new Battle([ninja], [opponent], () => 0.01);
    battle.runTurn({ switchWeaponTo: 'tome_1h_east', skillId: 'fire_bolt' }, { skillId: 'slash' });
    expect(ninja.equippedWeapon.templateId).toBe('tome_1h_east');
    expect(opponent.currentHp).toBeLessThan(100); // 같은 턴에 스킬까지 적중
  });

  it('한쪽 팀의 체력이 모두 0이 되면 전투가 종료되고 승자가 기록된다', () => {
    const strong = make('strong', 'east_general', { stats: { attack: 500, defense: 10, hp: 100, speed: 50 } });
    const weak = make('weak', 'east_general', { stats: { attack: 5, defense: 5, hp: 10, speed: 1 } });
    const battle = new Battle([strong], [weak], () => 0.01);
    battle.runTurn({ skillId: 'slash' }, { skillId: 'slash' });
    expect(battle.finished).toBe(true);
    expect(battle.winner).toBe('A');
  });

  it('프리스트가 등장하면 아군 중 최저체력 인원의 체력을 25% 회복시킨다', () => {
    const priest = make('priest', 'west_priest');
    const hurtAlly = make('ally', 'west_warrior', { stats: { attack: 10, defense: 10, hp: 100, speed: 5 } });
    hurtAlly.currentHp = 20;
    const enemy = make('enemy', 'east_general');
    const battle = new Battle([priest, hurtAlly], [enemy], () => 0.5);
    expect(hurtAlly.currentHp).toBe(45); // 20 + 100*0.25
    expect(battle.log.some((l) => l.includes('회복'))).toBe(true);
  });
});
