import { ROSTER } from '../game/data/roster';

const MAX_TEAM_SIZE = 4;

function toggle(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((i) => i !== id);
  if (ids.length >= MAX_TEAM_SIZE) return ids;
  return [...ids, id];
}

export function TeamSetupScreen({
  teamAIds,
  teamBIds,
  onChangeTeamA,
  onChangeTeamB,
  onStart,
  onOpenInventory,
}: {
  teamAIds: string[];
  teamBIds: string[];
  onChangeTeamA: (ids: string[]) => void;
  onChangeTeamB: (ids: string[]) => void;
  onStart: () => void;
  onOpenInventory: () => void;
}) {
  const canStart = teamAIds.length > 0 && teamBIds.length > 0;

  return (
    <div className="app-shell setup-screen">
      <h1>포켓판타지 - 그리드 전술 전투</h1>
      <p>팀당 최대 {MAX_TEAM_SIZE}명까지 선택하세요. A팀은 직접 조작, B팀은 AI가 조작합니다.</p>
      <div className="team-setup-columns">
        <div className="team-setup-column">
          <h2>A팀 (플레이어)</h2>
          <ul className="roster-list">
            {ROSTER.map((c) => (
              <li key={c.id}>
                <label>
                  <input type="checkbox" checked={teamAIds.includes(c.id)} onChange={() => onChangeTeamA(toggle(teamAIds, c.id))} />
                  {c.name} (Lv.{c.level})
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="team-setup-column">
          <h2>B팀 (AI)</h2>
          <ul className="roster-list">
            {ROSTER.map((c) => (
              <li key={c.id}>
                <label>
                  <input type="checkbox" checked={teamBIds.includes(c.id)} onChange={() => onChangeTeamB(toggle(teamBIds, c.id))} />
                  {c.name} (Lv.{c.level})
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="home-actions">
        <button type="button" className="secondary-button" onClick={onOpenInventory}>
          🎒 인벤토리 (능력치·기술·무기)
        </button>
        <button type="button" disabled={!canStart} onClick={onStart}>
          ⚔️ 전투 시작 →
        </button>
      </div>
    </div>
  );
}
