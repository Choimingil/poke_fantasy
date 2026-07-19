import type { ArmorKind, Element, ProcEffect } from '../types';
import { PLAYABLE_WEAPON_KINDS, shieldTemplates, weaponTemplatesForKind } from '../data/weapons';
import { armorTemplateForKind } from '../data/armor';
import type { ShopItem } from './types';

const ARMOR_KINDS: ArmorKind[] = ['cloth', 'leather', 'mail', 'plate'];
const ELEMENTS: Exclude<Element, 'none'>[] = ['fire', 'water', 'wood', 'steel', 'earth'];
const PROCS: ProcEffect[] = ['bleed', 'stun', 'pierce', 'focus', 'crit'];
const SHOP_SIZE = 6;
const RARE_CHANCE = 0.18;

/** 상점 상품 가격(레벨 기반, 희귀 장비는 2.2배). */
export function shopPrice(level: number, rare: boolean): number {
  return Math.round(level * 8 * (rare ? 2.2 : 1));
}

/** 라운드에 맞는 상점 상품 기준 레벨(라운드가 오를수록 상승). */
function shopBaseLevel(round: number): number {
  return Math.min(100, 5 + (round - 1) * 2);
}

/** 라운드마다 상점 상품(무기/방어구/방패, 희귀 포함)을 생성한다. */
export function rollShop(round: number, startId: number, rng: () => number = Math.random): { shop: ShopItem[]; nextId: number } {
  const shop: ShopItem[] = [];
  let id = startId;
  const base = shopBaseLevel(round);
  for (let i = 0; i < SHOP_SIZE; i++) {
    const rare = rng() < RARE_CHANCE;
    const level = rare ? base + 10 : base;
    const roll = rng();
    let item: ShopItem;
    if (roll < 0.55) {
      const kind = PLAYABLE_WEAPON_KINDS[Math.floor(rng() * PLAYABLE_WEAPON_KINDS.length)];
      const templates = weaponTemplatesForKind(kind);
      const tpl = templates[Math.floor(rng() * templates.length)];
      item = {
        id: `s${id}`, slot: 'weapon', templateId: tpl.id, level,
        element: kind === 'staff' ? ELEMENTS[Math.floor(rng() * ELEMENTS.length)] : undefined,
        procEffect: kind === 'tome' || kind === 'thrown' ? PROCS[Math.floor(rng() * PROCS.length)] : undefined,
        rare, price: shopPrice(level, rare),
      };
    } else if (roll < 0.82) {
      const ak = ARMOR_KINDS[Math.floor(rng() * ARMOR_KINDS.length)];
      item = { id: `s${id}`, slot: 'armor', templateId: armorTemplateForKind(ak).id, level, rare, price: shopPrice(level, rare) };
    } else {
      const shields = shieldTemplates();
      const st = shields[Math.floor(rng() * shields.length)];
      item = { id: `s${id}`, slot: 'shield', templateId: st.id, level, rare, price: shopPrice(level, rare) };
    }
    shop.push(item);
    id += 1;
  }
  return { shop, nextId: id };
}
