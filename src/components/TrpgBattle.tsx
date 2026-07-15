import { useCallback, useEffect, useRef, useState } from 'react';
import { getJob } from '../game/data/jobs';
import { getSkill } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { cloneRosterCharacter } from '../game/data/roster';
import { crossTiles, GRID_SIZE, type Coord, type Terrain } from '../game/trpg/map';
import {
  ARMORS,
  armorName,
  armorRequiredAttack,
  armorRequiredLevel,
  TrpgGame,
  skillMaxUses,
  type ArmorType,
  type StepResult,
  type TimeOfDay,
  type TrpgUnit,
  type UnitDef,
  type Weather,
} from '../game/trpg/engine';
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

const TERRAIN_LABEL: Record<Terrain, string> = {
  plain: '',
  forest: '🌳',
  water: '🌊',
  rock: '🪨',
  hill: '⛰️',
};
const WEATHER_LABEL: Record<Weather, string> = { clear: '맑음', rain: '비', snow: '눈', heat: '폭염' };
const TIME_LABEL: Record<TimeOfDay, string> = { day: '낮', night: '밤' };
const SWAP_WEAPONS = ['trpg_sword', 'trpg_bow', 'trpg_staff'];

const CELL = 64; // 정사각형 칸(px)
const VIEW_TILES = 7; // 한 화면에 보이는 칸 수(카메라)
const VIEW = CELL * VIEW_TILES;
const WORLD = CELL * GRID_SIZE;

type Phase = 'move' | 'action' | 'target';
interface Motion {
  attackerId?: string;
  targetIds: string[];
  id: number;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
  const [motion, setMotion] = useState<Motion | null>(null);
  const [hoverCell, setHoverCell] = useState<Coord | null>(null);
  const busyRef = useRef(false);
  const processingRef = useRef<string | null>(null);
  const motionCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const playMotion = (attackerId?: string, targetIds: string[] = []) => {
    motionCounter.current += 1;
    setMotion({ attackerId, targetIds, id: motionCounter.current });
  };

  // 특정 칸이 화면 중앙에 오도록 스크롤(수동 스크롤과 공존).
  const centerOn = useCallback((coord: Coord, smooth = false) => {
    const sc = scrollRef.current;
    if (!sc) return;
    sc.scrollTo({
      left: (coord.c + 0.5) * CELL - sc.clientWidth / 2,
      top: (coord.r + 0.5) * CELL - sc.clientHeight / 2,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // 경로(양 끝 포함)를 따라 유닛을 한 칸씩 이동시키며 애니메이션한다(카메라 추적).
  const animatePath = useCallback(
    async (unit: TrpgUnit, path: Coord[]) => {
      for (let i = 1; i < path.length; i += 1) {
        game.setUnitPos(unit, path[i]);
        centerOn(path[i]);
        rerender();
        await delay(170);
      }
    },
    [game, centerOn],
  );

  const current = game.current();
  const isPlayerTurn = !!current && current.team === 'player' && !game.finished && !busyRef.current;
  const currentId = current?.id ?? null;

  // 적 턴: 이동 → 공격 순으로 애니메이션하며 처리. 의존성은 "현재 유닛 id".
  useEffect(() => {
    if (game.finished) return undefined;
    const cur = game.current();
    if (!cur || cur.team !== 'enemy') return undefined;
    if (processingRef.current === cur.id) return undefined;
    processingRef.current = cur.id;
    busyRef.current = true;
    let active = true;
    const visibleAt = (unitId?: string) => {
      if (!unitId) return false;
      const u = game.unitById(unitId);
      return !!u && game.visibleSet().has(`${u.pos.r},${u.pos.c}`);
    };
    // 공격은 아군이 피격되므로 항상 알 수 있다. 단, 공격자가 시야 밖이면 모션은 숨긴다.
    const showAttack = async (res: StepResult) => {
      setMessage(res.lines.join(' '));
      playMotion(visibleAt(res.attackerId) ? res.attackerId : undefined, res.targetIds);
      rerender();
      await delay(720);
      setMotion(null);
    };
    (async () => {
      await delay(400);
      const first = game.aiTryAttack();
      if (first.lines.length > 0) {
        await showAttack(first);
      } else {
        const path = game.aiPlanMove();
        if (path && path.length > 1) {
          await animatePath(cur, path);
          setMessage(visibleAt(cur.id) ? `${cur.name}가 이동했다.` : '적이 시야 밖에서 움직였다.');
          rerender();
          await delay(150);
        }
        const atk = game.aiTryAttack();
        if (atk.lines.length > 0) {
          await showAttack(atk);
        } else {
          setMessage(visibleAt(cur.id) ? `${cur.name}가 대기했다.` : '');
          rerender();
          await delay(450);
        }
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
  }, [currentId, game, animatePath]);

  // 턴이 바뀌면 현재 유닛을 화면 중앙으로(수동 스크롤은 언제든 가능).
  useEffect(() => {
    const cur = game.current();
    if (cur) centerOn(cur.pos, true);
  }, [currentId, game, centerOn]);

  const finishPlayerTurn = () => {
    game.endTurn();
    setSelectedSkill(null);
    setHoverCell(null);
    setPhase('move');
    rerender();
  };

  // 플레이어 공격 결과를 모션과 함께 보여준 뒤 턴을 종료한다.
  const resolvePlayerAttack = async (res: StepResult) => {
    busyRef.current = true;
    setMessage(res.lines.join(' '));
    playMotion(res.attackerId, res.targetIds);
    rerender();
    await delay(560);
    setMotion(null);
    busyRef.current = false;
    finishPlayerTurn();
  };

  const selSkill = selectedSkill ? getSkill(selectedSkill) : null;
  const isAoe = !!selSkill?.aoeRadius;

  const reachable = isPlayerTurn && phase === 'move' && current ? game.reachableTiles(current) : [];
  const reachSet = new Set(reachable.map((t) => `${t.r},${t.c}`));

  const singleTargets =
    isPlayerTurn && phase === 'target' && current && selSkill && !isAoe ? game.targetsFor(current, selSkill) : [];
  const targetIds = new Set(singleTargets.map((t) => t.id));

  const aoeCenters =
    isPlayerTurn && phase === 'target' && current && selSkill && isAoe ? game.aoeCenters(current, selSkill) : [];
  const centerSet = new Set(aoeCenters.map((t) => `${t.r},${t.c}`));
  const previewSet =
    isAoe && hoverCell && selSkill
      ? new Set(crossTiles(hoverCell, selSkill.aoeRadius ?? 1).map((t) => `${t.r},${t.c}`))
      : new Set<string>();

  const onCellClick = async (r: number, c: number) => {
    if (!isPlayerTurn || !current) return;
    if (phase === 'move') {
      const key = `${r},${c}`;
      if (reachSet.has(key)) {
        const path = game.planMoveTo({ r, c });
        if (path) {
          busyRef.current = true;
          rerender();
          await animatePath(current, path);
          busyRef.current = false;
          if (game.movedExhausted) {
            setMessage('언덕에 올라 이번 턴 행동을 마쳤다.');
            finishPlayerTurn();
          } else {
            setPhase('action');
          }
          rerender();
        }
      }
      return;
    }
    if (phase === 'target' && selectedSkill) {
      if (isAoe) {
        if (centerSet.has(`${r},${c}`)) void resolvePlayerAttack(game.useSkillAoe(selectedSkill, { r, c }));
        return;
      }
      const unit = game.unitAt(r, c);
      if (unit && targetIds.has(unit.id)) void resolvePlayerAttack(game.useSkill(selectedSkill, unit.id));
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
    const hasTarget = skill.aoeRadius ? game.aoeCenters(current, skill).length > 0 : game.targetsFor(current, skill).length > 0;
    if (!hasTarget) {
      setMessage('사거리 내에 대상이 없습니다. 이동하거나 다른 행동을 선택하세요.');
    } else {
      setSelectedSkill(skillId);
      setHoverCell(null);
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

  const onSwapArmor = (armorType: ArmorType) => {
    if (!current) return;
    const res = game.swapArmor(armorType);
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

  const orderedUnits = game.order.map((id) => game.unitById(id)).filter((u): u is TrpgUnit => !!u && u.alive);
  const visible = game.visibleSet();
  const isVisible = (r: number, c: number) => visible.has(`${r},${c}`);

  return (
    <div className="app-shell trpg-screen">
      <div className="trpg-topbar">
        <button type="button" className="link-button" onClick={onExit}>
          ← 나가기
        </button>
        <div className="trpg-round">라운드 {game.round}</div>
        <div className="trpg-env">
          {TIME_LABEL[game.time]} · {WEATHER_LABEL[game.weather]}
        </div>
        <div className="trpg-initiative">
          {orderedUnits.map((u) => {
            const seen = u.team === 'player' || isVisible(u.pos.r, u.pos.c);
            return (
              <span key={u.id} className={`init-chip ${u.team} ${current && u.id === current.id ? 'active' : ''}`}>
                {seen ? u.name : '???'}
              </span>
            );
          })}
        </div>
      </div>

      <div className="trpg-main">
        <div className={`trpg-viewport time-${game.time} weather-${game.weather}`} style={{ width: VIEW, height: VIEW }}>
          <div className="trpg-scroll" ref={scrollRef} style={{ width: VIEW, height: VIEW }}>
          <div className="trpg-world" style={{ width: WORLD, height: WORLD }}>
            {game.map.map((row, r) =>
              row.map((terrain, c) => {
                const key = `${r},${c}`;
                const cls = [
                  'trpg-cell',
                  `terrain-${terrain}`,
                  isVisible(r, c) ? '' : 'fog',
                  reachSet.has(key) ? 'reachable' : '',
                  centerSet.has(key) ? 'aoe-center' : '',
                  previewSet.has(key) ? 'aoe-preview' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const unitHere = game.unitAt(r, c);
                const isTarget = !!unitHere && targetIds.has(unitHere.id);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`${cls}${isTarget ? ' targetable' : ''}`}
                    style={{ left: c * CELL, top: r * CELL, width: CELL, height: CELL }}
                    onClick={() => void onCellClick(r, c)}
                    onMouseEnter={() => isAoe && setHoverCell({ r, c })}
                  >
                    <span className="terrain-icon">{TERRAIN_LABEL[terrain]}</span>
                  </button>
                );
              }),
            )}
            {game.units
              .filter((u) => u.alive)
              // 적 유닛은 시야(암흑) 밖이면 표시하지 않는다. 아군은 항상 표시.
              .filter((u) => u.team === 'player' || isVisible(u.pos.r, u.pos.c))
              .map((u) => {
                const isAtk = motion?.attackerId === u.id;
                const isHit = !!motion?.targetIds.includes(u.id);
                const innerKey = (isAtk || isHit) && motion ? `m${motion.id}` : 'idle';
                const innerCls = isAtk ? 'attacking' : isHit ? 'hit' : '';
                return (
                  <div
                    key={u.id}
                    className={`trpg-unit ${u.team}${current && u.id === current.id ? ' current' : ''}`}
                    style={{ width: CELL, height: CELL, transform: `translate(${u.pos.c * CELL}px, ${u.pos.r * CELL}px)` }}
                  >
                    <div key={innerKey} className={`unit-inner ${innerCls}`}>
                      <span className="unit-hpbar">
                        <span className="unit-hpfill" style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                      </span>
                      <TrainerSprite jobId={u.jobId} gender={u.gender} facing="front" className="unit-sprite" />
                    </div>
                  </div>
                );
              })}
          </div>
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
                  <span>지구력 {current.endurance}</span>
                  <span>정신력 {Math.round(game.willpower(current) * 100)}%</span>
                  <span>방 {game.effectiveDefense(current)}</span>
                  <span>스피드 {current.speed}</span>
                  <span>이동 {game.moveTiles(current)}{game.isSlowMover(current) ? ' (2턴에 1칸)' : ''}</span>
                  <span>시야 {game.effectiveVision(current)}</span>
                  <span>무기 {getWeapon(current.weaponId).name}(사거리 {game.rangeOf(current)})</span>
                  <span>방어구 {armorName(current.armorType)}</span>
                </div>
              </div>

              {!isPlayerTurn ? (
                <p className="trpg-hint">적이 행동 중...</p>
              ) : phase === 'move' ? (
                <div className="trpg-actions">
                  <p className="trpg-hint">
                    {reachable.length === 0
                      ? game.isSlowMover(current)
                        ? '이동력이 1 미만이라 이번 턴은 이동할 수 없습니다(2턴에 1칸). 행동을 선택하세요.'
                        : '이동력이 부족해 이동할 수 없습니다. 이동을 생략하고 행동하세요.'
                      : '이동할 칸(파란색)을 선택하세요. 언덕(⛰️)은 오르면 그 턴 행동이 종료됩니다.'}
                  </p>
                  <button type="button" onClick={() => setPhase('action')}>
                    이동 생략
                  </button>
                </div>
              ) : phase === 'target' ? (
                <div className="trpg-actions">
                  <p className="trpg-hint">
                    {isAoe ? '주황색 칸을 선택하면 십자 범위의 적이 모두 피해를 입습니다.' : '공격할 대상(빨간색)을 선택하세요.'}
                  </p>
                  <button type="button" onClick={() => { setSelectedSkill(null); setHoverCell(null); setPhase('action'); rerender(); }}>
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
                  <div className="trpg-swap">
                    <span>방어구 교체:</span>
                    {ARMORS.filter((a) => a.id !== current.armorType).map((a) => {
                      const req = armorRequiredAttack(a.id);
                      const locked = current.attack < req;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          disabled={locked}
                          title={req > 0 ? `요구 레벨 ${armorRequiredLevel(a.id)} · 요구 공격력 ${req}` : '요구 없음'}
                          onClick={() => onSwapArmor(a.id)}
                        >
                          {a.name}
                          {req > 0 ? ` (공${req})` : ''}
                        </button>
                      );
                    })}
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
