import type { ActiveStatus, StatusEffectType } from '../game/types';

const STATUS_LABEL: Record<StatusEffectType, string> = {
  guarding: '보호',
  taunted: '도발',
  elementEnchant: '마법부여',
  riverSurge: '급류',
  climbing: '등반',
  farSight: '천리안',
  forestVision: '투시',
  swordAwaken: '각성',
  bluntUnity: '단결',
  bowCrit: '급소',
  focused: '집중',
  legHit: '다리부상',
};

// 디버프로 취급하는 상태(붉은색)
const DEBUFFS = new Set<StatusEffectType>(['taunted', 'legHit']);

/** 현재 캐릭터의 버프/디버프와 남은 턴 수를 칩으로 표시한다. */
export function StatusChips({ effects }: { effects: ActiveStatus[] }) {
  if (effects.length === 0) return <span className="status-chips status-chips-empty">상태 없음</span>;
  return (
    <span className="status-chips">
      {effects.map((s, i) => (
        <span key={`${s.type}-${i}`} className={`status-chip ${DEBUFFS.has(s.type) ? 'status-chip-debuff' : 'status-chip-buff'}`}>
          {STATUS_LABEL[s.type]} {s.turnsRemaining}턴
        </span>
      ))}
    </span>
  );
}
