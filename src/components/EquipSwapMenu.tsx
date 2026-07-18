import type { Character } from '../game/types';
import { getWeapon } from '../game/data/weapons';
import { getArmor, armorDefense } from '../game/data/armor';
import { meetsEquipLevel } from '../game/engine/equipment';

interface SwapCandidate {
  kind: 'weapon' | 'armor';
  instanceId: string;
}

/** 전투 중 장비 교체 창: 보유 무기/방어구를 보여주고 하나를 골라 완료하면 교체(턴 종료). */
export function EquipSwapMenu({
  unit,
  selected,
  onSelect,
  onConfirm,
  onClose,
}: {
  unit: Character;
  selected: SwapCandidate | null;
  onSelect: (c: SwapCandidate) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isSelected = (kind: 'weapon' | 'armor', id: string) => selected?.kind === kind && selected.instanceId === id;

  return (
    <div className="equip-menu">
      <div className="equip-menu-header">
        <strong>장비 교체</strong>
        <button type="button" className="inspect-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <p className="equip-menu-section">무기</p>
      <ul className="equip-menu-list">
        {unit.inventory
          .filter((w) => getWeapon(w.templateId).kind !== 'shield')
          .map((w) => {
            const tpl = getWeapon(w.templateId);
            const equipped = w.instanceId === unit.equippedWeaponId;
            const locked = !equipped && !meetsEquipLevel(unit, w.level);
            const on = isSelected('weapon', w.instanceId);
            return (
              <li key={w.instanceId}>
                <button
                  type="button"
                  className={`equip-item${on ? ' equip-item-selected' : ''}`}
                  disabled={equipped || locked}
                  onClick={() => onSelect({ kind: 'weapon', instanceId: w.instanceId })}
                >
                  <span>{tpl.name} <em>({tpl.kind} · 사거리 {tpl.range})</em></span>
                  <span className="equip-item-meta">
                    Lv.{w.level}
                    {equipped ? ' · 장착 중' : locked ? ` · 🔒 Lv.${w.level} 필요` : ''}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>

      <p className="equip-menu-section">방어구</p>
      <ul className="equip-menu-list">
        {unit.armor.map((a) => {
          const tpl = getArmor(a.templateId);
          const equipped = a.instanceId === unit.equippedArmorId;
          const locked = !equipped && !meetsEquipLevel(unit, a.level);
          const on = isSelected('armor', a.instanceId);
          return (
            <li key={a.instanceId}>
              <button
                type="button"
                className={`equip-item${on ? ' equip-item-selected' : ''}`}
                disabled={equipped || locked}
                onClick={() => onSelect({ kind: 'armor', instanceId: a.instanceId })}
              >
                <span>{tpl.name} <em>(방어 {armorDefense(a.level, tpl.kind)})</em></span>
                <span className="equip-item-meta">
                  Lv.{a.level}
                  {equipped ? ' · 장착 중' : locked ? ` · 🔒 Lv.${a.level} 필요` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="equip-menu-actions">
        <button type="button" onClick={onClose}>취소</button>
        <button type="button" disabled={!selected} onClick={onConfirm}>완료 (턴 종료)</button>
      </div>
    </div>
  );
}
