import { useState } from 'react';
import './App.css';
import { TeamSetupScreen } from './components/TeamSetupScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { GridBattleScreen } from './components/GridBattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { cloneForBattle } from './game/data/roster';
import type { GridBattle } from './game/engine/battle';
import type { Character } from './game/types';

type Screen = 'home' | 'inventory' | 'battle' | 'result';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [battleTeamA, setBattleTeamA] = useState<Character[]>([]);
  const [battleTeamB, setBattleTeamB] = useState<Character[]>([]);
  const [finishedBattle, setFinishedBattle] = useState<GridBattle | null>(null);
  const [, setInventoryTick] = useState(0);

  const startBattle = () => {
    // 인벤토리에서 편집된 로스터 인스턴스를 전투용으로 복제(양 팀 중복 선택 대비 고유 id 부여).
    setBattleTeamA(teamAIds.map((id, i) => cloneForBattle(id, `A${i}-${id}`)));
    setBattleTeamB(teamBIds.map((id, i) => cloneForBattle(id, `B${i}-${id}`)));
    setFinishedBattle(null);
    setScreen('battle');
  };

  const restart = () => {
    setFinishedBattle(null);
    setScreen('home');
  };

  if (screen === 'home') {
    return (
      <TeamSetupScreen
        teamAIds={teamAIds}
        teamBIds={teamBIds}
        onChangeTeamA={setTeamAIds}
        onChangeTeamB={setTeamBIds}
        onStart={startBattle}
        onOpenInventory={() => setScreen('inventory')}
      />
    );
  }

  if (screen === 'inventory') {
    return <InventoryScreen onChange={() => setInventoryTick((t) => t + 1)} onBack={() => setScreen('home')} />;
  }

  if (screen === 'battle') {
    return (
      <GridBattleScreen
        teamA={battleTeamA}
        teamB={battleTeamB}
        onFinished={(battle) => {
          setFinishedBattle(battle);
          setScreen('result');
        }}
      />
    );
  }

  if (screen === 'result' && finishedBattle) {
    return (
      <ResultScreen
        winner={finishedBattle.winner}
        killEvents={finishedBattle.killEvents}
        levelUpEvents={finishedBattle.levelUpEvents}
        allUnits={[...finishedBattle.teamA, ...finishedBattle.teamB]}
        onRestart={restart}
      />
    );
  }

  return null;
}

export default App;
