import { useState } from 'react';
import './App.css';
import { TitleScreen } from './components/TitleScreen';
import { ClassSelectScreen } from './components/ClassSelectScreen';
import { BarracksScreen } from './components/BarracksScreen';
import { TeamSetupScreen } from './components/TeamSetupScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { GridBattleScreen } from './components/GridBattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { cloneForBattle } from './game/data/roster';
import type { GridBattle } from './game/engine/battle';
import type { Character, WeaponKind } from './game/types';
import type { Campaign } from './game/campaign/types';
import { loadCampaign, saveCampaign, clearCampaign } from './game/campaign/storage';
import { newCampaign, outcomeFromBattle, settleBattle } from './game/campaign/state';
import { generateEnemyParty } from './game/campaign/enemyParty';

type Screen =
  | 'title'
  | 'class'
  | 'campaign-battle'
  | 'campaign-result'
  | 'barracks'
  | 'sandbox-setup'
  | 'sandbox-inventory'
  | 'sandbox-battle'
  | 'sandbox-result';

interface Reward {
  reputationGained: number;
  goldGained: number;
  won: boolean;
}

function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [campaign, setCampaign] = useState<Campaign | null>(loadCampaign());
  const [reward, setReward] = useState<Reward | null>(null);
  const [battleSeq, setBattleSeq] = useState(0);

  // 전투 팀(캠페인·샌드박스 공용)
  const [battleTeamA, setBattleTeamA] = useState<Character[]>([]);
  const [battleTeamB, setBattleTeamB] = useState<Character[]>([]);
  const [finishedBattle, setFinishedBattle] = useState<GridBattle | null>(null);

  // 샌드박스 상태
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [, setInventoryTick] = useState(0);

  const persist = (c: Campaign) => {
    setCampaign(c);
    saveCampaign(c);
  };

  // ---- 캠페인 흐름 ----
  const startNewGame = () => {
    clearCampaign();
    setCampaign(null);
    setScreen('class');
  };

  const chooseClass = (kind: WeaponKind) => {
    const c = newCampaign(kind);
    persist(c);
    setScreen('barracks');
  };

  const startCampaignBattle = () => {
    if (!campaign) return;
    const deployed = campaign.roster.filter((c) => campaign.deployedIds.includes(c.id));
    if (deployed.length === 0) return;
    const { units } = generateEnemyParty(campaign.round);
    setBattleTeamA(deployed);
    setBattleTeamB(units);
    setBattleSeq((s) => s + 1);
    setScreen('campaign-battle');
  };

  const finishCampaignBattle = (battle: GridBattle) => {
    if (!campaign) return;
    const outcome = outcomeFromBattle(battle, campaign.round);
    const settled = settleBattle(campaign, outcome);
    persist(settled.campaign);
    setReward({ reputationGained: settled.reputationGained, goldGained: settled.goldGained, won: outcome.won });
    setFinishedBattle(battle);
    setScreen('campaign-result');
  };

  // ---- 샌드박스 흐름 ----
  const startSandboxBattle = () => {
    setBattleTeamA(teamAIds.map((id, i) => cloneForBattle(id, `A${i}-${id}`)));
    setBattleTeamB(teamBIds.map((id, i) => cloneForBattle(id, `B${i}-${id}`)));
    setBattleSeq((s) => s + 1);
    setFinishedBattle(null);
    setScreen('sandbox-battle');
  };

  if (screen === 'title') {
    return (
      <TitleScreen
        hasSave={!!campaign}
        onNewGame={startNewGame}
        onContinue={() => campaign && setScreen('barracks')}
        onSandbox={() => setScreen('sandbox-setup')}
      />
    );
  }

  if (screen === 'class') {
    return <ClassSelectScreen onSelect={chooseClass} onBack={() => setScreen('title')} />;
  }

  if (screen === 'barracks' && campaign) {
    return (
      <BarracksScreen
        campaign={campaign}
        onSetDeployed={(ids) => persist({ ...campaign, deployedIds: ids })}
        onStartBattle={startCampaignBattle}
        onSave={() => campaign && saveCampaign(campaign)}
      />
    );
  }

  if (screen === 'campaign-battle') {
    return <GridBattleScreen key={`camp-${battleSeq}`} teamA={battleTeamA} teamB={battleTeamB} onFinished={finishCampaignBattle} />;
  }

  if (screen === 'campaign-result' && finishedBattle && reward) {
    return (
      <ResultScreen
        winner={finishedBattle.winner}
        killEvents={finishedBattle.killEvents}
        levelUpEvents={finishedBattle.levelUpEvents}
        allUnits={[...finishedBattle.teamA, ...finishedBattle.teamB]}
        reward={reward}
        onContinue={() => setScreen('barracks')}
      />
    );
  }

  // ---- 샌드박스 화면 ----
  if (screen === 'sandbox-setup') {
    return (
      <TeamSetupScreen
        teamAIds={teamAIds}
        teamBIds={teamBIds}
        onChangeTeamA={setTeamAIds}
        onChangeTeamB={setTeamBIds}
        onStart={startSandboxBattle}
        onOpenInventory={() => setScreen('sandbox-inventory')}
      />
    );
  }

  if (screen === 'sandbox-inventory') {
    return <InventoryScreen onChange={() => setInventoryTick((t) => t + 1)} onBack={() => setScreen('sandbox-setup')} />;
  }

  if (screen === 'sandbox-battle') {
    return (
      <GridBattleScreen
        key={`sandbox-${battleSeq}`}
        teamA={battleTeamA}
        teamB={battleTeamB}
        onFinished={(battle) => {
          setFinishedBattle(battle);
          setScreen('sandbox-result');
        }}
      />
    );
  }

  if (screen === 'sandbox-result' && finishedBattle) {
    return (
      <ResultScreen
        winner={finishedBattle.winner}
        killEvents={finishedBattle.killEvents}
        levelUpEvents={finishedBattle.levelUpEvents}
        allUnits={[...finishedBattle.teamA, ...finishedBattle.teamB]}
        onRestart={() => setScreen('sandbox-setup')}
      />
    );
  }

  return null;
}

export default App;
