import { describe, expect, it } from 'vitest';
import { getWeapon } from '../data/weapons';
import { rollShop, shopPrice } from './shop';
import { newCampaign } from './state';
import { buyShopItem, sellStashWeapon, equipStashWeapon, equipStashArmor } from './stash';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('rollShop', () => {
  it('상품을 생성하고 고유 id·양수 가격을 가진다', () => {
    const { shop, nextId } = rollShop(3, 10, seq([0.1, 0.4, 0.6, 0.9, 0.2]));
    expect(shop.length).toBeGreaterThan(0);
    expect(new Set(shop.map((s) => s.id)).size).toBe(shop.length);
    expect(shop.every((s) => s.price > 0)).toBe(true);
    expect(nextId).toBe(10 + shop.length);
  });

  it('희귀 장비가 더 비싸다', () => {
    expect(shopPrice(20, false)).toBeLessThan(shopPrice(20, true));
  });
});

describe('구매 → 보관함', () => {
  it('골드가 충분하면 구매해 보관함에 넣고 골드를 차감한다', () => {
    let c = newCampaign('sword', seq([0.5]));
    c = { ...c, gold: 100000 };
    const item = c.shop[0];
    const before = c.stash.weapons.length + c.stash.armor.length;
    const after = buyShopItem(c, item.id);
    expect(after.gold).toBe(100000 - item.price);
    expect(after.stash.weapons.length + after.stash.armor.length).toBe(before + 1);
    expect(after.shop.some((s) => s.id === item.id)).toBe(false);
  });

  it('골드가 부족하면 구매되지 않는다', () => {
    const c = { ...newCampaign('sword', seq([0.5])), gold: 0 };
    const after = buyShopItem(c, c.shop[0].id);
    expect(after).toBe(c);
  });
});

describe('보관함 판매·장착', () => {
  it('보관함 무기를 판매하면 골드가 오르고 목록에서 사라진다', () => {
    let c = { ...newCampaign('sword', seq([0.5])), gold: 100000 };
    // 무기 상품을 하나 사서 보관함에 넣는다.
    const weaponItem = c.shop.find((s) => s.slot === 'weapon')!;
    c = buyShopItem(c, weaponItem.id);
    const inst = c.stash.weapons[0];
    const goldBefore = c.gold;
    const after = sellStashWeapon(c, inst.instanceId);
    expect(after.gold).toBeGreaterThan(goldBefore);
    expect(after.stash.weapons.some((w) => w.instanceId === inst.instanceId)).toBe(false);
  });

  it('보관함 무기를 장착하면 캐릭터의 기존 무기와 교체된다(착용 레벨 충족 시)', () => {
    // 하이 레벨 무기(레벨 10, 주인공 레벨 10)를 강제로 보관함에 넣는다.
    let c = newCampaign('sword', seq([0.5]));
    c = { ...c, stash: { weapons: [{ instanceId: 'w-test', templateId: 'sword_great', level: 10 }], armor: [] } };
    const hero = c.roster[0];
    const oldWeaponId = hero.equippedWeaponId;
    const after = equipStashWeapon(c, hero.id, 'w-test');
    const heroAfter = after.roster[0];
    expect(heroAfter.equippedWeaponId).toBe('w-test');
    expect(getWeapon(heroAfter.inventory.find((w) => w.instanceId === 'w-test')!.templateId).id).toBe('sword_great');
    // 기존 무기가 보관함으로 이동
    expect(after.stash.weapons.some((w) => w.instanceId === oldWeaponId)).toBe(true);
  });

  it('착용 레벨 미달 장비는 장착되지 않는다', () => {
    let c = newCampaign('sword', seq([0.5])); // 주인공 레벨 10
    c = { ...c, stash: { weapons: [], armor: [{ instanceId: 'a-test', templateId: 'armor_plate', level: 40 }] } };
    const after = equipStashArmor(c, c.roster[0].id, 'a-test');
    expect(after).toBe(c); // 레벨 40 방어구는 장착 불가 → 변화 없음
  });
});
