import { describe, expect, it } from 'vitest';
import { createCharacter } from '../engine/characterFactory';
import { maxHp } from '../engine/derivedStats';
import { equippedOptionTotal, partyHasLegendaryEquipped, rollEquipOption } from './equipGrade';

function makeChar(id = 'c') {
  return createCharacter({
    id, name: id, level: 10,
    baseStats: { hp: 30, attack: 20, magicAttack: 10, speed: 10, endurance: 10 },
    sight: 5, starterWeaponTemplateId: 'sword_short',
  });
}

describe('장비 옵션(§31)', () => {
  it('장착 무기의 최대 체력 옵션이 maxHp에 반영된다', () => {
    const c = makeChar();
    const base = maxHp(c);
    const w = c.inventory.find((i) => i.instanceId === c.equippedWeaponId)!;
    w.grade = 'rare';
    w.options = [{ kind: 'maxHp', magnitude: 12, label: '최대 체력 +12' }];
    expect(equippedOptionTotal(c, 'maxHp')).toBe(12);
    expect(maxHp(c)).toBe(base + 12);
  });

  it('전설 옵션은 일반보다 강하다', () => {
    const rng = () => 0; // 항상 첫 종류(maxHp)
    const rare = rollEquipOption(20, rng, false);
    const legendary = rollEquipOption(20, rng, true);
    expect(legendary.magnitude).toBeGreaterThan(rare.magnitude);
  });

  it('파티에 같은 전설 장비가 장착돼 있으면 감지한다', () => {
    const a = makeChar('a');
    const w = a.inventory.find((i) => i.instanceId === a.equippedWeaponId)!;
    w.grade = 'legendary';
    expect(partyHasLegendaryEquipped([a], w.templateId, 'b')).toBe(true); // 다른 캐릭터 기준
    expect(partyHasLegendaryEquipped([a], w.templateId, 'a')).toBe(false); // 자기 자신 제외
  });
});
