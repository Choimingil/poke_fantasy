import type { Character } from '../game/types';
import { getWeapon } from '../game/data/weapons';
import { equipShield, equipWeapon, unequipShield } from '../game/engine/inventory';

export function InventoryScreen({ party, onChange, onContinue, onBack }: {
  party: Character[];
  onChange: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="app-shell setup-screen">
      <h1>인벤토리 - 장비 교체</h1>
      <div className="inventory-panel">
        {party.map((c) => {
          const equippedWeapon = getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId);
          const equippedShield = c.equippedShieldId
            ? getWeapon(c.inventory.find((w) => w.instanceId === c.equippedShieldId)!.templateId)
            : null;
          return (
            <div key={c.id} className="inventory-character-card">
              <h3>{c.name} <span className="inventory-equipped-label">장착: {equippedWeapon.name}{equippedShield ? ` + ${equippedShield.name}` : ''}</span></h3>
              <ul className="inventory-weapon-list">
                {c.inventory.map((instance) => {
                  const template = getWeapon(instance.templateId);
                  const isEquippedWeapon = instance.instanceId === c.equippedWeaponId;
                  const isEquippedShield = instance.instanceId === c.equippedShieldId;
                  return (
                    <li key={instance.instanceId} className={isEquippedWeapon || isEquippedShield ? 'inventory-item-equipped' : ''}>
                      <span>{template.name} ({template.kind}{template.kind === 'staff' && instance.element ? `/${instance.element}` : ''})</span>
                      {template.kind === 'shield' ? (
                        isEquippedShield ? (
                          <button type="button" onClick={() => { unequipShield(c); onChange(); }}>해제</button>
                        ) : (
                          <button type="button" disabled={getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId).handedness === 'twoHanded'} onClick={() => { equipShield(c, instance.instanceId); onChange(); }}>장착</button>
                        )
                      ) : isEquippedWeapon ? (
                        <span className="inventory-equipped-badge">장착 중</span>
                      ) : (
                        <button type="button" onClick={() => { equipWeapon(c, instance.instanceId); onChange(); }}>장착</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="inventory-actions">
        <button type="button" onClick={onBack}>← 팀 선택으로</button>
        <button type="button" onClick={onContinue}>전투 시작 →</button>
      </div>
    </div>
  );
}
