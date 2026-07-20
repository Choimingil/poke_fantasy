import type { Campaign } from '../game/campaign/types';
import { MAX_ROSTER, QUALITY_LABEL } from '../game/campaign/types';
import { getWeapon, weaponInstanceName } from '../game/data/weapons';
import { getArmor } from '../game/data/armor';
import { masteryTier, weaponPassiveLabel } from '../game/data/promotions';
import { maxHp } from '../game/engine/derivedStats';
import type { WeaponKind } from '../game/types';

const KIND_LABEL: Record<WeaponKind, string> = {
  sword: '검사', blunt: '둔격병', spear: '창병', bow: '궁수', crossbow: '석궁병',
  dagger: '도적', thrown: '투척병', staff: '마법사', tome: '주술사', shield: '방패',
};

export function RecruitTab({ campaign, onRecruit }: { campaign: Campaign; onRecruit: (id: string) => void }) {
  const full = campaign.roster.length >= MAX_ROSTER;
  return (
    <div className="recruit-tab">
      <p className="barracks-hint">
        현재 명성 등급의 후보가 매 라운드 새로 등장합니다. 골드로 모집하세요. (동료 {campaign.roster.length}/{MAX_ROSTER})
      </p>
      {campaign.recruits.length === 0 ? (
        <p className="tab-placeholder">이번 라운드 모집 후보를 모두 영입했습니다. 다음 라운드에 새 후보가 등장합니다.</p>
      ) : (
        <ul className="recruit-list">
          {campaign.recruits.map((cand) => {
            const c = cand.character;
            const weaponInst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!;
            const kind = getWeapon(weaponInst.templateId).kind;
            const armor = c.equippedArmorId ? getArmor(c.armor.find((a) => a.instanceId === c.equippedArmorId)!.templateId) : null;
            const passive = weaponPassiveLabel(kind);
            const hasPassive = masteryTier(c, kind) >= 5;
            const tooExpensive = campaign.gold < cand.cost;
            return (
              <li key={cand.id} className="recruit-card">
                <div className="recruit-head">
                  <strong>{c.name}</strong>
                  <span className={`quality-tag quality-${cand.quality}`}>{QUALITY_LABEL[cand.quality]}</span>
                  <span className="recruit-class">{KIND_LABEL[kind]} · Lv.{c.level}</span>
                </div>
                <div className="recruit-stats">
                  HP {maxHp(c)} · 근력 {c.baseStats.attack} · 지력 {c.baseStats.magicAttack} · 스피드 {c.baseStats.speed} · 지구력 {c.baseStats.endurance}
                </div>
                <div className="recruit-gear">
                  🗡 {weaponInstanceName(weaponInst)} · 🛡 {armor ? armor.name : '없음'}
                  {passive && <span className="recruit-passive"> · 패시브 {passive}{hasPassive ? '' : '(티어5)'}</span>}
                </div>
                <div className="recruit-foot">
                  <span className="recruit-cost">💰 {cand.cost}</span>
                  <button type="button" disabled={tooExpensive || full} onClick={() => onRecruit(cand.id)}>
                    {full ? '인원 초과' : tooExpensive ? '골드 부족' : '모집'}
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
