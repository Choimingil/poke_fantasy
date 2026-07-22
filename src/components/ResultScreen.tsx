import type { Character } from '../game/types';
import type { KillEvent, Side } from '../game/engine/battle';
import type { LevelUpResult } from '../game/engine/leveling';
import { RATING_LABEL, type BattleRating } from '../game/campaign/objectives';

export function ResultScreen({
  winner,
  killEvents,
  levelUpEvents,
  allUnits,
  onRestart,
  reward,
  onContinue,
}: {
  winner: Side | null;
  killEvents: KillEvent[];
  levelUpEvents: LevelUpResult[];
  allUnits: Character[];
  onRestart?: () => void;
  reward?: { reputationGained: number; goldGained: number; won: boolean; bossDefeated: boolean; rating?: BattleRating | null };
  onContinue?: () => void;
}) {
  const nameOf = (id: string) => allUnits.find((u) => u.id === id)?.name ?? id;
  const playerWon = winner === 'A';

  return (
    <div className="app-shell setup-screen">
      <h1>전투 종료</h1>
      {reward ? (
        <p className="result-winner">{playerWon ? '승리!' : '패배...'}</p>
      ) : (
        <p className="result-winner">{winner ? `${winner === 'A' ? 'A팀' : 'B팀'} 승리!` : '무승부'}</p>
      )}
      {reward?.rating && (
        <p className={`result-rating rating-${reward.rating}`}>⭐ {RATING_LABEL[reward.rating]}</p>
      )}
      {reward && (
        <div className="result-reward">
          {reward.bossDefeated && <span className="boss-warning">👑 보스 처치!</span>}
          <span>🏅 명성 +{reward.reputationGained}</span>
          <span>💰 골드 +{reward.goldGained}</span>
          {!reward.won && <span className="result-retry-note">패배 시 라운드는 진행되지 않습니다. 정비 후 재도전하세요.</span>}
        </div>
      )}
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
      {onContinue ? (
        <button type="button" onClick={onContinue}>정비로 →</button>
      ) : (
        <button type="button" onClick={onRestart}>다시 하기</button>
      )}
    </div>
  );
}
