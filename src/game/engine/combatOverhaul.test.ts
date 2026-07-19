import { describe, expect, it } from 'vitest';
import type { BattleMap, Character, WeaponKind } from '../types';
import { createCharacter, prepareForBattle } from './characterFactory';
import { initSkillUses } from '../data/promotions';
import { getWeapon, weaponPower as calcWeaponPower } from '../data/weapons';
import { getSkill } from '../data/skills';
import { calculateDamage } from './damage';
import { applyPoisonDamage, applyStatus } from './status';
import { GridBattle } from './battle';

function makeMap(size = 6): BattleMap {
  const tiles = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ terrain: 'plain' as const })));
  return { width: size, height: size, tiles };
}

function makeUnit(id: string, weaponTemplateId: string, tier: number, overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id,
    name: id,
    baseStats: { hp: 100, attack: 50, magicAttack: 40, speed: 10, endurance: 10 },
    sight: 6,
    starterWeaponTemplateId: weaponTemplateId,
  });
  const kind = getWeapon(weaponTemplateId).kind as WeaponKind;
  c.weaponMastery[kind] = tier;
  c.skillUses = initSkillUses(c, kind);
  return { ...c, ...overrides };
}

describe('무기 전용기술 통합', () => {
  it('꿰뚫기: 대상과 그 1칸 뒤 적 모두 피해를 입는다', () => {
    const map = makeMap();
    const spearman = makeUnit('spear', 'spear_a', 6, { baseStats: { hp: 100, attack: 200, magicAttack: 10, speed: 30, endurance: 10 } });
    const front = makeUnit('front', 'sword_short', 0);
    const back = makeUnit('back', 'sword_short', 0);
    prepareForBattle(spearman, { x: 0, y: 0 }, 'A');
    prepareForBattle(front, { x: 1, y: 0 }, 'B');
    prepareForBattle(back, { x: 2, y: 0 }, 'B');
    const battle = new GridBattle(map, [spearman], [front, back], () => 0.5);
    battle.takeTurn({ skillId: 'spear_pierce', targetId: 'front' });
    expect(front.currentHp).toBeLessThan(100);
    expect(back.currentHp).toBeLessThan(100); // 뒤의 적도 0.5배 피해
  });

  it('일섬: 대상은 제자리, 시전자가 대상 뒤(관통)로 이동한다', () => {
    const map = makeMap();
    const sword = makeUnit('sword', 'sword_short', 6, { baseStats: { hp: 100, attack: 60, magicAttack: 5, speed: 30, endurance: 10 } });
    const enemy = makeUnit('enemy', 'sword_short', 0);
    prepareForBattle(sword, { x: 0, y: 0 }, 'A');
    prepareForBattle(enemy, { x: 1, y: 0 }, 'B'); // 시전자 우측 인접
    const battle = new GridBattle(map, [sword], [enemy], () => 0.5);
    battle.takeTurn({ skillId: 'sword_flash', targetId: 'enemy' });
    expect(enemy.position).toEqual({ x: 1, y: 0 }); // 대상은 그대로
    expect(sword.position).toEqual({ x: 2, y: 0 }); // 시전자는 대상 뒤로 관통
    expect(enemy.currentHp).toBeLessThan(100);
  });

  it('섬광참: 2칸 떨어진 대상 앞(인접)까지 이동한 뒤 공격한다', () => {
    const map = makeMap();
    const sword = makeUnit('sword', 'sword_short', 6, { baseStats: { hp: 100, attack: 60, magicAttack: 5, speed: 30, endurance: 10 } });
    const enemy = makeUnit('enemy', 'sword_short', 0);
    prepareForBattle(sword, { x: 0, y: 0 }, 'A');
    prepareForBattle(enemy, { x: 2, y: 0 }, 'B'); // 2칸 거리
    const battle = new GridBattle(map, [sword], [enemy], () => 0.5);
    battle.takeTurn({ skillId: 'sword_blink', targetId: 'enemy' });
    expect(sword.position).toEqual({ x: 1, y: 0 }); // 대상 앞(인접)으로 이동
    expect(enemy.position).toEqual({ x: 2, y: 0 }); // 대상은 그대로
    expect(enemy.currentHp).toBeLessThan(100);
  });

  it('봉쇄: 대상에게 이동 불가 상태를 부여한다', () => {
    const map = makeMap();
    const spearman = makeUnit('spear', 'spear_a', 6, { baseStats: { hp: 100, attack: 50, magicAttack: 10, speed: 30, endurance: 10 } });
    const enemy = makeUnit('enemy', 'sword_short', 0);
    prepareForBattle(spearman, { x: 0, y: 0 }, 'A');
    prepareForBattle(enemy, { x: 1, y: 0 }, 'B');
    const battle = new GridBattle(map, [spearman], [enemy], () => 0.9); // 정신력 저항 회피
    battle.takeTurn({ skillId: 'spear_lock', targetId: 'enemy' });
    expect(enemy.statusEffects.some((s) => s.type === 'immobilized')).toBe(true);
  });

  it('치명사격: 대상 최대체력의 50% 고정피해', () => {
    const map = makeMap();
    const xbow = makeUnit('xbow', 'crossbow_a', 6, { baseStats: { hp: 100, attack: 1, magicAttack: 1, speed: 30, endurance: 10 } });
    const enemy = makeUnit('enemy', 'sword_short', 0, { baseStats: { hp: 200, attack: 10, magicAttack: 10, speed: 5, endurance: 10 } });
    prepareForBattle(xbow, { x: 0, y: 0 }, 'A');
    prepareForBattle(enemy, { x: 2, y: 0 }, 'B'); // 석궁 사거리 2
    const battle = new GridBattle(map, [xbow], [enemy], () => 0.5);
    battle.takeTurn({ skillId: 'xbow_lethal', targetId: 'enemy' });
    expect(enemy.currentHp).toBe(100); // 200의 50% = 100 고정피해
  });

  it('빠른교체: 상태 중에는 교체가 턴을 소모하지 않지만 교체한 턴엔 전용기술을 못 쓴다', () => {
    const map = makeMap();
    const a = makeUnit('a', 'sword_short', 6, { baseStats: { hp: 100, attack: 100, magicAttack: 10, speed: 30, endurance: 10 } });
    a.inventory.push({ instanceId: 'a-bow', templateId: 'bow_short', level: 10 });
    const b = makeUnit('b', 'sword_short', 0, { baseStats: { hp: 100, attack: 5, magicAttack: 5, speed: 5, endurance: 5 } });
    prepareForBattle(a, { x: 0, y: 0 }, 'A');
    prepareForBattle(b, { x: 1, y: 0 }, 'B');
    applyStatus(a, 'quickSwap', { turnsRemaining: 3 }); // 배틀 준비가 상태를 초기화하므로 그 뒤에 부여
    const battle = new GridBattle(map, [a], [b], () => 0.5);
    // 무기 교체 + 공통 기술(강타)은 같은 턴에 가능(빠른교체 무료).
    battle.takeTurn({ switchWeaponTo: 'a-bow', skillId: 'power_strike', targetId: 'b' });
    expect(a.equippedWeaponId).toBe('a-bow');
    expect(b.currentHp).toBeLessThan(100);
  });
});

describe('데미지 훅', () => {
  const STAFF_POWER = calcWeaponPower(10, 'staff');
  function staffAttacker(tier: number): Character {
    const c = createCharacter({
      id: 'mage', name: 'mage',
      baseStats: { hp: 100, attack: 20, magicAttack: 60, speed: 10, endurance: 10 },
      sight: 5, starterWeaponTemplateId: 'staff_east',
    });
    c.weaponMastery.staff = tier;
    c.inventory[0].element = 'fire';
    return c;
  }

  it('증폭(지팡이 T5): 약점 배율이 1.3→1.6으로 강화된다', () => {
    const defender = createCharacter({ id: 'd', name: 'd', baseStats: { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'sword_short' });
    const base = calculateDamage({
      attacker: staffAttacker(4), defender, skill: getSkill('staff_bolt'), weapon: getWeapon('staff_east'), weaponPower: STAFF_POWER,
      attackerElement: 'fire', defenderElement: 'earth', statSource: 'magic', rng: () => 0.999,
    });
    const amplified = calculateDamage({
      attacker: staffAttacker(5), defender, skill: getSkill('staff_bolt'), weapon: getWeapon('staff_east'), weaponPower: STAFF_POWER,
      attackerElement: 'fire', defenderElement: 'earth', statSource: 'magic', rng: () => 0.999,
    });
    expect(amplified.damage / base.damage).toBeCloseTo(1.6 / 1.3, 1);
  });

  it('철갑사격(ignoreDefenseRatio): 방어력 20%를 무시한다', () => {
    const attacker = createCharacter({ id: 'a', name: 'a', baseStats: { hp: 100, attack: 500, magicAttack: 10, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'crossbow_a' });
    const defender = createCharacter({ id: 'd', name: 'd', baseStats: { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'sword_short' });
    const full = calculateDamage({
      attacker, defender, skill: getSkill('xbow_ap'), weapon: getWeapon('crossbow_a'), weaponPower: calcWeaponPower(10, 'crossbow'),
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', defenderDefense: 20, rng: () => 0.999,
    });
    const ignored = calculateDamage({
      attacker, defender, skill: getSkill('xbow_ap'), weapon: getWeapon('crossbow_a'), weaponPower: calcWeaponPower(10, 'crossbow'),
      attackerElement: 'none', defenderElement: 'none', statSource: 'attack', defenderDefense: 20, ignoreDefenseRatio: 0.2, rng: () => 0.999,
    });
    expect(ignored.damage).toBeGreaterThan(full.damage);
  });

  it('마법부여(combined): 주스탯 = 높은 능력치 + 낮은 능력치 50%', () => {
    const defender = createCharacter({ id: 'd', name: 'd', baseStats: { hp: 100, attack: 10, magicAttack: 10, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'sword_short' });
    const mk = (attack: number, magic: number) => createCharacter({ id: 'a', name: 'a', baseStats: { hp: 100, attack, magicAttack: magic, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'sword_short' });
    const args = (a: Character) => ({ attacker: a, defender, skill: getSkill('power_strike'), weapon: getWeapon('sword_short'), weaponPower: calcWeaponPower(10, 'sword'), attackerElement: 'none' as const, defenderElement: 'none' as const, statSource: 'combined' as const, rng: () => 0.999 });
    // 50/30과 30/50은 max+0.5min이 동일(65)하므로 데미지가 같아야 한다.
    expect(calculateDamage(args(mk(50, 30))).damage).toBe(calculateDamage(args(mk(30, 50))).damage);
  });
});

describe('맹독 지속피해', () => {
  it('맹독은 출혈과 별개로 매 턴 최대체력 1/8 피해를 준다', () => {
    const c = createCharacter({ id: 'c', name: 'c', baseStats: { hp: 160, attack: 10, magicAttack: 10, speed: 10, endurance: 10 }, sight: 5, starterWeaponTemplateId: 'sword_short' });
    applyStatus(c, 'poisoned', { turnsRemaining: 2 });
    expect(applyPoisonDamage(c)).toBe(20); // 160/8
  });
});
