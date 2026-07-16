import type { Character } from '../game/types';
import type { KillEvent, Side } from '../game/engine/battle';
import type { LevelUpResult } from '../game/engine/leveling';

export function ResultScreen({
  winner,
  killEvents,
  levelUpEvents,
  allUnits,
  onRestart,
}: {
  winner: Side | null;
  killEvents: KillEvent[];
  levelUpEvents: LevelUpResult[];
  allUnits: Character[];
  onRestart: () => void;
}) {
  const nameOf = (id: string) => allUnits.find((u) => u.id === id)?.name ?? id;

  return (
    <div className="app-shell setup-screen">
      <h1>전투 종료</h1>
      <p className="result-winner">{winner ? `${winner === 'A' ? 'A팀' : 'B팀'} 승리!` : '무승부'}</p>
      <div className="result-panel">
        <h2>처치 기록</h2>
        {killEvents.length === 0 ? (
          <p>처치 기록이 없습니다.</p>
        ) : (
          <ul>
            {killEvents.map((k, i) => (
              <li key={i}>{nameOf(k.killerId)}가 {nameOf(k.victimId)}를 처치했다.</li>
            ))}
          </ul>
        )}
        <h2>경험치 / 레벨업</h2>
        {levelUpEvents.length === 0 ? (
          <p>레벨업이 없습니다.</p>
        ) : (
          <ul>
            {levelUpEvents.map((l, i) => (
              <li key={i}>
                {nameOf(l.characterId)}가 Lv.{l.newLevel}로 레벨업!{l.promotionPointsGained > 0 ? ' (전직 포인트 +1)' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={onRestart}>
        다시 하기
      </button>
    </div>
  );
}
