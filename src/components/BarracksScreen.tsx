import { useState } from 'react';
import type { Campaign } from '../game/campaign/types';
import { InventoryScreen } from './InventoryScreen';
import { RecruitTab } from './RecruitTab';
import { ShopTab } from './ShopTab';
import { PartyFormationTab } from './PartyFormationTab';

type Tab = 'party' | 'inventory' | 'recruit' | 'shop';

const TABS: { id: Tab; label: string }[] = [
  { id: 'party', label: '파티 편성' },
  { id: 'inventory', label: '인벤토리' },
  { id: 'recruit', label: '동료 모집' },
  { id: 'shop', label: '상점' },
];

export function BarracksScreen({
  campaign,
  onSetDeployed,
  onStartBattle,
  onSave,
  onRecruit,
  onBuy,
  onEquipStashWeapon,
  onEquipStashArmor,
  onSellStashWeapon,
  onSellStashArmor,
}: {
  campaign: Campaign;
  onSetDeployed: (ids: string[]) => void;
  onStartBattle: () => void;
  onSave: () => void;
  onRecruit: (id: string) => void;
  onBuy: (id: string) => void;
  onEquipStashWeapon: (charId: string, instanceId: string) => void;
  onEquipStashArmor: (charId: string, instanceId: string) => void;
  onSellStashWeapon: (instanceId: string) => void;
  onSellStashArmor: (instanceId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('party');

  return (
    <div className="app-shell barracks-screen">
      <div className="barracks-header">
        <h1>정비 · {campaign.round}라운드</h1>
        <div className="barracks-resources">
          <span>🏅 명성 {campaign.reputation}</span>
          <span>💰 골드 {campaign.gold}</span>
          <span>👥 동료 {campaign.roster.length}/30</span>
        </div>
      </div>

      <div className="barracks-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'tab-active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="barracks-body">
        {tab === 'party' && (
          <PartyFormationTab campaign={campaign} onSetDeployed={onSetDeployed} onStartBattle={onStartBattle} />
        )}

        {tab === 'inventory' && (
          <InventoryScreen
            characters={campaign.roster}
            onChange={onSave}
            stash={campaign.stash}
            onEquipStashWeapon={onEquipStashWeapon}
            onEquipStashArmor={onEquipStashArmor}
            onSellStashWeapon={onSellStashWeapon}
            onSellStashArmor={onSellStashArmor}
          />
        )}

        {tab === 'recruit' && (
          <RecruitTab campaign={campaign} onRecruit={onRecruit} />
        )}

        {tab === 'shop' && (
          <ShopTab campaign={campaign} onBuy={onBuy} />
        )}
      </div>
    </div>
  );
}
