import { useState } from 'react';
import type { ArmorKind, SpriteGender, WeaponKind } from '../game/types';
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
  const [rerollUsed, setRerollUsed] = useState(false);

  const goTrait = () => {
    setCandidates(rollHeroTraitCandidates(weaponKind, Math.random));
    setRerollUsed(false);
    setStep('trait');
  };
  const reroll = () => {
    if (rerollUsed) return;
    setCandidates(rollHeroTraitCandidates(weaponKind, Math.random));
    setRerollUsed(true);
  };
  const pick = (traitId: string) => {
    onCreate({ heroKind: weaponKind, name: name.trim() || '주인공', gender, armorKind, traitId, traitCandidates: candidates });
  };

  if (step === 'trait') {
    return (
      <div className="app-shell setup-screen">
        <div className="inventory-header">
          <button type="button" className="link-button" onClick={() => setStep('basics')}>← 뒤로</button>
          <h1>고유 특성 선택</h1>
        </div>
        <p>후보 세 개 중 하나를 고르세요. 시작 전 <strong>한 번</strong> 전체를 다시 뽑을 수 있습니다.</p>
        <div className="trait-candidates">
          {candidates.map((id) => <TraitCard key={id} traitId={id} onClick={() => pick(id)} />)}
        </div>
        <button type="button" className="link-button" disabled={rerollUsed} onClick={reroll}>
          {rerollUsed ? '재추첨을 사용했습니다' : '🎲 무료 재추첨 (1회)'}
        </button>
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

      <button type="button" className="start-battle-button" onClick={goTrait}>특성 선택으로 →</button>
    </div>
  );
}
