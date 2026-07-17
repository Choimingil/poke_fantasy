import { useState } from 'react';
import { ROSTER, getRosterCharacter } from '../game/data/roster';
import { getWeapon } from '../game/data/weapons';
import { getArmor } from '../game/data/armor';
import { getSkill } from '../game/data/skills';
import { getUsableSkillIds, MAX_LOADOUT } from '../game/data/promotions';
import { equipArmor, equipShield, equipWeapon, unequipArmor, unequipShield } from '../game/engine/inventory';
import { carryCapacityKg, meetsEquipLevel, totalEquipmentWeightKg } from '../game/engine/equipment';
import { TrainerSprite } from './TrainerSprite';

const STAT_ROWS: { key: 'hp' | 'attack' | 'magicAttack' | 'defense' | 'speed'; label: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '근력' },
  { key: 'magicAttack', label: '지력' },
  { key: 'defense', label: '방어' },
  { key: 'speed', label: '스피드' },
];

export function InventoryScreen({ onChange, onBack }: { onChange: () => void; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(ROSTER[0].id);
  const c = getRosterCharacter(selectedId);

  const equippedWeapon = getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId);
  const weaponPool = getUsableSkillIds(c, equippedWeapon.kind);

  const setWeapon = (instanceId: string) => {
    equipWeapon(c, instanceId);
    // 새 무기로 사용할 수 없게 된 스킬은 로드아웃에서 제거한다.
    const nextKind = getWeapon(c.inventory.find((w) => w.instanceId === instanceId)!.templateId).kind;
    const nextPool = getUsableSkillIds(c, nextKind);
    c.skillLoadout = c.skillLoadout.filter((id) => nextPool.includes(id));
    onChange();
  };

  const toggleSkill = (id: string) => {
    if (c.skillLoadout.includes(id)) {
      c.skillLoadout = c.skillLoadout.filter((s) => s !== id);
    } else if (c.skillLoadout.length < MAX_LOADOUT) {
      c.skillLoadout = [...c.skillLoadout, id];
    }
    onChange();
  };

  const selectedCount = c.skillLoadout.filter((id) => weaponPool.includes(id)).length;
  const carriedWeight = totalEquipmentWeightKg(c);
  const capacity = carryCapacityKg(c);

  const setArmor = (instanceId: string) => {
    equipArmor(c, instanceId);
    onChange();
  };

  return (
    <div className="app-shell inventory-screen">
      <div className="inventory-header">
        <button type="button" className="link-button" onClick={onBack}>← 홈으로</button>
        <h1>인벤토리 · 캐릭터 세팅</h1>
      </div>

      <label className="inventory-select">
        캐릭터
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {ROSTER.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>

      <div className="inventory-body">
        <aside className="inventory-side">
          <div className="inventory-preview">
            <TrainerSprite jobId={c.spriteJob} gender={c.gender} facing="front" className="inventory-sprite" />
            <p><strong>{c.name}</strong> · Lv.{c.level}</p>
          </div>
          <div className="inventory-stats">
            <h3>능력치</h3>
            {STAT_ROWS.map(({ key, label }) => (
              <p key={key} className="stat-row"><span>{label}</span><strong>{c.baseStats[key]}</strong></p>
            ))}
            <p className="stat-row"><span>이동력</span><strong>{c.rawMove}</strong></p>
            <p className="stat-row"><span>시야</span><strong>{c.sight}</strong></p>
          </div>
        </aside>

        <section className="inventory-main">
          <h3>적재량 <span className="loadout-count">{carriedWeight}kg / {capacity}kg</span></h3>
          <p className="inventory-hint">기본 장착 장비 외에 최대 2개까지 추가로 소지할 수 있습니다. 근력 5당 적재량 1kg 증가.</p>

          <h3>무기 · 보조장비</h3>
          <ul className="inventory-weapon-list">
            {c.inventory.map((instance) => {
              const template = getWeapon(instance.templateId);
              const isEquippedWeapon = instance.instanceId === c.equippedWeaponId;
              const isEquippedShield = instance.instanceId === c.equippedShieldId;
              const canEquip = meetsEquipLevel(c, instance.level);
              return (
                <li key={instance.instanceId} className={isEquippedWeapon || isEquippedShield ? 'inventory-item-equipped' : ''}>
                  <span>{template.name} Lv.{instance.level} <em>({template.kind}{template.kind === 'staff' && instance.element ? `/${instance.element}` : ''})</em></span>
                  {template.kind === 'shield' ? (
                    isEquippedShield ? (
                      <button type="button" onClick={() => { unequipShield(c); onChange(); }}>해제</button>
                    ) : (
                      <button type="button" disabled={equippedWeapon.handedness === 'twoHanded' || !canEquip} onClick={() => { equipShield(c, instance.instanceId); onChange(); }}>{canEquip ? '장착' : `Lv.${instance.level} 필요`}</button>
                    )
                  ) : isEquippedWeapon ? (
                    <span className="inventory-equipped-badge">장착 중</span>
                  ) : (
                    <button type="button" disabled={!canEquip} onClick={() => setWeapon(instance.instanceId)}>{canEquip ? '장착' : `Lv.${instance.level} 필요`}</button>
                  )}
                </li>
              );
            })}
          </ul>

          <h3>방어구</h3>
          <ul className="inventory-weapon-list">
            {c.armor.map((instance) => {
              const template = getArmor(instance.templateId);
              const isEquippedArmor = instance.instanceId === c.equippedArmorId;
              const canEquip = meetsEquipLevel(c, instance.level);
              return (
                <li key={instance.instanceId} className={isEquippedArmor ? 'inventory-item-equipped' : ''}>
                  <span>{template.name} Lv.{instance.level} <em>({template.kind})</em></span>
                  {isEquippedArmor ? (
                    <button type="button" onClick={() => { unequipArmor(c); onChange(); }}>해제</button>
                  ) : (
                    <button type="button" disabled={!canEquip} onClick={() => setArmor(instance.instanceId)}>{canEquip ? '장착' : `Lv.${instance.level} 필요`}</button>
                  )}
                </li>
              );
            })}
          </ul>

          <h3>기술 로드아웃 <span className="loadout-count">{selectedCount} / {MAX_LOADOUT}</span></h3>
          <p className="inventory-hint">전투에 들고 갈 기술을 최대 {MAX_LOADOUT}개까지 선택하세요. (장착 무기 기준)</p>
          <ul className="skill-select-list">
            {weaponPool.map((id) => {
              const skill = getSkill(id);
              const on = c.skillLoadout.includes(id);
              const full = !on && selectedCount >= MAX_LOADOUT;
              return (
                <li key={id} className={on ? 'skill-selected' : ''}>
                  <label>
                    <input type="checkbox" checked={on} disabled={full} onChange={() => toggleSkill(id)} />
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-meta">
                      {skill.category === 'attack' ? `위력 ${skill.power}%` : skill.category} · 명중 {skill.accuracy}
                      {skill.maxUses !== undefined ? ` · ${skill.maxUses}회` : ' · ∞'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
