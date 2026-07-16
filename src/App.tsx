import { useState } from 'react';
import './App.css';
import { TeamSetupScreen } from './components/TeamSetupScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { GridBattleScreen } from './components/GridBattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { cloneRosterCharacter } from './game/data/roster';
import type { GridBattle } from './game/engine/battle';
import type { Character } from './game/types';

type Screen = 'teamSetup' | 'inventory' | 'battle' | 'result';

function App() {
  const [screen, setScreen] = useState<Screen>('teamSetup');
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [workingTeamA, setWorkingTeamA] = useState<Character[]>([]);
  const [workingTeamB, setWorkingTeamB] = useState<Character[]>([]);
  const [finishedBattle, setFinishedBattle] = useState<GridBattle | null>(null);
  const [, setInventoryTick] = useState(0);

  const goToInventory = () => {
    setWorkingTeamA(teamAIds.map((id) => cloneRosterCharacter(id)));
    setWorkingTeamB(teamBIds.map((id) => cloneRosterCharacter(id)));
    setScreen('inventory');
  };

  const startBattle = () => {
    setFinishedBattle(null);
    setScreen('battle');
  };

  const restart = () => {
    setFinishedBattle(null);
    setScreen('teamSetup');
  };

  if (screen === 'teamSetup') {
    return (
      <TeamSetupScreen
        teamAIds={teamAIds}
        teamBIds={teamBIds}
        onChangeTeamA={setTeamAIds}
        onChangeTeamB={setTeamBIds}
        onStart={goToInventory}
      />
    );
  }

  if (screen === 'inventory') {
    return (
      <InventoryScreen
        party={workingTeamA}
        onChange={() => setInventoryTick((t) => t + 1)}
        onContinue={startBattle}
        onBack={() => setScreen('teamSetup')}
      />
    );
  }

  if (screen === 'battle') {
    return (
      <GridBattleScreen
        teamA={workingTeamA}
        teamB={workingTeamB}
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
