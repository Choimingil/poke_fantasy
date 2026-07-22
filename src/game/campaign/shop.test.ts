import { describe, expect, it } from 'vitest';
import { getWeapon } from '../data/weapons';
import { rollShop, shopPrice } from './shop';
import { newCampaign } from './state';
const hs = (heroKind: import('../types').WeaponKind) => ({ heroKind, name: '주인공', gender: 'male' as const, armorKind: 'cloth' as const, traitId: 'toughness', traitCandidates: [] as string[] });
import { buyShopItem, enhanceEquip, sellStashWeapon, equipStashWeapon, equipStashArmor } from './stash';

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

  it('등급이 높을수록 더 비싸다(일반 < 희귀 < 전설)', () => {
    expect(shopPrice(20, 'common')).toBeLessThan(shopPrice(20, 'rare'));
    expect(shopPrice(20, 'rare')).toBeLessThan(shopPrice(20, 'legendary'));
  });
});

describe('구매 → 보관함', () => {
  it('골드가 충분하면 구매해 보관함에 넣고 골드를 차감한다', () => {
    let c = newCampaign(hs('sword'), seq([0.5]));
    c = { ...c, round: 3, gold: 100000 }; // 상점은 3라운드부터 해금(§44)
    const item = c.shop[0];
    const before = c.stash.weapons.length + c.stash.armor.length;
    const after = buyShopItem(c, item.id);
    expect(after.gold).toBe(100000 - item.price);
    expect(after.stash.weapons.length + after.stash.armor.length).toBe(before + 1);
    expect(after.shop.some((s) => s.id === item.id)).toBe(false);
  });

  it('골드가 부족하면 구매되지 않는다', () => {
    const c = { ...newCampaign(hs('sword'), seq([0.5])), round: 3, gold: 0 };
    const after = buyShopItem(c, c.shop[0].id);
    expect(after).toBe(c);
  });

  it('3라운드 이전(상점 미해금)에는 골드가 충분해도 구매되지 않는다(§44)', () => {
    const c = { ...newCampaign(hs('sword'), seq([0.5])), round: 2, gold: 100000 };
    const after = buyShopItem(c, c.shop[0].id);
    expect(after).toBe(c);
  });
});

describe('강화 해금(§44)', () => {
  function withStashWeapon(round: number) {
    const base = newCampaign(hs('sword'), seq([0.5]));
    return {
      ...base, round, gold: 100000, materials: 99,
      stash: { weapons: [{ instanceId: 'w-e', templateId: 'sword_short', level: 1 }], armor: [] },
    };
  }

  it('4라운드부터 강화할 수 있다', () => {
    const after = enhanceEquip(withStashWeapon(4), 'w-e');
    expect(after.stash.weapons[0].enhanceLevel).toBe(1);
    expect(after.gold).toBeLessThan(100000);
  });

  it('4라운드 이전(강화 미해금)에는 강화되지 않는다', () => {
    const c = withStashWeapon(3);
    const after = enhanceEquip(c, 'w-e');
    expect(after).toBe(c);
  });
});

describe('보관함 판매·장착', () => {
  it('보관함 무기를 판매하면 골드가 오르고 목록에서 사라진다', () => {
    let c = { ...newCampaign(hs('sword'), seq([0.5])), round: 3, gold: 100000 };
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
    // 착용 가능한 무기(레벨 1, 주인공 레벨 1)를 강제로 보관함에 넣는다.
    let c = newCampaign(hs('sword'), seq([0.5]));
    c = { ...c, stash: { weapons: [{ instanceId: 'w-test', templateId: 'sword_great', level: 1 }], armor: [] } };
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
    let c = newCampaign(hs('sword'), seq([0.5])); // 주인공 레벨 1
    c = { ...c, stash: { weapons: [], armor: [{ instanceId: 'a-test', templateId: 'armor_plate', level: 40 }] } };
    const after = equipStashArmor(c, c.roster[0].id, 'a-test');
    expect(after).toBe(c); // 레벨 40 방어구는 장착 불가 → 변화 없음
  });
});
