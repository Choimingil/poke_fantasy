import { useEffect, useRef, useState } from 'react';
import type { Character, GridPos } from '../game/types';
import { GridBattle, type UnitAction } from '../game/engine/battle';
import { createDefaultMap, TEAM_A_SPAWNS, TEAM_B_SPAWNS } from '../game/data/maps';
import { prepareForBattle } from '../game/engine/characterFactory';
import { getSkill } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { getBattleSkillIds } from '../game/data/promotions';
import { manhattan, computeReachableTiles, effectiveMove, posKey, lineCrossesRock } from '../game/engine/grid';
import { isRangedOrMagicKind } from '../game/data/weapons';
import { isVisibleTo, isVisibleToTeam, isTileRevealed } from '../game/engine/vision';
import { pickAiAction } from '../game/engine/ai';
import { pickRandomWeather, WEATHER_LABEL } from '../game/engine/weather';
import { pickRandomTime, TIME_LABEL } from '../game/engine/daytime';
import { effectiveSpeed } from '../game/engine/turnOrder';
import { BoardGrid } from './BoardGrid';
import { InitiativeBar } from './InitiativeBar';
import { StatusChips } from './StatusChips';

const AI_DELAY_MS = 500;

export function GridBattleScreen({ teamA, teamB, onFinished }: {
  teamA: Character[];
  teamB: Character[];
  onFinished: (battle: GridBattle) => void;
}) {
  const battleRef = useRef<GridBattle | null>(null);
  const [, setTick] = useState(0);
  const [pendingMoveTile, setPendingMoveTile] = useState<GridPos | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [pendingSwapTo, setPendingSwapTo] = useState<string | null>(null);
  const [motion, setMotion] = useState<{ attackerId: string; targetIds: string[]; key: number } | null>(null);
  const aiBusyRef = useRef(false);
  const motionKeyRef = useRef(0);

  const triggerMotion = (attackerId: string, targetIds: string[]) => {
    motionKeyRef.current += 1;
    setMotion({ attackerId, targetIds, key: motionKeyRef.current });
  };

  if (!battleRef.current) {
    const map = createDefaultMap();
    teamA.forEach((c, i) => prepareForBattle(c, TEAM_A_SPAWNS[i % TEAM_A_SPAWNS.length], 'A'));
    teamB.forEach((c, i) => prepareForBattle(c, TEAM_B_SPAWNS[i % TEAM_B_SPAWNS.length], 'B'));
    battleRef.current = new GridBattle(map, teamA, teamB, Math.random, pickRandomWeather(Math.random), pickRandomTime(Math.random));
  }
  const battle = battleRef.current;
  const forceRerender = () => setTick((t) => t + 1);

  const currentUnit = battle.currentUnit();
  const isPlayerTurn = !battle.finished && currentUnit?.side === 'A';

  // 전장의 안개: 플레이어(A팀) 시야 기준으로 밝혀진 타일과 보이는 적을 계산한다. (시간대·날씨 시야 보정 반영)
  const sightCond = { time: battle.time, weather: battle.weather };
  const alivePlayers = battle.teamA.filter((u) => u.currentHp > 0);
  const revealedTiles = new Set<string>();
  for (let y = 0; y < battle.map.height; y++) {
    for (let x = 0; x < battle.map.width; x++) {
      if (isTileRevealed({ x, y }, alivePlayers, battle.map, sightCond)) revealedTiles.add(posKey({ x, y }));
    }
  }
  const visibleEnemyIds = new Set(
    battle.teamB.filter((e) => e.currentHp > 0 && isVisibleToTeam(e, alivePlayers, battle.map, sightCond)).map((e) => e.id),
  );
  // 행동 순서 표시용: 살아있는 모든 유닛을 스피드 내림차순으로 정렬.
  const initiativeUnits = [...battle.teamA, ...battle.teamB]
    .filter((u) => u.currentHp > 0)
    .sort((a, b) => effectiveSpeed(b) - effectiveSpeed(a));
  // 카메라: 현재 유닛이 아군이거나 플레이어에게 보이는 적일 때만 그 위치로 이동(숨은 적은 추적 안 함).
  // 아군이 이동 위치를 지정해 대기 중이면 그 예정 칸을 따라간다.
  const focusPos =
    isPlayerTurn && pendingMoveTile
      ? pendingMoveTile
      : currentUnit && (currentUnit.side === 'A' || visibleEnemyIds.has(currentUnit.id))
        ? currentUnit.position
        : null;

  // 공격 모션은 잠깐 재생 후 해제한다.
  useEffect(() => {
    if (!motion) return;
    const t = setTimeout(() => setMotion(null), 480);
    return () => clearTimeout(t);
  }, [motion]);

  useEffect(() => {
    if (battle.finished) {
      onFinished(battle);
      return;
    }
    const unit = battle.currentUnit();
    if (!unit || unit.side !== 'B' || aiBusyRef.current) return;
    aiBusyRef.current = true;
    const timer = setTimeout(() => {
      const ownTeam = unit.side === 'A' ? battle.teamA : battle.teamB;
      const enemyTeam = unit.side === 'A' ? battle.teamB : battle.teamA;
      const action = pickAiAction(unit, ownTeam, enemyTeam, battle.map, battle.weather, battle.time);
      battle.takeTurn(action);
      if (action.skillId && action.targetId) triggerMotion(unit.id, [action.targetId]);
      aiBusyRef.current = false;
      forceRerender();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, AI_DELAY_MS);
    return () => {
      clearTimeout(timer);
      aiBusyRef.current = false;
    };
  });

  const resetPending = () => {
    setPendingMoveTile(null);
    setSelectedSkillId(null);
    setPendingSwapTo(null);
  };

  // 실제 행동 실행: 대기 중인 이동(pendingMoveTile)과 함께 주어진 스킬/타겟(또는 무기교체)을 즉시 실행한다.
  const executeAction = (opts: { skillId?: string; targetId?: string; targetPos?: GridPos; swapTo?: string }) => {
    if (!currentUnit) return;
    const actorId = currentUnit.id;
    const action: UnitAction = {};
    if (opts.swapTo) {
      // 무기 교체는 단독 행동으로 처리(티어<3이면 교체가 턴을 소모).
      action.switchWeaponTo = opts.swapTo;
      battle.takeTurn(action);
      resetPending();
      forceRerender();
      return;
    }
    if (pendingMoveTile) action.moveTo = pendingMoveTile;
    if (opts.skillId) {
      action.skillId = opts.skillId;
      if (opts.targetId) action.targetId = opts.targetId;
      if (opts.targetPos) action.targetPos = opts.targetPos;
    }
    const isAttack = opts.skillId ? getSkill(opts.skillId).category === 'attack' : false;
    battle.takeTurn(action);
    if (isAttack) triggerMotion(actorId, opts.targetId ? [opts.targetId] : []);
    resetPending();
    forceRerender();
  };

  // 확인/대기 버튼: 스킬은 즉시 발동되므로 여기서는 무기교체 → 이동 → 대기(턴 종료)만 처리.
  const submitAction = () => {
    if (pendingSwapTo) executeAction({ swapTo: pendingSwapTo });
    else executeAction({});
  };

  if (!isPlayerTurn || !currentUnit) {
    return (
      <div className="app-shell battle-screen">
        <div className="battle-log-panel">
          <p className="battle-meta">🕑 {TIME_LABEL[battle.time]} · 날씨: {WEATHER_LABEL[battle.weather]}</p>
          <InitiativeBar units={initiativeUnits} currentUnitId={currentUnit?.id ?? null} visibleEnemyIds={visibleEnemyIds} />
        </div>
        <div className={`battle-stage weather-${battle.weather} time-${battle.time}`}>
          <BoardGrid
            map={battle.map}
            teamA={battle.teamA}
            teamB={battle.teamB}
            currentUnitId={currentUnit?.id ?? null}
            reachableTiles={new Set()}
            targetableUnitIds={new Set()}
            targetableTiles={new Set()}
            revealedTiles={revealedTiles}
            visibleEnemyIds={visibleEnemyIds}
            focusPos={focusPos}
            motionAttackerId={motion?.attackerId ?? null}
            motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
            onTileClick={() => {}}
          />
        </div>
        <div className="action-bar action-bar-tall action-bar-waiting">
          <p className="action-bar-status">
            {battle.finished ? '전투 종료' : `${currentUnit?.name ?? '상대'}의 행동을 기다리는 중...`}
          </p>
        </div>
      </div>
    );
  }

  const weaponInstance = currentUnit.inventory.find((w) => w.instanceId === currentUnit.equippedWeaponId)!;
  const weapon = getWeapon(weaponInstance.templateId);
  const budget = effectiveMove(currentUnit, battle.map, battle.weather);
  const reachable = pendingMoveTile ? [] : computeReachableTiles(battle.map, currentUnit, [...battle.teamA, ...battle.teamB], budget);
  const reachableTiles = new Set(reachable.map(posKey));

  const usableSkillIds = getBattleSkillIds(
    currentUnit,
    weapon.kind,
    (id) => {
      const skill = getSkill(id);
      return skill.maxUses === undefined || (currentUnit.skillUses[id] ?? 0) > 0;
    },
  );

  const fromPos = pendingMoveTile ?? currentUnit.position;
  const rangedWeapon = isRangedOrMagicKind(weapon.kind);
  const selectedSkill = selectedSkillId ? getSkill(selectedSkillId) : null;
  const targetableUnitIds = new Set<string>();
  const targetableTiles = new Set<string>();
  if (selectedSkill) {
    if (selectedSkill.targetMode === 'enemy' || selectedSkill.targetMode === 'anyInSight') {
      for (const enemy of battle.teamB.filter((u) => u.currentHp > 0)) {
        const rockBlocked = rangedWeapon && lineCrossesRock(battle.map, fromPos, enemy.position);
        const inRange = (selectedSkill.ignoresRange || selectedSkill.targetMode === 'anyInSight'
          ? isVisibleTo(currentUnit, enemy, battle.map, sightCond)
          : manhattan(fromPos, enemy.position) <= (selectedSkill.range === 'weapon' ? weapon.range : (selectedSkill.range ?? weapon.range)) &&
            isVisibleTo(currentUnit, enemy, battle.map, sightCond)) &&
          !rockBlocked;
        if (inRange) targetableUnitIds.add(enemy.id);
      }
    } else if (selectedSkill.targetMode === 'tile') {
      const range = selectedSkill.range ? (selectedSkill.range === 'weapon' ? weapon.range : selectedSkill.range) : Math.max(battle.map.width, battle.map.height);
      for (let y = 0; y < battle.map.height; y++) {
        for (let x = 0; x < battle.map.width; x++) {
          if (manhattan(fromPos, { x, y }) <= range && !(rangedWeapon && lineCrossesRock(battle.map, fromPos, { x, y }))) targetableTiles.add(posKey({ x, y }));
        }
      }
    }
  }

  // 스킬은 즉시 발동하므로 확인 버튼은 무기교체/이동 확정용. 둘 다 없으면 '대기'(턴 종료).
  const canConfirm = !!pendingSwapTo || !!pendingMoveTile;

  // 무기 교체 후보(방패/현재 장착 무기 제외). 버튼 클릭 시 순환 선택.
  const swapCandidates = currentUnit.inventory
    .filter((w) => getWeapon(w.templateId).kind !== 'shield' && w.instanceId !== currentUnit.equippedWeaponId)
    .map((w) => w.instanceId);
  const cycleSwap = () => {
    if (swapCandidates.length === 0) return;
    setPendingMoveTile(null);
    setSelectedSkillId(null);
    const idx = pendingSwapTo ? swapCandidates.indexOf(pendingSwapTo) : -1;
    setPendingSwapTo(idx + 1 >= swapCandidates.length ? null : swapCandidates[idx + 1]);
  };
  const swapLabel = pendingSwapTo
    ? `⇄ ${getWeapon(currentUnit.inventory.find((w) => w.instanceId === pendingSwapTo)!.templateId).name}`
    : '⇄ 무기교체';

  return (
    <div className="app-shell battle-screen">
      <div className="battle-log-panel">
        <p className="battle-meta">🕑 {TIME_LABEL[battle.time]} · 날씨: {WEATHER_LABEL[battle.weather]}</p>
        <InitiativeBar units={initiativeUnits} currentUnitId={currentUnit.id} visibleEnemyIds={visibleEnemyIds} />
      </div>
      <div className={`battle-stage weather-${battle.weather} time-${battle.time}`}>
        <BoardGrid
          map={battle.map}
          teamA={battle.teamA}
          teamB={battle.teamB}
          currentUnitId={currentUnit.id}
          reachableTiles={reachableTiles}
          targetableUnitIds={targetableUnitIds}
          targetableTiles={targetableTiles}
          revealedTiles={revealedTiles}
          visibleEnemyIds={visibleEnemyIds}
          focusPos={focusPos}
          previewUnitId={currentUnit.id}
          previewPos={pendingMoveTile}
          motionAttackerId={motion?.attackerId ?? null}
          motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
          onTileClick={(pos) => {
            // 타겟을 누르면 즉시 기술 발동(확인 불필요).
            if (selectedSkillId && selectedSkill?.targetMode === 'tile' && targetableTiles.has(posKey(pos))) {
              executeAction({ skillId: selectedSkillId, targetPos: pos });
              return;
            }
            const enemyAtTile = battle.teamB.find((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
            if (selectedSkillId && enemyAtTile && targetableUnitIds.has(enemyAtTile.id)) {
              executeAction({ skillId: selectedSkillId, targetId: enemyAtTile.id });
              return;
            }
            if (reachableTiles.has(posKey(pos))) {
              setPendingSwapTo(null);
              setPendingMoveTile(pos);
            }
          }}
        />
      </div>

      {/* 맵 하단 행동 일자바 (2배 두께) */}
      <div className="action-bar action-bar-tall">
        <div className="action-bar-head">
          <p className="action-bar-status">
            <strong>{currentUnit.name}</strong> · Lv.{currentUnit.level} · {weapon.name}
          </p>
          <StatusChips effects={currentUnit.statusEffects} />
        </div>
        <p className="action-bar-log-line">{battle.log[battle.log.length - 1]}</p>
        <div className="action-bar-row">
          <div className="skill-grid">
            {usableSkillIds.map((id) => {
              const skill = getSkill(id);
              const uses = skill.maxUses !== undefined ? `${currentUnit.skillUses[id] ?? 0}/${skill.maxUses}` : '∞';
              return (
                <button
                  key={id}
                  type="button"
                  className={selectedSkillId === id ? 'skill-button-active' : ''}
                  onClick={() => {
                    // 타겟이 필요 없는 기술(자신/자신범위/아군범위)은 버튼만 눌러도 즉시 발동.
                    const noTarget = skill.targetMode === 'self' || skill.targetMode === 'selfRadius' || skill.targetMode === 'ally';
                    if (noTarget) {
                      executeAction({ skillId: id });
                    } else {
                      setPendingSwapTo(null);
                      setSelectedSkillId(selectedSkillId === id ? null : id);
                    }
                  }}
                >
                  {skill.name} ({uses})
                </button>
              );
            })}
          </div>
          <div className="action-side">
            <button type="button" className="swap-button" disabled={swapCandidates.length === 0} onClick={cycleSwap}>
              {swapLabel}
            </button>
            <div className="confirm-buttons">
              <button type="button" onClick={resetPending}>취소</button>
              {/* 대기 중인 행동이 없으면 확인은 그대로 턴 종료(대기) 역할 */}
              <button type="button" onClick={submitAction}>{canConfirm ? '확인' : '대기'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
