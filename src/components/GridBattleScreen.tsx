import { useEffect, useRef, useState } from 'react';
import type { Character, GridPos } from '../game/types';
import { GridBattle, type UnitAction } from '../game/engine/battle';
import { createDefaultMap, TEAM_A_SPAWNS, TEAM_B_SPAWNS } from '../game/data/maps';
import { prepareForBattle } from '../game/engine/characterFactory';
import { getSkill } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { getBattleSkillIds } from '../game/data/promotions';
import { chebyshev, computeReachableTiles, effectiveMove, posKey } from '../game/engine/grid';
import { isVisibleTo, isVisibleToTeam, isTileRevealed } from '../game/engine/vision';
import { pickAiAction } from '../game/engine/ai';
import { pickRandomWeather, WEATHER_LABEL } from '../game/engine/weather';
import { pickRandomTime, TIME_LABEL } from '../game/engine/daytime';
import { effectiveSpeed } from '../game/engine/turnOrder';
import { BoardGrid } from './BoardGrid';
import { InitiativeBar } from './InitiativeBar';

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
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [pendingTargetPos, setPendingTargetPos] = useState<GridPos | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
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

  // 전장의 안개: 플레이어(A팀) 시야 기준으로 밝혀진 타일과 보이는 적을 계산한다.
  const alivePlayers = battle.teamA.filter((u) => u.currentHp > 0);
  const revealedTiles = new Set<string>();
  for (let y = 0; y < battle.map.height; y++) {
    for (let x = 0; x < battle.map.width; x++) {
      if (isTileRevealed({ x, y }, alivePlayers)) revealedTiles.add(posKey({ x, y }));
    }
  }
  const visibleEnemyIds = new Set(
    battle.teamB.filter((e) => e.currentHp > 0 && isVisibleToTeam(e, alivePlayers, battle.map)).map((e) => e.id),
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
      const action = pickAiAction(unit, ownTeam, enemyTeam, battle.map, battle.weather);
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
    setPendingTargetId(null);
    setPendingTargetPos(null);
  };

  const submitAction = () => {
    if (!currentUnit) return;
    const actorId = currentUnit.id;
    const action: UnitAction = {};
    if (pendingMoveTile) action.moveTo = pendingMoveTile;
    if (selectedSkillId) {
      action.skillId = selectedSkillId;
      if (pendingTargetId) action.targetId = pendingTargetId;
      if (pendingTargetPos) action.targetPos = pendingTargetPos;
    }
    const isAttack = selectedSkillId ? getSkill(selectedSkillId).category === 'attack' : false;
    battle.takeTurn(action);
    if (isAttack) triggerMotion(actorId, pendingTargetId ? [pendingTargetId] : []);
    resetPending();
    forceRerender();
  };

  if (!isPlayerTurn || !currentUnit) {
    return (
      <div className="app-shell battle-screen">
        <div className="battle-log-panel">
          <p className="battle-meta">🕑 {TIME_LABEL[battle.time]} · 날씨: {WEATHER_LABEL[battle.weather]}</p>
          <InitiativeBar units={initiativeUnits} currentUnitId={currentUnit?.id ?? null} visibleEnemyIds={visibleEnemyIds} />
          <p className="turn-status">{battle.finished ? '전투 종료' : `${currentUnit?.name ?? ''}의 턴 진행 중...`}</p>
        </div>
        <div className="battle-stage">
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
            weather={battle.weather}
            time={battle.time}
            motionAttackerId={motion?.attackerId ?? null}
            motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
            onTileClick={() => {}}
          />
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
  const selectedSkill = selectedSkillId ? getSkill(selectedSkillId) : null;
  const targetableUnitIds = new Set<string>();
  const targetableTiles = new Set<string>();
  if (selectedSkill) {
    if (selectedSkill.targetMode === 'enemy' || selectedSkill.targetMode === 'anyInSight') {
      for (const enemy of battle.teamB.filter((u) => u.currentHp > 0)) {
        const inRange = selectedSkill.ignoresRange || selectedSkill.targetMode === 'anyInSight'
          ? isVisibleTo(currentUnit, enemy, battle.map)
          : chebyshev(fromPos, enemy.position) <= (selectedSkill.range === 'weapon' ? weapon.range : (selectedSkill.range ?? weapon.range)) &&
            isVisibleTo(currentUnit, enemy, battle.map);
        if (inRange) targetableUnitIds.add(enemy.id);
      }
    } else if (selectedSkill.targetMode === 'tile') {
      const range = selectedSkill.range ? (selectedSkill.range === 'weapon' ? weapon.range : selectedSkill.range) : Math.max(battle.map.width, battle.map.height);
      for (let y = 0; y < battle.map.height; y++) {
        for (let x = 0; x < battle.map.width; x++) {
          if (chebyshev(fromPos, { x, y }) <= range) targetableTiles.add(posKey({ x, y }));
        }
      }
    }
  }

  const canConfirm =
    !!pendingMoveTile ||
    (!!selectedSkillId &&
      (selectedSkill?.targetMode === 'self' || selectedSkill?.targetMode === 'selfRadius' || selectedSkill?.targetMode === 'ally' || !!pendingTargetId || !!pendingTargetPos));

  return (
    <div className="app-shell battle-screen">
      <div className="battle-log-panel">
        <p className="battle-meta">🕑 {TIME_LABEL[battle.time]} · 날씨: {WEATHER_LABEL[battle.weather]}</p>
        <InitiativeBar units={initiativeUnits} currentUnitId={currentUnit.id} visibleEnemyIds={visibleEnemyIds} />
      </div>
      <div className="battle-stage">
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
          weather={battle.weather}
          time={battle.time}
          previewUnitId={currentUnit.id}
          previewPos={pendingMoveTile}
          motionAttackerId={motion?.attackerId ?? null}
          motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
          onTileClick={(pos) => {
            if (selectedSkill?.targetMode === 'tile' && targetableTiles.has(posKey(pos))) {
              setPendingTargetPos(pos);
              return;
            }
            const enemyAtTile = battle.teamB.find((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
            if (enemyAtTile && targetableUnitIds.has(enemyAtTile.id)) {
              setPendingTargetId(enemyAtTile.id);
              return;
            }
            if (reachableTiles.has(posKey(pos))) {
              setPendingMoveTile(pos);
            }
          }}
        />

        {/* 좌측 하단 플로팅 기술 패널 */}
        <div className={`action-float${panelOpen ? '' : ' collapsed'}`}>
          <button type="button" className="action-float-toggle" onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? '⚔ 행동 ▾' : '⚔'}
          </button>
          {panelOpen && (
            <div className="action-float-body">
              <p className="turn-status">
                <strong>{currentUnit.name}</strong> · Lv.{currentUnit.level} · {weapon.name}
              </p>
              <p className="battle-log-line">{battle.log[battle.log.length - 1]}</p>
              <div className="skill-buttons">
                {usableSkillIds.map((id) => {
                  const skill = getSkill(id);
                  const uses = skill.maxUses !== undefined ? `${currentUnit.skillUses[id] ?? 0}/${skill.maxUses}` : '∞';
                  return (
                    <button
                      key={id}
                      type="button"
                      className={selectedSkillId === id ? 'skill-button-active' : ''}
                      onClick={() => { setSelectedSkillId(selectedSkillId === id ? null : id); setPendingTargetId(null); setPendingTargetPos(null); }}
                    >
                      {skill.name} ({uses})
                    </button>
                  );
                })}
              </div>
              <div className="confirm-buttons">
                <button type="button" onClick={resetPending}>취소</button>
                <button type="button" disabled={!canConfirm} onClick={submitAction}>확인</button>
                <button type="button" onClick={() => { resetPending(); battle.takeTurn({}); forceRerender(); }}>턴 넘기기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
