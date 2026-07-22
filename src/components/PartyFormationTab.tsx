import type { Campaign } from '../game/campaign/types';
import { MAX_DEPLOY } from '../game/campaign/types';
import { ENEMY_THEME_LABEL } from '../game/campaign/types';
import { themeForRound, isBossRound, enemyLevelForRound, enemyCountForRound } from '../game/campaign/enemyParty';
import { getWeapon, weaponInstanceName } from '../game/data/weapons';
import { getArmor } from '../game/data/armor';
import { getSkill, skillDisplayName } from '../game/data/skills';
import { objectivesForRound, primaryObjectiveLabel, optionalObjectiveLabel } from '../game/campaign/objectives';
import { maxHp } from '../game/engine/derivedStats';
import type { Character, WeaponKind } from '../game/types';

const KIND_LABEL: Record<WeaponKind, string> = {
  sword: '검사', blunt: '둔격병', spear: '창병', bow: '궁수', crossbow: '석궁병',
  dagger: '도적', thrown: '투척병', staff: '마법사', tome: '주술사', shield: '방패',
};

function equippedKind(c: Character): WeaponKind {
  return getWeapon(c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!.templateId).kind;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function PartyFormationTab({
  campaign,
  onSetDeployed,
  onStartBattle,
}: {
  campaign: Campaign;
  onSetDeployed: (ids: string[]) => void;
  onStartBattle: () => void;
}) {
  const theme = themeForRound(campaign.round);
  const boss = isBossRound(campaign.round);
  const deployed = campaign.deployedIds.map((id) => campaign.roster.find((c) => c.id === id)).filter((c): c is Character => !!c);
  const benched = campaign.roster.filter((c) => !campaign.deployedIds.includes(c.id));

  const remove = (id: string) => onSetDeployed(campaign.deployedIds.filter((i) => i !== id));
  const add = (id: string) => {
    if (campaign.deployedIds.length >= MAX_DEPLOY) return;
    onSetDeployed([...campaign.deployedIds, id]);
  };
  const reorder = (index: number, dir: -1 | 1) => onSetDeployed(move(campaign.deployedIds, index, index + dir));

  const detail = (c: Character) => {
    const wInst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId)!;
    const armor = c.equippedArmorId ? getArmor(c.armor.find((a) => a.instanceId === c.equippedArmorId)!.templateId) : null;
    const skills = c.skillLoadout.map((id) => skillDisplayName(getSkill(id), wInst.element)).join(', ') || '없음';
    return (
      <div className="party-detail">
        <div>🗡 {weaponInstanceName(wInst)} · 🛡 {armor ? armor.name : '없음'}</div>
        <div className="party-skills">기술: {skills}</div>
      </div>
    );
  };

  return (
    <div className="party-tab">
      <p className="barracks-hint">
        다음 전투: <strong>{campaign.round}라운드</strong> · {ENEMY_THEME_LABEL[theme]} · 적 Lv.{enemyLevelForRound(campaign.round)} × {enemyCountForRound(campaign.round)}
        {boss && <span className="boss-warning"> · ⚠ 보스 등장(처치 시 명성 +50·골드 +100)</span>}
      </p>
      <p className="barracks-hint objective-hint">
        🎯 기본 목표: <strong>{primaryObjectiveLabel(objectivesForRound(campaign.round))}</strong>
        {' · '}선택 목표: {optionalObjectiveLabel(objectivesForRound(campaign.round))}
        <span className="objective-note"> (완전/압도적 승리 시 추가 보상)</span>
      </p>

      <h3>출전 편성 <span className="loadout-count">{deployed.length}/{MAX_DEPLOY} · 위쪽이 왼쪽 배치</span></h3>
      {deployed.length === 0 ? (
        <p className="barracks-hint">대기 인원에서 출전시킬 동료를 추가하세요.</p>
      ) : (
        <ul className="formation-list">
          {deployed.map((c, i) => (
            <li key={c.id} className="deploy-on">
              <div className="formation-row">
                <span className="formation-slot">{i + 1}번</span>
                <span className="formation-name"><strong>{c.name}</strong> · {KIND_LABEL[equippedKind(c)]} · Lv.{c.level}</span>
                <span className="formation-controls">
                  <button type="button" disabled={i === 0} onClick={() => reorder(i, -1)}>↑</button>
                  <button type="button" disabled={i === deployed.length - 1} onClick={() => reorder(i, 1)}>↓</button>
                  <button type="button" className="sell-button" onClick={() => remove(c.id)}>제외</button>
                </span>
              </div>
              {detail(c)}
            </li>
          ))}
        </ul>
      )}

      <h3>대기 인원 <span className="loadout-count">{benched.length}명</span></h3>
      <ul className="deploy-list">
        {benched.map((c) => (
          <li key={c.id}>
            <span><strong>{c.name}</strong> · {KIND_LABEL[equippedKind(c)]} · Lv.{c.level}
              <span className="deploy-stats">HP {maxHp(c)} · 근 {c.baseStats.attack} · 지 {c.baseStats.magicAttack} · 속 {c.baseStats.speed}</span>
            </span>
            <button type="button" disabled={campaign.deployedIds.length >= MAX_DEPLOY} onClick={() => add(c.id)}>출전</button>
          </li>
        ))}
        {benched.length === 0 && <li><span>대기 인원이 없습니다.</span></li>}
      </ul>

      <button type="button" className="start-battle-button" disabled={deployed.length === 0} onClick={onStartBattle}>
        ⚔️ {campaign.round}라운드 전투 시작 →
      </button>
    </div>
  );
}
