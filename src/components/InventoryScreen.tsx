import { useState } from 'react';
import type { ArmorInstance, Character, StatKey, WeaponInstance } from '../game/types';
import { ROSTER } from '../game/data/roster';
import { canWieldTwoHanded, getWeapon, TWO_HANDED_POWER_MULT, weaponInstanceName, effectiveWeaponPower } from '../game/data/weapons';
import { getArmor } from '../game/data/armor';
import { MAX_ENHANCE, enhanceCost } from '../game/data/enhance';
import { getSkill, skillDisplayName, skillTypeLabel } from '../game/data/skills';
import { getUsableSkillIds, MAX_LOADOUT } from '../game/data/promotions';
import { equipArmor, equipShield, equipWeapon, unequipArmor, unequipShield } from '../game/engine/inventory';
import { carryCapacityKg, meetsEquipLevel, totalEquipmentWeightKg } from '../game/engine/equipment';
import { baseMoveFromEndurance } from '../game/engine/grid';
import { mentalResistChance } from '../game/engine/derivedStats';
import { spendStatPoint } from '../game/engine/leveling';
import { TrainerSprite } from './TrainerSprite';

const STAT_ROWS: { key: StatKey; label: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '근력' },
  { key: 'magicAttack', label: '지력' },
  { key: 'speed', label: '스피드' },
  { key: 'endurance', label: '지구력' },
];

interface StashProps {
  stash?: { weapons: WeaponInstance[]; armor: ArmorInstance[] };
  onEquipStashWeapon?: (charId: string, instanceId: string) => void;
  onEquipStashArmor?: (charId: string, instanceId: string) => void;
  onSellStashWeapon?: (instanceId: string) => void;
  onSellStashArmor?: (instanceId: string) => void;
  /** 캠페인 강화(§32): 골드·재료 잔량과 강화 콜백. */
  gold?: number;
  materials?: number;
  onEnhance?: (instanceId: string) => void;
}

export function InventoryScreen({ characters, onChange, onBack, stash, onEquipStashWeapon, onEquipStashArmor, onSellStashWeapon, onSellStashArmor, gold, materials, onEnhance }: { characters?: Character[]; onChange: () => void; onBack?: () => void } & StashProps) {
  const roster = characters ?? ROSTER;
  const [selectedId, setSelectedId] = useState(roster[0].id);
  const c = roster.find((x) => x.id === selectedId) ?? roster[0];

  // §32 장비 강화 버튼(캠페인 정비에서만; onEnhance가 있을 때).
  const enhanceControl = (inst: WeaponInstance | ArmorInstance) => {
    if (!onEnhance) return inst.enhanceLevel ? <span className="enh-badge">+{inst.enhanceLevel}</span> : null;
    const lvl = inst.enhanceLevel ?? 0;
    if (lvl >= MAX_ENHANCE) return <span className="enh-badge">+{lvl} 최대</span>;
    const cost = enhanceCost(inst.level, lvl, c.traitId === 'thrifty');
    const afford = (gold ?? 0) >= cost.gold && (materials ?? 0) >= cost.materials;
    return (
      <button type="button" className="enh-button" disabled={!afford} onClick={() => onEnhance(inst.instanceId)}>
        {lvl > 0 ? `+${lvl} ` : ''}강화 (💰{cost.gold}·🔩{cost.materials})
      </button>
    );
  };

  const equippedInstance = c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!;
  const equippedWeapon = getWeapon(equippedInstance.templateId);
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

  const allocateStat = (stat: StatKey) => {
    spendStatPoint(c, stat);
    onChange();
  };

  const move = baseMoveFromEndurance(c.baseStats.endurance);
  const moveLabel = move.excess > 0 ? `${move.shown}+${move.excess.toFixed(1)}` : `${Math.floor(move.shown)}`;

  return (
    <div className="app-shell inventory-screen">
      <div className="inventory-header">
        {onBack && <button type="button" className="link-button" onClick={onBack}>← 뒤로</button>}
        <h1>인벤토리 · 캐릭터 세팅</h1>
      </div>

      <label className="inventory-select">
        캐릭터
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {roster.map((r) => (
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
            <h3>능력치 {c.unspentStatPoints > 0 && <span className="loadout-count">분배 가능 {c.unspentStatPoints}</span>}</h3>
            {STAT_ROWS.map(({ key, label }) => (
              <p key={key} className="stat-row">
                <span>{label}</span>
                <strong>{c.baseStats[key]}</strong>
                {c.unspentStatPoints > 0 && (
                  <button type="button" className="stat-plus-button" onClick={() => allocateStat(key)}>+</button>
                )}
              </p>
            ))}
            <p className="stat-row"><span>이동력</span><strong>{moveLabel}</strong></p>
            <p className="stat-row"><span>시야</span><strong>{c.sight}</strong></p>
            <p className="stat-row"><span>정신력</span><strong>{Math.round(mentalResistChance(c) * 100)}%</strong></p>
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
              const eligibleTwoHanded = canWieldTwoHanded(template.kind);
              const twoHandedActive = isEquippedWeapon && eligibleTwoHanded && !c.equippedShieldId;
              const basePower = effectiveWeaponPower(instance.level, template.kind, true, instance.enhanceLevel ?? 0, c.traitId === 'repairer');
              const shownPower = Math.floor(basePower * (twoHandedActive ? TWO_HANDED_POWER_MULT : 1));
              return (
                <li key={instance.instanceId} className={isEquippedWeapon || isEquippedShield ? 'inventory-item-equipped' : ''}>
                  <span>
                    {weaponInstanceName(instance)} Lv.{instance.level}{' '}
                    <em>({template.kind}{template.kind !== 'shield' ? `, 공격력 ${shownPower}` : ''})</em>
                    {eligibleTwoHanded && (
                      <span className="two-handed-badge">{twoHandedActive ? '양손 ×1.3 적용' : '양손 시 ×1.3'}</span>
                    )}
                  </span>
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
                  {enhanceControl(instance)}
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
                  {enhanceControl(instance)}
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
                    <span className="skill-name">
                      {skillDisplayName(skill, equippedInstance.element)} <span className={`skill-type type-${skillTypeLabel(skill)}`}>{skillTypeLabel(skill)}</span>
                    </span>
                    <span className="skill-meta">
                      {skill.power > 0 ? `위력 ${skill.power}%` : skill.category} · 명중 {skill.accuracy}
                      {skill.maxUses !== undefined ? ` · ${skill.maxUses}회` : ' · ∞'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {stash && (
            <>
              <h3>보관함 (상점 구매·해제 장비)</h3>
              <p className="inventory-hint">보관함 장비를 선택한 캐릭터에 장착하거나 판매할 수 있습니다. (현재 캐릭터: {c.name})</p>
              <ul className="inventory-weapon-list">
                {stash.weapons.length === 0 && stash.armor.length === 0 && <li><span>보관함이 비어 있습니다.</span></li>}
                {stash.weapons.map((w) => {
                  const t = getWeapon(w.templateId);
                  const canEquip = meetsEquipLevel(c, w.level);
                  return (
                    <li key={w.instanceId}>
                      <span>{weaponInstanceName(w)} Lv.{w.level} <em>({t.kind})</em></span>
                      <span className="stash-actions">
                        <button type="button" disabled={!canEquip} onClick={() => onEquipStashWeapon?.(c.id, w.instanceId)}>{canEquip ? '장착' : `Lv.${w.level} 필요`}</button>
                        <button type="button" className="sell-button" onClick={() => onSellStashWeapon?.(w.instanceId)}>판매</button>
                      </span>
                    </li>
                  );
                })}
                {stash.armor.map((a) => {
                  const t = getArmor(a.templateId);
                  const canEquip = meetsEquipLevel(c, a.level);
                  return (
                    <li key={a.instanceId}>
                      <span>{t.name} Lv.{a.level} <em>({t.kind})</em></span>
                      <span className="stash-actions">
                        <button type="button" disabled={!canEquip} onClick={() => onEquipStashArmor?.(c.id, a.instanceId)}>{canEquip ? '장착' : `Lv.${a.level} 필요`}</button>
                        <button type="button" className="sell-button" onClick={() => onSellStashArmor?.(a.instanceId)}>판매</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
