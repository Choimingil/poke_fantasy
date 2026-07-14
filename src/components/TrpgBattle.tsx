import { useEffect, useRef, useState } from 'react';
import { getJob } from '../game/data/jobs';
import { getSkill } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { cloneRosterCharacter } from '../game/data/roster';
import { GRID_SIZE, type Terrain } from '../game/trpg/map';
import { TrpgGame, skillMaxUses, type TrpgUnit, type UnitDef } from '../game/trpg/engine';
import { TrainerSprite, type Gender } from './TrainerSprite';

export interface PartyMember {
  jobId: string;
  gender: Gender;
}

interface TrpgBattleProps {
  playerParty: PartyMember[];
  enemyParty: PartyMember[];
  onExit: () => void;
}

const TERRAIN_LABEL: Record<Terrain, string> = { plain: '', tree: '🌲', water: '🌊', cliff: '⛰️' };
const SWAP_WEAPONS = ['trpg_sword', 'trpg_bow', 'trpg_staff'];

const CELL = 64; // 정사각형 칸(px)
const VIEW_TILES = 7; // 한 화면에 보이는 칸 수(카메라)
const VIEW = CELL * VIEW_TILES;
const WORLD = CELL * GRID_SIZE;

type Phase = 'move' | 'action' | 'target';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function toDefs(party: PartyMember[]): UnitDef[] {
  return party.map((m) => ({ character: cloneRosterCharacter(m.jobId), gender: m.gender }));
}

export function TrpgBattle({ playerParty, enemyParty, onExit }: TrpgBattleProps) {
  const gameRef = useRef<TrpgGame | null>(null);
  if (!gameRef.current) {
    gameRef.current = new TrpgGame(toDefs(playerParty), toDefs(enemyParty));
  }
  const game = gameRef.current;

  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);
  const [phase, setPhase] = useState<Phase>('move');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [message, setMessage] = useState('전투 시작!');
  const busyRef = useRef(false);
  const processingRef = useRef<string | null>(null);

  const current = game.current();
  const isPlayerTurn = !!current && current.team === 'player' && !game.finished && !busyRef.current;
  const currentId = current?.id ?? null;

  // 적 턴: 이동 → 공격 순으로 애니메이션하며 처리.
  // 의존성은 "현재 유닛 id"라서 처리 중 내부 rerender()로는 재실행되지 않는다.
  useEffect(() => {
    if (game.finished) return undefined;
    const cur = game.current();
    if (!cur || cur.team !== 'enemy') return undefined;
    if (processingRef.current === cur.id) return undefined; // 이미 이 유닛 처리 중
    processingRef.current = cur.id;
    busyRef.current = true;
    let active = true;
    (async () => {
      await delay(450);
      const first = game.aiTryAttack();
      if (first.lines.length > 0) {
        setMessage(first.lines.join(' '));
        rerender();
        await delay(750);
      } else {
        const moved = game.aiMoveToward();
        if (moved) {
          setMessage(`${cur.name}가 이동했다.`);
          rerender();
          await delay(550);
        }
        const atk = game.aiTryAttack();
        setMessage(atk.lines.length > 0 ? atk.lines.join(' ') : `${cur.name}가 대기했다.`);
        rerender();
        await delay(650);
      }
      if (!active) return;
      game.endTurn();
      processingRef.current = null;
      busyRef.current = false;
      setPhase('move');
      rerender();
    })();
    return () => {
      active = false;
    };
  }, [currentId, game]);

  const finishPlayerTurn = () => {
    game.endTurn();
    setSelectedSkill(null);
    setPhase('move');
    rerender();
  };

  const reachable = isPlayerTurn && phase === 'move' && current ? game.reachableTiles(current) : [];
  const reachSet = new Set(reachable.map((t) => `${t.r},${t.c}`));
  const targets =
    isPlayerTurn && phase === 'target' && current && selectedSkill
      ? game.targetsFor(current, getSkill(selectedSkill))
      : [];
  const targetIds = new Set(targets.map((t) => t.id));

  const onCellClick = (r: number, c: number) => {
    if (!isPlayerTurn || !current) return;
    if (phase === 'move') {
      if (reachSet.has(`${r},${c}`)) {
        game.moveTo({ r, c });
        setPhase('action');
        rerender();
      }
      return;
    }
    if (phase === 'target') {
      const unit = game.unitAt(r, c);
      if (unit && targetIds.has(unit.id) && selectedSkill) {
        const res = game.useSkill(selectedSkill, unit.id);
        setMessage(res.lines.join(' '));
        finishPlayerTurn();
      }
    }
  };

  const onSkill = (skillId: string) => {
    if (!current) return;
    const skill = getSkill(skillId);
    if ((current.skillUses[skillId] ?? 0) <= 0) return;
    const selfCast = skill.target === 'self' || ['heal', 'buff', 'defense'].includes(skill.category);
    if (selfCast) {
      const res = game.useSkill(skillId);
      setMessage(res.lines.join(' '));
      finishPlayerTurn();
      return;
    }
    const skillTargets = game.targetsFor(current, skill);
    if (skillTargets.length === 0) {
      setMessage('사거리 내에 대상이 없습니다. 이동하거나 다른 행동을 선택하세요.');
    } else {
      setSelectedSkill(skillId);
      setPhase('target');
      rerender();
    }
  };

  const onSwap = (weaponId: string) => {
    if (!current) return;
    const res = game.swapWeapon(weaponId);
    setMessage(res.lines.join(' '));
    if (res.ok) finishPlayerTurn();
  };

  const onUndoMove = () => {
    if (game.undoMove()) {
      setMessage('이동을 취소했습니다.');
      setSelectedSkill(null);
      setPhase('move');
      rerender();
    }
  };

  // 카메라: 현재 유닛(없으면 맵 중앙)을 중심에 두고, 맵 밖이 보이지 않도록 clamp
  const camCenter = current ? current.pos : { r: (GRID_SIZE - 1) / 2, c: (GRID_SIZE - 1) / 2 };
  const camX = clamp(VIEW / 2 - (camCenter.c + 0.5) * CELL, VIEW - WORLD, 0);
  const camY = clamp(VIEW / 2 - (camCenter.r + 0.5) * CELL, VIEW - WORLD, 0);

  const orderedUnits = game.order.map((id) => game.unitById(id)).filter((u): u is TrpgUnit => !!u && u.alive);

  return (
    <div className="app-shell trpg-screen">
      <div className="trpg-topbar">
        <button type="button" className="link-button" onClick={onExit}>
          ← 나가기
        </button>
        <div className="trpg-round">라운드 {game.round}</div>
        <div className="trpg-initiative">
          {orderedUnits.map((u) => (
            <span key={u.id} className={`init-chip ${u.team} ${current && u.id === current.id ? 'active' : ''}`}>
              {u.name}
            </span>
          ))}
        </div>
      </div>

      <div className="trpg-main">
        <div className="trpg-viewport" style={{ width: VIEW, height: VIEW }}>
          <div className="trpg-world" style={{ width: WORLD, height: WORLD, transform: `translate(${camX}px, ${camY}px)` }}>
            {/* 지형 */}
            {game.map.map((row, r) =>
              row.map((terrain, c) => {
                const key = `${r},${c}`;
                const isReach = reachSet.has(key);
                const unitHere = game.unitAt(r, c);
                const isTarget = !!unitHere && targetIds.has(unitHere.id);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`trpg-cell terrain-${terrain}${isReach ? ' reachable' : ''}${isTarget ? ' targetable' : ''}`}
                    style={{ left: c * CELL, top: r * CELL, width: CELL, height: CELL }}
                    onClick={() => onCellClick(r, c)}
                  >
                    <span className="terrain-icon">{TERRAIN_LABEL[terrain]}</span>
                  </button>
                );
              }),
            )}
            {/* 유닛(이동 애니메이션) */}
            {game.units
              .filter((u) => u.alive)
              .map((u) => (
                <div
                  key={u.id}
                  className={`trpg-unit ${u.team}${current && u.id === current.id ? ' current' : ''}`}
                  style={{ width: CELL, height: CELL, transform: `translate(${u.pos.c * CELL}px, ${u.pos.r * CELL}px)` }}
                >
                  <span className="unit-hpbar">
                    <span className="unit-hpfill" style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                  </span>
                  <TrainerSprite jobId={u.jobId} gender={u.gender} facing="front" className="unit-sprite" />
                </div>
              ))}
          </div>
        </div>

        <aside className="trpg-panel">
          <p className="trpg-message">{message}</p>

          {game.finished ? (
            <div className="trpg-result">
              <p>{game.winner === 'player' ? '🎉 승리했습니다!' : '패배했습니다...'}</p>
              <button type="button" onClick={onExit}>
                홈으로
              </button>
            </div>
          ) : current ? (
            <div className="trpg-turn">
              <div className="trpg-unitinfo">
                <strong>{current.name}</strong> ({getJob(current.jobId).name}) 턴
                <div className="trpg-stats">
                  <span>HP {current.hp}/{current.maxHp}</span>
                  <span>공 {current.attack}</span>
                  <span>마 {current.magic}</span>
                  <span>방 {current.defense}</span>
                  <span>스피드 {current.speed}</span>
                  <span>무기 {getWeapon(current.weaponId).name}(사거리 {game.rangeOf(current)})</span>
                </div>
              </div>

              {!isPlayerTurn ? (
                <p className="trpg-hint">적이 행동 중...</p>
              ) : phase === 'move' ? (
                <div className="trpg-actions">
                  <p className="trpg-hint">이동할 칸(파란색)을 선택하거나 이동을 생략하세요.</p>
                  <button type="button" onClick={() => setPhase('action')}>
                    이동 생략
                  </button>
                </div>
              ) : phase === 'target' ? (
                <div className="trpg-actions">
                  <p className="trpg-hint">공격할 대상(빨간색)을 선택하세요.</p>
                  <button type="button" onClick={() => { setSelectedSkill(null); setPhase('action'); rerender(); }}>
                    취소
                  </button>
                </div>
              ) : (
                <div className="trpg-actions">
                  <p className="trpg-hint">사용할 기술을 선택하세요.</p>
                  <div className="trpg-skills">
                    {game.usableSkills(current).map((skill) => {
                      const uses = current.skillUses[skill.id] ?? 0;
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          disabled={uses <= 0}
                          onClick={() => onSkill(skill.id)}
                          title={skill.description}
                        >
                          {skill.name}
                          <span className="skill-uses">{uses}/{skillMaxUses(skill)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="trpg-swap">
                    <span>무기 교체:</span>
                    {SWAP_WEAPONS.filter((w) => w !== current.weaponId).map((w) => (
                      <button key={w} type="button" onClick={() => onSwap(w)}>
                        {getWeapon(w).name}
                      </button>
                    ))}
                  </div>
                  <div className="trpg-action-row">
                    {game.movedThisTurn && (
                      <button type="button" className="trpg-undo" onClick={onUndoMove}>
                        ↩ 이동 취소
                      </button>
                    )}
                    <button type="button" className="trpg-wait" onClick={finishPlayerTurn}>
                      대기 (턴 종료)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
