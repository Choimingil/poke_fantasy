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
import { CutsceneScreen } from './components/CutsceneScreen';
import { cloneForBattle } from './game/data/roster';
import type { GridBattle, BattleObjective } from './game/engine/battle';
import type { Character } from './game/types';
import type { Campaign } from './game/campaign/types';
import { loadCampaign, saveCampaign, clearCampaign } from './game/campaign/storage';
import { newCampaign, outcomeFromBattle, recruitFromCandidate, settleBattle, confirmHeroTrait, dismissHeroTraitConfirm, treatInjury, ensureCompanions, applyStoryEvents, heroLevel, type HeroSetup } from './game/campaign/state';
import { buyShopItem, enhanceEquip, equipStashArmor, equipStashWeapon, sellStashArmor, sellStashWeapon } from './game/campaign/stash';
import { generateEnemyParty } from './game/campaign/enemyParty';
import { buildBattleObjective } from './game/campaign/objectives';
import { storyRoundDef } from './game/campaign/story/rounds';
import { buildStoryEnemyParty } from './game/campaign/story/difficulty';
import { createStoryMap, type StoryMap } from './game/campaign/story/maps';
import type { StoryRoundDef } from './game/campaign/story/types';

type Screen =
  | 'title'
  | 'hero-create'
  | 'hero-trait-confirm'
  | 'story-pre'
  | 'campaign-battle'
  | 'campaign-result'
  | 'story-post'
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
  rating: import('./game/campaign/objectives').BattleRating | null;
  injuredNames: string[]; // 이번 전투로 부상당한 동료 이름(§42)
  fallenNames: string[]; // 이번 전투로 전사한 동료 이름(§42)
  unlocked: import('./game/campaign/unlocks').SystemId[]; // 이번 라운드 해금 시스템(§44)
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

  // 스토리 전투 컨텍스트(현재/직전 전투에 쓰인 라운드 정의·맵·목표)
  const [storyDef, setStoryDef] = useState<StoryRoundDef | null>(null);
  const [storyMap, setStoryMap] = useState<StoryMap | null>(null);
  const [storyObjective, setStoryObjective] = useState<BattleObjective | undefined>(undefined);

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
    // 1라운드는 정비 화면을 건너뛰고 무기·특성 선택 직후 바로 전투(컷씬)로 진입한다.
    beginBattle(c);
  };

  /** 주어진 캠페인 상태로 다음 전투를 시작한다(스토리면 컷씬→전투, 아니면 절차 전투). */
  const beginBattle = (cc: Campaign) => {
    const def = cc.mode === 'story' ? storyRoundDef(cc.round) : undefined;

    if (def) {
      // 스토리 라운드: 필요한 동료를 확보하고, 출전 명단에 주인공+합류 동료를 포함시킨다.
      const withCompanions = ensureCompanions(cc, def.joinBefore ?? []);
      const forced = ['hero', ...(def.joinBefore ?? [])];
      const excluded = def.excludeDeploy ?? [];
      const rest = withCompanions.deployedIds.filter((id) => !forced.includes(id) && !excluded.includes(id));
      const deployedIds = [...forced, ...rest].slice(0, def.deployMax);
      const prepared = { ...withCompanions, deployedIds };
      persist(prepared);

      const deployed = deployedIds
        .map((id) => prepared.roster.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c);
      if (deployed.length === 0) return;

      const enemy = buildStoryEnemyParty(def, heroLevel(prepared));
      const smap = createStoryMap(def.mapId);
      const objective: BattleObjective = def.primary === 'killCommander'
        ? { primary: 'killCommander', commanderId: enemy.commanderId }
        : def.primary === 'surviveTurns'
          ? { primary: 'surviveTurns', turnLimit: def.turnLimit }
          : { primary: 'annihilate' };

      setStoryDef(def);
      setStoryMap(smap);
      setStoryObjective(objective);
      setBattleTeamA(deployed);
      setBattleTeamB(enemy.units);
      setBattleSeq((s) => s + 1);
      setScreen('story-pre');
      return;
    }

    // 절차적 폴백(스토리 라운드 이후): 기존 로그라이트 전투.
    const deployed = cc.deployedIds
      .map((id) => cc.roster.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    if (deployed.length === 0) return;
    const { units } = generateEnemyParty(cc.round);
    setStoryDef(null);
    setStoryMap(null);
    setStoryObjective(undefined);
    setBattleTeamA(deployed);
    setBattleTeamB(units);
    setBattleSeq((s) => s + 1);
    setScreen('campaign-battle');
  };

  const startCampaignBattle = () => {
    if (!campaign) return;
    beginBattle(campaign);
  };

  const finishCampaignBattle = (battle: GridBattle) => {
    if (!campaign) return;
    const outcome = outcomeFromBattle(battle, campaign.round);
    const settled = settleBattle(campaign, outcome);
    persist(settled.campaign);
    const nameOfId = (id: string) => battle.teamA.find((a) => a.id === id)?.name ?? id;
    setReward({
      reputationGained: settled.reputationGained,
      goldGained: settled.goldGained,
      won: outcome.won,
      bossDefeated: outcome.bossDefeated,
      rating: outcome.rating,
      injuredNames: settled.newlyInjured.map(nameOfId),
      fallenNames: settled.fallenNames,
      unlocked: settled.unlocked,
    });
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
        onEnhance={(id) => persist(enhanceEquip(campaign, id))}
        onTreatInjury={(id) => persist(treatInjury(campaign, id))}
      />
    );
  }

  if (screen === 'story-pre' && storyDef && campaign) {
    const hero = campaign.roster.find((c) => c.id === 'hero');
    return (
      <CutsceneScreen
        cutscene={storyDef.preScene}
        title={`${storyDef.round}. ${storyDef.title}`}
        hero={{ name: hero?.name ?? '주인공', spriteJob: hero?.spriteJob ?? 'east_duelist', gender: hero?.gender ?? 'male' }}
        onDone={() => setScreen('campaign-battle')}
      />
    );
  }

  if (screen === 'campaign-battle') {
    const objective = storyDef ? storyObjective : campaign ? buildBattleObjective(campaign.round, battleTeamB) : undefined;
    return (
      <GridBattleScreen
        key={`camp-${battleSeq}`}
        teamA={battleTeamA}
        teamB={battleTeamB}
        onFinished={finishCampaignBattle}
        objective={objective}
        map={storyMap?.map}
        spawnsA={storyMap?.spawnsA}
        spawnsB={storyMap?.spawnsB}
      />
    );
  }

  if (screen === 'campaign-result' && finishedBattle && reward) {
    return (
      <ResultScreen
        winner={finishedBattle.winner}
        killEvents={finishedBattle.killEvents}
        levelUpEvents={finishedBattle.levelUpEvents}
        allUnits={[...finishedBattle.teamA, ...finishedBattle.teamB]}
        reward={reward}
        injuredNames={reward.injuredNames}
        fallenNames={reward.fallenNames}
        unlocked={reward.unlocked}
        onContinue={() => setScreen(
          storyDef && storyDef.postScene.lines.length > 0
            ? 'story-post'
            : campaign && campaign.heroTraitCandidates && campaign.round >= 2 ? 'hero-trait-confirm' : 'barracks',
        )}
      />
    );
  }

  if (screen === 'story-post' && storyDef && campaign) {
    const hero = campaign.roster.find((c) => c.id === 'hero');
    return (
      <CutsceneScreen
        cutscene={storyDef.postScene}
        title={`${storyDef.round}. ${storyDef.title}`}
        hero={{ name: hero?.name ?? '주인공', spriteJob: hero?.spriteJob ?? 'east_duelist', gender: hero?.gender ?? 'male' }}
        onDone={() => {
          const after = applyStoryEvents(campaign, storyDef.eventsAfter);
          persist(after);
          setScreen(after.heroTraitCandidates && after.round >= 2 ? 'hero-trait-confirm' : 'barracks');
        }}
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
