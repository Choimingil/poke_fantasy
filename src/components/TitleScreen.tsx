export function TitleScreen({
  hasSave,
  onNewGame,
  onContinue,
  onSandbox,
}: {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onSandbox: () => void;
}) {
  return (
    <div className="app-shell setup-screen title-screen">
      <h1>포켓판타지</h1>
      <p className="title-sub">라운드형 전술 로그라이트 — 주인공 1명으로 시작해 명성을 쌓고 동료를 모아 강해져라.</p>
      <div className="title-actions">
        {hasSave && (
          <button type="button" onClick={onContinue}>▶ 이어하기</button>
        )}
        <button type="button" className={hasSave ? 'secondary-button' : ''} onClick={onNewGame}>
          🆕 새 게임{hasSave ? ' (저장 삭제)' : ''}
        </button>
        <button type="button" className="secondary-button" onClick={onSandbox}>⚔️ 빠른 전투 (샌드박스)</button>
      </div>
    </div>
  );
}
