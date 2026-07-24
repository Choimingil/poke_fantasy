import { useState } from 'react';
import type { ArmorKind, SpriteGender, StatBlock, WeaponKind } from '../game/types';
import { PLAYABLE_WEAPON_KINDS } from '../game/data/weapons';
import { rollHeroTraitCandidates, getTrait, TRAIT_CATEGORY_LABEL } from '../game/data/traits';
import { WIRED_TRAIT_IDS } from '../game/engine/traitEffects';
import type { HeroSetup } from '../game/campaign/state';

// 무기 기준 선택(직업명이 아니라 무기 종류로 고른다). name = 무기, desc = 특성 요약.
const CLASS_INFO: Partial<Record<WeaponKind, { name: string; desc: string }>> = {
  sword: { name: '검', desc: '근력 기반 근접. 반월참·일섬·섬광참.' },
  blunt: { name: '둔기', desc: '높은 체력·근력. 다리타격·밀쳐내기·광역보호.' },
  spear: { name: '창', desc: '관통·봉쇄·돌진. 패시브 반격.' },
  bow: { name: '활', desc: '원거리·높은 스피드. 천궁·도약사격·저격.' },
  crossbow: { name: '석궁', desc: '방어 관통·고정피해. 철갑·관통·치명사격.' },
  dagger: { name: '단검', desc: '최고 스피드. 기습·은신·축지.' },
  thrown: { name: '투척 무기', desc: '맹독·분신·쇄상. 패시브 협공.' },
  staff: { name: '지팡이', desc: '지력 기반 속성 마법. 원소탄·약화·원소폭풍.' },
  tome: { name: '마도서', desc: '치료·정화·재행동 지원.' },
};

/** 레벨1 능력치: 각 1에서 시작해 남은 23을 무작위 분배(합 28 = 기본 25 + 3, 각 스탯 1~15). 주사위로 재분배. */
const STAT_ROWS: { key: keyof StatBlock; label: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '공격' },
  { key: 'magicAttack', label: '마법공격' },
  { key: 'speed', label: '스피드' },
  { key: 'endurance', label: '지구력' },
];
const STAT_MIN = 1;
const STAT_MAX = 15;
const STAT_TOTAL = 28; // 기본 능력치 합(25) + 3
function rollStats(rng: () => number = Math.random): StatBlock {
  const s: StatBlock = { hp: STAT_MIN, attack: STAT_MIN, magicAttack: STAT_MIN, speed: STAT_MIN, endurance: STAT_MIN };
  let remaining = STAT_TOTAL - STAT_MIN * STAT_ROWS.length; // 남은 배분 포인트(30)
  while (remaining > 0) {
    // 아직 상한(15)에 닿지 않은 스탯 중 무작위로 골라 1점 배분한다.
    const open = STAT_ROWS.filter((r) => s[r.key] < STAT_MAX);
    if (open.length === 0) break;
    const row = open[Math.floor(rng() * open.length)];
    s[row.key] += 1;
    remaining -= 1;
  }
  return s;
}

/** 특성 후보 카드(선택 가능). */
export function TraitCard({ traitId, selected, onClick }: { traitId: string; selected?: boolean; onClick?: () => void }) {
  const trait = getTrait(traitId);
  if (!trait) return null;
  return (
    <button type="button" className={`trait-card${selected ? ' trait-card-selected' : ''}`} onClick={onClick} disabled={!onClick}>
      <span className="trait-card-head">
        <strong>{trait.name}</strong>
        <span className="trait-tag">{TRAIT_CATEGORY_LABEL[trait.category]}</span>
        {WIRED_TRAIT_IDS.has(trait.id) && <span className="trait-live">효과 반영</span>}
      </span>
      <span className="trait-card-effect">{trait.effect}</span>
    </button>
  );
}

export function HeroCreateScreen({ onCreate, onBack }: { onCreate: (setup: HeroSetup) => void; onBack: () => void }) {
  const [step, setStep] = useState<'basics' | 'trait'>('basics');
  const [name, setName] = useState('주인공');
  const [gender, setGender] = useState<SpriteGender>('male');
  const [weaponKind, setWeaponKind] = useState<WeaponKind>('sword');
  const [armorKind, setArmorKind] = useState<ArmorKind>('cloth');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [stats, setStats] = useState<StatBlock>(() => rollStats());

  const goTrait = () => {
    setCandidates(rollHeroTraitCandidates(weaponKind, Math.random));
    setStep('trait');
  };
  // 특성 재추첨: 횟수 제한 없음.
  const reroll = () => {
    setCandidates(rollHeroTraitCandidates(weaponKind, Math.random));
  };
  const pick = (traitId: string) => {
    onCreate({ heroKind: weaponKind, name: name.trim() || '주인공', gender, armorKind, traitId, traitCandidates: candidates, baseStats: stats });
  };

  if (step === 'trait') {
    return (
      <div className="app-shell setup-screen">
        <div className="inventory-header">
          <button type="button" className="link-button" onClick={() => setStep('basics')}>← 뒤로</button>
          <h1>고유 특성 선택</h1>
        </div>
        <p>후보 세 개 중 하나를 고르세요. 마음에 들 때까지 <strong>몇 번이든</strong> 다시 뽑을 수 있습니다.</p>
        <div className="trait-candidates">
          {candidates.map((id) => <TraitCard key={id} traitId={id} onClick={() => pick(id)} />)}
        </div>
        <button type="button" className="link-button" onClick={reroll}>🎲 다시 뽑기</button>
      </div>
    );
  }

  return (
    <div className="app-shell setup-screen">
      <div className="inventory-header">
        <button type="button" className="link-button" onClick={onBack}>← 뒤로</button>
        <h1>주인공 생성</h1>
      </div>
      <p>레벨 1 주인공 1명으로 캠페인을 시작합니다(전직 없음·숙련 초보).</p>

      <label className="hero-field">이름
        <input type="text" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="hero-field">성별
        <div className="hero-toggle">
          <button type="button" className={gender === 'male' ? 'toggle-on' : ''} onClick={() => setGender('male')}>남</button>
          <button type="button" className={gender === 'female' ? 'toggle-on' : ''} onClick={() => setGender('female')}>여</button>
        </div>
      </div>

      <div className="hero-field">초기 방어구
        <div className="hero-toggle">
          <button type="button" className={armorKind === 'cloth' ? 'toggle-on' : ''} onClick={() => setArmorKind('cloth')}>천(가벼움)</button>
          <button type="button" className={armorKind === 'leather' ? 'toggle-on' : ''} onClick={() => setArmorKind('leather')}>가죽(균형)</button>
        </div>
      </div>

      <h3>무기 선택</h3>
      <div className="class-grid">
        {PLAYABLE_WEAPON_KINDS.map((kind) => {
          const info = CLASS_INFO[kind];
          if (!info) return null;
          return (
            <button key={kind} type="button" className={`class-card${weaponKind === kind ? ' class-card-selected' : ''}`} onClick={() => setWeaponKind(kind)}>
              <strong>{info.name}</strong>
              <span className="class-card-desc">{info.desc}</span>
            </button>
          );
        })}
      </div>

      <h3>능력치 (무작위 분배)</h3>
      <p className="inventory-hint">총합 28을 무작위 분배합니다(각 스탯 1~15). 🎲로 몇 번이든 다시 굴릴 수 있습니다.</p>
      <div className="hero-stats-roll">
        {STAT_ROWS.map((row) => (
          <div key={row.key} className="hero-stat-row">
            <span className="hero-stat-label">{row.label}</span>
            <span className="hero-stat-value">{stats[row.key]}</span>
          </div>
        ))}
        <button type="button" className="link-button" onClick={() => setStats(rollStats())}>🎲 능력치 다시 굴리기</button>
      </div>

      <button type="button" className="start-battle-button" onClick={goTrait}>특성 선택으로 →</button>
    </div>
  );
}
