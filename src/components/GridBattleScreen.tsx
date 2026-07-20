import { useEffect, useRef, useState } from 'react';
import type { Character, GridPos } from '../game/types';
import { GridBattle, type UnitAction } from '../game/engine/battle';
import { createDefaultMap, TEAM_A_SPAWNS, TEAM_B_SPAWNS } from '../game/data/maps';
import { prepareForBattle } from '../game/engine/characterFactory';
import { getSkill, skillDisplayName, skillTypeLabel } from '../game/data/skills';
import { getWeapon, weaponInstanceName } from '../game/data/weapons';
import { getBattleSkillIds } from '../game/data/promotions';
import { meetsEquipLevel } from '../game/engine/equipment';
import { manhattan, computeReachableTiles, effectiveMove, moveStepsForRound, posKey, lineCrossesRock } from '../game/engine/grid';
import { isRangedOrMagicKind } from '../game/data/weapons';
import { isVisibleTo, isVisibleToTeam, isTileRevealed } from '../game/engine/vision';
import { pickAiAction } from '../game/engine/ai';
import { pickRandomWeather, WEATHER_LABEL } from '../game/engine/weather';
import { pickRandomTime, TIME_LABEL } from '../game/engine/daytime';
import { effectiveSpeed } from '../game/engine/turnOrder';
import { BoardGrid } from './BoardGrid';
import { InitiativeBar } from './InitiativeBar';
import { StatusChips } from './StatusChips';
import { InspectPanel } from './InspectPanel';
import { EquipSwapMenu } from './EquipSwapMenu';

const AI_DELAY_MS = 500;

interface SwapCandidate {
  kind: 'weapon' | 'armor';
  instanceId: string;
}

export function GridBattleScreen({ teamA, teamB, onFinished }: {
  teamA: Character[];
  teamB: Character[];
  onFinished: (battle: GridBattle) => void;
}) {
  const battleRef = useRef<GridBattle | null>(null);
  const [, setTick] = useState(0);
  const [pendingMoveTile, setPendingMoveTile] = useState<GridPos | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [pendingFollowup, setPendingFollowup] = useState<{ skillId: string; targetId: string; radius: number; origin: GridPos } | null>(null);
  const [pendingSwapTo, setPendingSwapTo] = useState<SwapCandidate | null>(null);
  const [swapMenuOpen, setSwapMenuOpen] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [motion, setMotion] = useState<{ attackerId: string; targetIds: string[]; key: number } | null>(null);
  const [floatBatch, setFloatBatch] = useState<{ key: number; byUnit: Record<string, { text: string; kind: string }> } | null>(null);
  const aiBusyRef = useRef(false);
  const motionKeyRef = useRef(0);
  const floatKeyRef = useRef(0);
  const exploredRef = useRef<Set<string>>(new Set()); // 한 번이라도 시야로 밝혔던 타일(탐사 완료)

  const triggerMotion = (attackerId: string, targetIds: string[]) => {
    motionKeyRef.current += 1;
    setMotion({ attackerId, targetIds, key: motionKeyRef.current });
  };

  // 직전 턴의 전투 표시(데미지/빗나감/회복)를 대상별로 모아 피격 유닛 위에 띄운다.
  const showFloats = (battle: GridBattle) => {
    const events = battle.lastTurnEvents;
    if (!events || events.length === 0) return;
    const agg: Record<string, { damage: number; crit: boolean; heal: number; miss: boolean }> = {};
    for (const e of events) {
      const g = (agg[e.targetId] ??= { damage: 0, crit: false, heal: 0, miss: false });
      if (e.kind === 'damage') { g.damage += e.amount ?? 0; g.crit = g.crit || !!e.crit; }
      else if (e.kind === 'heal') g.heal += e.amount ?? 0;
      else if (e.kind === 'miss') g.miss = true;
    }
    const byUnit: Record<string, { text: string; kind: string }> = {};
    for (const [id, g] of Object.entries(agg)) {
      if (g.damage > 0) byUnit[id] = { text: `${g.damage}${g.crit ? '!' : ''}`, kind: g.crit ? 'crit' : 'damage' };
      else if (g.heal > 0) byUnit[id] = { text: `+${g.heal}`, kind: 'heal' };
      else if (g.miss) byUnit[id] = { text: '빗나감', kind: 'miss' };
    }
    if (Object.keys(byUnit).length === 0) return;
    floatKeyRef.current += 1;
    setFloatBatch({ key: floatKeyRef.current, byUnit });
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
  // 밝혀진 타일은 탐사 완료로 누적 기록(스타크래프트식: 이후 시야를 벗어나도 지형은 어둡게 기억).
  for (const k of revealedTiles) exploredRef.current.add(k);
  const visibleEnemyIds = new Set(
    battle.teamB.filter((e) => e.currentHp > 0 && isVisibleToTeam(e, alivePlayers, battle.map, sightCond)).map((e) => e.id),
  );
  // 상세 조회 대상: 아군 또는 현재 보이는 적. (숨은 적/사망 시 자동으로 닫힘)
  const inspectUnit = inspectId
    ? ([...battle.teamA, ...battle.teamB].find(
        (u) => u.id === inspectId && u.currentHp > 0 && (u.side === 'A' || visibleEnemyIds.has(u.id)),
      ) ?? null)
    : null;
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

  // 데미지/빗나감 표시는 애니메이션 후 해제한다.
  useEffect(() => {
    if (!floatBatch) return;
    const t = setTimeout(() => setFloatBatch(null), 1000);
    return () => clearTimeout(t);
  }, [floatBatch]);

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
      const action = pickAiAction(unit, ownTeam, enemyTeam, battle.map, battle.weather, battle.time, battle.knownEnemyPositions[unit.side!]);
      battle.takeTurn(action);
      if (action.skillId && action.targetId) triggerMotion(unit.id, [action.targetId]);
      showFloats(battle);
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
    setPendingFollowup(null);
    setPendingSwapTo(null);
    setSwapMenuOpen(false);
    setInspectId(null);
  };

  // 실제 행동 실행: 대기 중인 이동(pendingMoveTile)과 함께 주어진 스킬/타겟(또는 무기·방어구 교체)을 즉시 실행한다.
  const executeAction = (opts: { skillId?: string; targetId?: string; targetPos?: GridPos; swap?: SwapCandidate; followupMoveTo?: GridPos }) => {
    if (!currentUnit) return;
    const actorId = currentUnit.id;
    const action: UnitAction = {};
    if (opts.swap) {
      // 무기/방어구 교체는 단독 행동으로 처리(무기는 티어<3이면 교체가 턴을 소모, 방어구는 항상 턴을 소모).
      if (opts.swap.kind === 'weapon') action.switchWeaponTo = opts.swap.instanceId;
      else action.switchArmorTo = opts.swap.instanceId;
      battle.takeTurn(action);
      showFloats(battle);
      resetPending();
      forceRerender();
      return;
    }
    if (pendingMoveTile) action.moveTo = pendingMoveTile;
    if (opts.skillId) {
      action.skillId = opts.skillId;
      if (opts.targetId) action.targetId = opts.targetId;
      if (opts.targetPos) action.targetPos = opts.targetPos;
      if (opts.followupMoveTo) action.followupMoveTo = opts.followupMoveTo;
    }
    const isAttack = opts.skillId ? getSkill(opts.skillId).category === 'attack' : false;
    battle.takeTurn(action);
    if (isAttack) triggerMotion(actorId, opts.targetId ? [opts.targetId] : []);
    showFloats(battle);
    resetPending();
    forceRerender();
  };

  // 확인/대기 버튼: 스킬·장비교체는 각자 즉시/모달로 처리되므로 여기서는 이동 → 대기(턴 종료)만 처리.
  const submitAction = () => {
    executeAction({});
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
            exploredTiles={exploredRef.current}
            visibleEnemyIds={visibleEnemyIds}
            focusPos={focusPos}
            motionAttackerId={motion?.attackerId ?? null}
            motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
            floatByUnit={floatBatch?.byUnit ?? null}
            floatKey={floatBatch?.key ?? 0}
            onTileClick={(pos) => {
              // 캐릭터(아군 또는 보이는 적)를 누르면 상세 팝업 전환, 빈 타일이면 닫힘.
              const at = [...battle.teamA, ...battle.teamB].find(
                (u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y && (u.side === 'A' || visibleEnemyIds.has(u.id)),
              );
              setInspectId(at ? at.id : null);
            }}
          />
          {inspectUnit && <InspectPanel unit={inspectUnit} onClose={() => setInspectId(null)} />}
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
  const budget = moveStepsForRound(effectiveMove(currentUnit, battle.map, battle.weather));
  const reachable = pendingMoveTile || pendingFollowup ? [] : computeReachableTiles(battle.map, currentUnit, [...battle.teamA, ...battle.teamB], budget);
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
  const onHillNow = battle.map.tiles[fromPos.y][fromPos.x].terrain === 'hill';
  const rangedWeapon = isRangedOrMagicKind(weapon.kind);
  const selectedSkill = selectedSkillId ? getSkill(selectedSkillId) : null;
  const skillRange = (s: NonNullable<typeof selectedSkill>) => {
    let r = s.range === 'weapon' ? weapon.range : (s.range ?? weapon.range);
    if (s.hillRangeBonus && onHillNow) r += s.hillRangeBonus; // 천궁
    return r;
  };
  const targetableUnitIds = new Set<string>();
  const targetableTiles = new Set<string>();
  const allUnits = [...battle.teamA, ...battle.teamB];
  const occupied = (x: number, y: number) => allUnits.some((u) => u.currentHp > 0 && u.position.x === x && u.position.y === y);
  if (selectedSkill && !pendingFollowup) {
    if (selectedSkill.targetMode === 'enemy' || selectedSkill.targetMode === 'anyInSight') {
      const range = skillRange(selectedSkill);
      for (const enemy of battle.teamB.filter((u) => u.currentHp > 0)) {
        const rockBlocked = rangedWeapon && lineCrossesRock(battle.map, fromPos, enemy.position);
        const inSightOrRange = selectedSkill.ignoresRange || selectedSkill.targetMode === 'anyInSight'
          ? isVisibleTo(currentUnit, enemy, battle.map, sightCond) && (selectedSkill.range === undefined || manhattan(fromPos, enemy.position) <= range)
          : manhattan(fromPos, enemy.position) <= range && isVisibleTo(currentUnit, enemy, battle.map, sightCond);
        if (inSightOrRange && !rockBlocked) targetableUnitIds.add(enemy.id);
      }
    } else if (selectedSkill.targetMode === 'tile') {
      const range = selectedSkill.range ? skillRange(selectedSkill) : Math.max(battle.map.width, battle.map.height);
      for (let y = 0; y < battle.map.height; y++) {
        for (let x = 0; x < battle.map.width; x++) {
          if (manhattan(fromPos, { x, y }) <= range && !(rangedWeapon && lineCrossesRock(battle.map, fromPos, { x, y }))) targetableTiles.add(posKey({ x, y }));
        }
      }
    } else if (selectedSkill.targetMode === 'allyAdjacentTile') {
      // 축지: 시야 내 다른 아군의 인접 1칸이며 비어 있는 타일.
      const allies = battle.teamA.filter((a) => a.id !== currentUnit.id && a.currentHp > 0 && isVisibleTo(currentUnit, a, battle.map, sightCond));
      for (let y = 0; y < battle.map.height; y++) {
        for (let x = 0; x < battle.map.width; x++) {
          if (battle.map.tiles[y][x].terrain === 'rock' || occupied(x, y)) continue;
          if (allies.some((a) => manhattan(a.position, { x, y }) === 1)) targetableTiles.add(posKey({ x, y }));
        }
      }
    }
  }
  // 도약사격·기습 후속 이동 선택 타일(원점 = 이동 후 위치, 반경 내 도달 가능 칸 + 제자리).
  const followupTiles = new Set<string>();
  if (pendingFollowup) {
    followupTiles.add(posKey(pendingFollowup.origin));
    const mover = { ...currentUnit, position: pendingFollowup.origin };
    for (const t of computeReachableTiles(battle.map, mover, allUnits, pendingFollowup.radius)) followupTiles.add(posKey(t));
  }

  // 스킬은 즉시 발동, 장비교체는 모달로 처리하므로 확인 버튼은 이동 확정용. 없으면 '대기'(턴 종료).
  const canConfirm = !!pendingMoveTile;

  // 장비교체 가능 여부(무기 방패 제외 + 방어구 중 착용 레벨 충족 & 미장착이 하나라도 있으면 활성).
  const hasSwapTarget =
    currentUnit.inventory.some((w) => getWeapon(w.templateId).kind !== 'shield' && w.instanceId !== currentUnit.equippedWeaponId && meetsEquipLevel(currentUnit, w.level)) ||
    currentUnit.armor.some((a) => a.instanceId !== currentUnit.equippedArmorId && meetsEquipLevel(currentUnit, a.level));

  // 이동력이 1 미만이면 2턴에 1칸만 이동 가능 — 이번 턴 이동 가능 여부를 안내한다.
  const rawMoveValue = effectiveMove(currentUnit, battle.map, battle.weather);
  const subOneMove = rawMoveValue < 1;
  const moveWarning = subOneMove
    ? (budget === 0
        ? '이동력이 1 미만이라 이번 턴에는 이동할 수 없습니다. (2턴에 1칸)'
        : '이동력이 1 미만 — 이번 턴은 1칸만 이동할 수 있습니다. (2턴에 1칸)')
    : null;

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
          targetableUnitIds={pendingFollowup ? new Set() : targetableUnitIds}
          targetableTiles={pendingFollowup ? followupTiles : targetableTiles}
          revealedTiles={revealedTiles}
          exploredTiles={exploredRef.current}
          visibleEnemyIds={visibleEnemyIds}
          focusPos={focusPos}
          previewUnitId={currentUnit.id}
          previewPos={pendingMoveTile}
          motionAttackerId={motion?.attackerId ?? null}
          motionTargetIds={motion ? new Set(motion.targetIds) : undefined}
          floatByUnit={floatBatch?.byUnit ?? null}
          floatKey={floatBatch?.key ?? 0}
          onTileClick={(pos) => {
            // 후속 이동(도약사격·기습) 선택 중이면 해당 칸으로 이동 후 발동.
            if (pendingFollowup) {
              if (followupTiles.has(posKey(pos))) {
                executeAction({ skillId: pendingFollowup.skillId, targetId: pendingFollowup.targetId, followupMoveTo: pos });
              }
              return;
            }
            // 타일/축지 목적지를 누르면 즉시 발동.
            if (selectedSkillId && (selectedSkill?.targetMode === 'tile' || selectedSkill?.targetMode === 'allyAdjacentTile') && targetableTiles.has(posKey(pos))) {
              executeAction({ skillId: selectedSkillId, targetPos: pos });
              return;
            }
            const enemyAtTile = battle.teamB.find((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
            if (selectedSkillId && enemyAtTile && targetableUnitIds.has(enemyAtTile.id)) {
              // 후속 이동이 있는 공격(도약사격·기습)은 대상 지정 후 이동 칸을 고른다.
              if (selectedSkill?.followupMoveRadius) {
                setPendingFollowup({ skillId: selectedSkillId, targetId: enemyAtTile.id, radius: selectedSkill.followupMoveRadius, origin: pendingMoveTile ?? currentUnit.position });
                setSelectedSkillId(null);
              } else {
                executeAction({ skillId: selectedSkillId, targetId: enemyAtTile.id });
              }
              return;
            }
            // 캐릭터(아군 또는 보이는 적)를 누르면 정보 카드 표시/전환(현재 차례가 아닌 캐릭터 포함).
            const charAtTile = [...battle.teamA, ...battle.teamB].find(
              (u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y && (u.side === 'A' || visibleEnemyIds.has(u.id)),
            );
            if (charAtTile) {
              setInspectId(charAtTile.id);
              return;
            }
            // 빈 타일/그 외 클릭 → 상세 팝업 닫기 후 이동 처리.
            setInspectId(null);
            if (reachableTiles.has(posKey(pos))) {
              setPendingSwapTo(null);
              setPendingMoveTile(pos);
            }
          }}
        />
        {inspectUnit && <InspectPanel unit={inspectUnit} onClose={() => setInspectId(null)} />}
        {swapMenuOpen && (
          <EquipSwapMenu
            unit={currentUnit}
            selected={pendingSwapTo}
            onSelect={(c) => setPendingSwapTo(c)}
            onConfirm={() => { if (pendingSwapTo) executeAction({ swap: pendingSwapTo }); setSwapMenuOpen(false); }}
            onClose={() => { setSwapMenuOpen(false); setPendingSwapTo(null); }}
          />
        )}
      </div>

      {/* 맵 하단 행동 일자바 (2배 두께) */}
      <div className="action-bar action-bar-tall">
        <div className="action-bar-head">
          <p className="action-bar-status">
            <strong>{currentUnit.name}</strong> · Lv.{currentUnit.level} · {weaponInstanceName(weaponInstance)}
          </p>
          <StatusChips effects={currentUnit.statusEffects} />
        </div>
        <p className="action-bar-log-line">{battle.log[battle.log.length - 1]}</p>
        {moveWarning && <p className="action-bar-warning">{moveWarning}</p>}
        {pendingFollowup && <p className="action-bar-warning">공격 후 이동할 칸을 선택하세요 (제자리 클릭 시 이동 생략).</p>}
        {selectedSkill?.targetMode === 'allyAdjacentTile' && <p className="action-bar-warning">순간이동할 칸(아군 인접 빈칸)을 선택하세요.</p>}
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
                  <span className="skill-btn-name">{skillDisplayName(skill, weaponInstance.element)}</span>
                  <span className="skill-btn-meta"><span className={`skill-type type-${skillTypeLabel(skill)}`}>{skillTypeLabel(skill)}</span> · {uses}</span>
                </button>
              );
            })}
          </div>
          <div className="action-side">
            <button type="button" className="swap-button" disabled={!hasSwapTarget} onClick={() => { setPendingMoveTile(null); setSelectedSkillId(null); setPendingSwapTo(null); setSwapMenuOpen(true); }}>
              ⇄ 장비교체
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
