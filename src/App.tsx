import { useState } from 'react';
import './App.css';
import { TitleScreen } from './components/TitleScreen';
import { HeroCreateScreen } from './components/HeroCreateScreen';
import { HeroTraitConfirmScreen } from './components/HeroTraitConfirmScreen';
import { BarracksScreen } from './components/BarracksScreen';
import { TeamSetupScreen } from './components/TeamSetupScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { GridBattleScreen } from './components/GridBattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { cloneForBattle } from './game/data/roster';
import type { GridBattle } from './game/engine/battle';
import type { Character } from './game/types';
import type { Campaign } from './game/campaign/types';
import { loadCampaign, saveCampaign, clearCampaign } from './game/campaign/storage';
import { newCampaign, outcomeFromBattle, recruitFromCandidate, settleBattle, confirmHeroTrait, dismissHeroTraitConfirm, type HeroSetup } from './game/campaign/state';
import { buyShopItem, equipStashArmor, equipStashWeapon, sellStashArmor, sellStashWeapon } from './game/campaign/stash';
import { generateEnemyParty } from './game/campaign/enemyParty';

type Screen =
  | 'title'
  | 'hero-create'
  | 'hero-trait-confirm'
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
  bossDefeated: boolean;
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
    setScreen('hero-create');
  };

  const createHero = (setup: HeroSetup) => {
    const c = newCampaign(setup);
    persist(c);
    setScreen('barracks');
  };

  const startCampaignBattle = () => {
    if (!campaign) return;
    // 출전 순서(deployedIds)를 그대로 스폰 슬롯 순서로 사용한다(파티 편성에서 지정한 위치).
    const deployed = campaign.deployedIds
      .map((id) => campaign.roster.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
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
    setReward({ reputationGained: settled.reputationGained, goldGained: settled.goldGained, won: outcome.won, bossDefeated: outcome.bossDefeated });
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

  if (screen === 'hero-create') {
    return <HeroCreateScreen onCreate={createHero} onBack={() => setScreen('title')} />;
  }

  if (screen === 'hero-trait-confirm' && campaign) {
    const hero = campaign.roster.find((c) => c.id === 'hero');
    if (hero && hero.traitId && campaign.heroTraitCandidates) {
      return (
        <HeroTraitConfirmScreen
          heroKind={campaign.heroKind}
          currentTraitId={hero.traitId}
          originalCandidates={campaign.heroTraitCandidates}
          onConfirm={(traitId) => { persist(confirmHeroTrait(campaign, traitId)); setScreen('barracks'); }}
          onKeep={() => { persist(dismissHeroTraitConfirm(campaign)); setScreen('barracks'); }}
        />
      );
    }
    setScreen('barracks');
    return null;
  }

  if (screen === 'barracks' && campaign) {
    return (
      <BarracksScreen
        campaign={campaign}
        onSetDeployed={(ids) => persist({ ...campaign, deployedIds: ids })}
        onStartBattle={startCampaignBattle}
        onSave={() => campaign && saveCampaign(campaign)}
        onRecruit={(id) => persist(recruitFromCandidate(campaign, id))}
        onBuy={(id) => persist(buyShopItem(campaign, id))}
        onEquipStashWeapon={(charId, id) => persist(equipStashWeapon(campaign, charId, id))}
        onEquipStashArmor={(charId, id) => persist(equipStashArmor(campaign, charId, id))}
        onSellStashWeapon={(id) => persist(sellStashWeapon(campaign, id))}
        onSellStashArmor={(id) => persist(sellStashArmor(campaign, id))}
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
        onContinue={() => setScreen(
          campaign && campaign.heroTraitCandidates && campaign.round >= 2 ? 'hero-trait-confirm' : 'barracks',
        )}
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
