import type { Character, StatKey } from '../game/types';
import { getWeapon, weaponInstanceName } from '../game/data/weapons';
import { getArmor } from '../game/data/armor';
import { baseMoveFromEndurance } from '../game/engine/grid';
import { mentalResistChance } from '../game/engine/derivedStats';
import { TrainerSprite } from './TrainerSprite';
import { StatusChips } from './StatusChips';

const STAT_ROWS: { key: StatKey; label: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '근력' },
  { key: 'magicAttack', label: '지력' },
  { key: 'speed', label: '스피드' },
  { key: 'endurance', label: '지구력' },
];

/** 아군(비활성 포함) 캐릭터를 눌렀을 때 뜨는 정보 카드. */
export function InspectPanel({ unit, onClose }: { unit: Character; onClose: () => void }) {
  const weaponInstance = unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!;
  const weaponName = weaponInstanceName(weaponInstance);
  const shield = unit.equippedShieldId
    ? getWeapon(unit.inventory.find((w) => w.instanceId === unit.equippedShieldId)!.templateId)
    : null;
  const armor = unit.equippedArmorId
    ? getArmor(unit.armor.find((a) => a.instanceId === unit.equippedArmorId)!.templateId)
    : null;
  const move = baseMoveFromEndurance(unit.baseStats.endurance);
  const moveLabel = move.excess > 0 ? `${move.shown}+${move.excess.toFixed(1)}` : `${Math.floor(move.shown)}`;
  return (
    <div className="inspect-panel">
      <button type="button" className="inspect-close" onClick={onClose} aria-label="닫기">✕</button>
      <div className="inspect-head">
        <TrainerSprite jobId={unit.spriteJob} gender={unit.gender} facing="front" className="inspect-sprite" />
        <div>
          <p className="inspect-name"><strong>{unit.name}</strong> · Lv.{unit.level}</p>
          <p className="inspect-sub">{weaponName}{shield ? ` + ${shield.name}` : ''}{armor ? ` · ${armor.name}` : ''}</p>
          <p className="inspect-hp">HP {unit.currentHp} / {unit.baseStats.hp}</p>
        </div>
      </div>
      <div className="inspect-stats">
        {STAT_ROWS.map(({ key, label }) => (
          <span key={key} className="inspect-stat"><span>{label}</span><strong>{unit.baseStats[key]}</strong></span>
        ))}
        <span className="inspect-stat"><span>이동</span><strong>{moveLabel}</strong></span>
        <span className="inspect-stat"><span>시야</span><strong>{unit.sight}</strong></span>
        <span className="inspect-stat"><span>정신력</span><strong>{Math.round(mentalResistChance(unit) * 100)}%</strong></span>
      </div>
      <StatusChips effects={unit.statusEffects} />
    </div>
  );
}
