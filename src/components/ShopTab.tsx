import type { Campaign, ShopItem } from '../game/campaign/types';
import { getWeapon, weaponInstanceName, weaponPower } from '../game/data/weapons';
import { getArmor, armorDefense } from '../game/data/armor';

function itemName(item: ShopItem): string {
  if (item.slot === 'armor') return getArmor(item.templateId).name;
  return weaponInstanceName({ templateId: item.templateId, element: item.element, procEffect: item.procEffect });
}

function itemSpec(item: ShopItem): string {
  if (item.slot === 'armor') return `방어 ${Math.round(armorDefense(item.level, getArmor(item.templateId).kind))}`;
  const w = getWeapon(item.templateId);
  if (w.kind === 'shield') return `방어 +${w.defenseBonus ?? 0}`;
  return `공격력 ${Math.floor(weaponPower(item.level, w.kind))} · 사거리 ${w.range}`;
}

const SLOT_LABEL: Record<ShopItem['slot'], string> = { weapon: '무기', armor: '방어구', shield: '방패' };

export function ShopTab({ campaign, onBuy }: { campaign: Campaign; onBuy: (id: string) => void }) {
  return (
    <div className="shop-tab">
      <p className="barracks-hint">상품은 라운드마다 갱신됩니다. 구매한 장비는 보관함에 들어가며 인벤토리 탭에서 장착할 수 있습니다.</p>
      {campaign.shop.length === 0 ? (
        <p className="tab-placeholder">품절되었습니다. 다음 라운드에 새 상품이 들어옵니다.</p>
      ) : (
        <ul className="shop-list">
          {campaign.shop.map((item) => {
            const tooExpensive = campaign.gold < item.price;
            return (
              <li key={item.id} className={`shop-card${item.rare ? ' shop-rare' : ''}`}>
                <div className="shop-head">
                  <strong>{itemName(item)}</strong>
                  {item.rare && <span className="rare-tag">희귀</span>}
                  <span className="shop-slot">{SLOT_LABEL[item.slot]} · Lv.{item.level}</span>
                </div>
                <div className="shop-spec">{itemSpec(item)}</div>
                <div className="shop-foot">
                  <span className="recruit-cost">💰 {item.price}</span>
                  <button type="button" disabled={tooExpensive} onClick={() => onBuy(item.id)}>
                    {tooExpensive ? '골드 부족' : '구매'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
