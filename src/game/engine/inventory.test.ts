import { describe, expect, it } from 'vitest';
import { createCharacter } from './characterFactory';
import { equipOffhandDagger, equipWeapon } from './inventory';

function makeDaggerUser() {
  const c = createCharacter({
    id: 'c1',
    name: '테스터',
    baseStats: { hp: 5, attack: 5, magicAttack: 5, speed: 5, endurance: 5 },
    sight: 3,
    starterWeaponTemplateId: 'dagger_a',
    extraWeaponTemplateIds: [{ templateId: 'dagger_a' }, { templateId: 'sword_short' }],
  });
  return c;
}

describe('equipOffhandDagger', () => {
  it('주무기가 단검이면 보조 슬롯에 단검을 하나 더 장착할 수 있다(이도류)', () => {
    const c = makeDaggerUser();
    const secondDagger = c.inventory.find((w) => w.instanceId !== c.equippedWeaponId && w.templateId === 'dagger_a')!;
    expect(equipOffhandDagger(c, secondDagger.instanceId)).toBe(true);
    expect(c.equippedShieldId).toBe(secondDagger.instanceId);
  });

  it('주무기가 단검이 아니면 보조 슬롯에 단검을 장착할 수 없다', () => {
    const c = makeDaggerUser();
    const sword = c.inventory.find((w) => w.templateId === 'sword_short')!;
    equipWeapon(c, sword.instanceId); // 주무기를 검으로 교체
    const secondDagger = c.inventory.find((w) => w.templateId === 'dagger_a' && w.instanceId !== c.equippedWeaponId)!;
    expect(() => equipOffhandDagger(c, secondDagger.instanceId)).toThrow();
  });

  it('단검 이도류 상태에서 다른 무기로 교체하면 보조 단검도 함께 해제된다', () => {
    const c = makeDaggerUser();
    const secondDagger = c.inventory.find((w) => w.instanceId !== c.equippedWeaponId && w.templateId === 'dagger_a')!;
    equipOffhandDagger(c, secondDagger.instanceId);
    const sword = c.inventory.find((w) => w.templateId === 'sword_short')!;
    equipWeapon(c, sword.instanceId);
    expect(c.equippedShieldId).toBeUndefined();
  });
});
