import { useState } from 'react';
import type { WeaponKind } from '../game/types';
import { rollHeroTraitCandidates } from '../game/data/traits';
import { TraitCard } from './HeroCreateScreen';

/**
 * 튜토리얼(1라운드) 종료 후 특성 재확인(§43.13): 현재 특성 유지 / 시작 시 고르지 않은 후보로 변경 /
 * 새 후보 3개 생성 후 하나 선택. 이 절차 이후에는 특성을 변경할 수 없다.
 */
export function HeroTraitConfirmScreen({
  heroKind,
  currentTraitId,
  originalCandidates,
  onConfirm,
  onKeep,
}: {
  heroKind: WeaponKind;
  currentTraitId: string;
  originalCandidates: string[];
  onConfirm: (traitId: string) => void;
  onKeep: () => void;
}) {
  const [fresh, setFresh] = useState<string[] | null>(null);
  const notChosen = originalCandidates.filter((id) => id !== currentTraitId);

  return (
    <div className="app-shell setup-screen">
      <h1>특성 재확인</h1>
      <p>튜토리얼을 마쳤습니다. 특성을 <strong>한 번만</strong> 다시 정할 수 있습니다. 이후에는 변경할 수 없습니다.</p>

      <h3>현재 특성 유지</h3>
      <div className="trait-candidates">
        <TraitCard traitId={currentTraitId} selected />
      </div>
      <button type="button" className="start-battle-button" onClick={onKeep}>이 특성 유지 →</button>

      {notChosen.length > 0 && !fresh && (
        <>
          <h3>시작 시 고르지 않았던 후보로 변경</h3>
          <div className="trait-candidates">
            {notChosen.map((id) => <TraitCard key={id} traitId={id} onClick={() => onConfirm(id)} />)}
          </div>
        </>
      )}

      {!fresh ? (
        <button type="button" className="link-button" onClick={() => setFresh(rollHeroTraitCandidates(heroKind, Math.random))}>
          🎲 새 후보 3개 생성(1회)
        </button>
      ) : (
        <>
          <h3>새 후보 중 선택</h3>
          <div className="trait-candidates">
            {fresh.map((id) => <TraitCard key={id} traitId={id} onClick={() => onConfirm(id)} />)}
          </div>
        </>
      )}
    </div>
  );
}
