import { useState } from 'react';
import type { Campaign } from '../game/campaign/types';
import { MAX_DEPLOY } from '../game/campaign/types';
import { ENEMY_THEME_LABEL } from '../game/campaign/types';
import { themeForRound, isBossRound, enemyLevelForRound, enemyCountForRound } from '../game/campaign/enemyParty';
import { getWeapon } from '../game/data/weapons';
import { InventoryScreen } from './InventoryScreen';
import { RecruitTab } from './RecruitTab';
import { ShopTab } from './ShopTab';

type Tab = 'party' | 'inventory' | 'recruit' | 'shop';

const TABS: { id: Tab; label: string }[] = [
  { id: 'party', label: '파티 편성' },
  { id: 'inventory', label: '인벤토리' },
  { id: 'recruit', label: '동료 모집' },
  { id: 'shop', label: '상점' },
];

function classOf(c: Campaign['roster'][number]): string {
  const inst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  return inst ? getWeapon(inst.templateId).kind : '?';
}

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
  const theme = themeForRound(campaign.round);
  const boss = isBossRound(campaign.round);

  const toggleDeploy = (id: string) => {
    if (campaign.deployedIds.includes(id)) onSetDeployed(campaign.deployedIds.filter((i) => i !== id));
    else if (campaign.deployedIds.length < MAX_DEPLOY) onSetDeployed([...campaign.deployedIds, id]);
  };

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
          <div className="party-tab">
            <p className="barracks-hint">
              다음 전투: <strong>{campaign.round}라운드</strong> · {ENEMY_THEME_LABEL[theme]} · 적 Lv.{enemyLevelForRound(campaign.round)} × {enemyCountForRound(campaign.round)}
              {boss && <span className="boss-warning"> · ⚠ 보스 등장</span>}
            </p>
            <p className="barracks-hint">출전 인원을 최대 {MAX_DEPLOY}명까지 선택하세요.</p>
            <ul className="deploy-list">
              {campaign.roster.map((c) => {
                const on = campaign.deployedIds.includes(c.id);
                return (
                  <li key={c.id} className={on ? 'deploy-on' : ''}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => toggleDeploy(c.id)} />
                      <strong>{c.name}</strong> · {classOf(c)} · Lv.{c.level}
                      <span className="deploy-stats">
                        HP {c.baseStats.hp} · 근 {c.baseStats.attack} · 지 {c.baseStats.magicAttack} · 속 {c.baseStats.speed}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="start-battle-button" disabled={campaign.deployedIds.length === 0} onClick={onStartBattle}>
              ⚔️ {campaign.round}라운드 전투 시작 →
            </button>
          </div>
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
