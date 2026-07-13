import { useRef, useState } from 'react';
import './App.css';
import { TrainerSprite } from './components/TrainerSprite';
import { pickAiAction } from './game/engine/ai';
import { Battle, type BattleAction, type Side } from './game/engine/battle';
import { getJob } from './game/data/jobs';
import { getSkill } from './game/data/skills';
import { getWeapon, WEAPONS } from './game/data/weapons';
import { cloneRosterCharacter, ROSTER } from './game/data/roster';
import type { Character } from './game/types';

const STEP_DURATION_MS = 1100;
const PRE_STEP_DURATION_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hpRatioClass(ratio: number): string {
  if (ratio <= 0.2) return 'low';
  if (ratio <= 0.5) return 'mid';
  return 'high';
}

function HpBar({ character }: { character: Character }) {
  const ratio = Math.max(0, character.currentHp / character.baseStats.hp);
  return (
    <div className="hp-bar">
      <div className={`hp-bar-fill ${hpRatioClass(ratio)}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function StatusBox({ character, side }: { character: Character; side: Side }) {
  const job = getJob(character.jobId);
  return (
    <div className={`status-box status-box-${side === 'A' ? 'player' : 'opponent'}`}>
      <div className="status-box-name-row">
        <span className="status-box-name">{character.name}</span>
        <span className="status-box-job">{job.name}</span>
      </div>
      <HpBar character={character} />
      <div className="status-box-hp-text">
        {character.currentHp} / {character.baseStats.hp}
      </div>
      {(character.statusEffects.length > 0 || character.guarding) && (
        <div className="status-badges">
          {character.statusEffects.map((s) => (
            <span key={s.effect} className={`status-badge ${s.effect}`}>
              {s.effect}
            </span>
          ))}
          {character.guarding && <span className="status-badge guard">방어</span>}
        </div>
      )}
    </div>
  );
}

interface AnimState {
  attacker: Side | null;
  target: Side | null;
  targetEffect: 'hit' | 'faint' | 'heal' | null;
  id: number;
}

const NO_ANIM: AnimState = { attacker: null, target: null, targetEffect: null, id: 0 };

function App() {
  const [teamAJobId, setTeamAJobId] = useState(ROSTER[0].jobId);
  const [teamBJobId, setTeamBJobId] = useState(ROSTER[6].jobId);
  const battleRef = useRef<Battle | null>(null);
  const busyRef = useRef(false);
  const animCounter = useRef(0);
  const [, setTick] = useState(0);
  const [switchTarget, setSwitchTarget] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [anim, setAnim] = useState<AnimState>(NO_ANIM);

  const forceRerender = () => setTick((t) => t + 1);
  const battle = battleRef.current;

  const startBattle = () => {
    const a = cloneRosterCharacter(teamAJobId);
    const b = cloneRosterCharacter(teamBJobId);
    battleRef.current = new Battle([a], [b]);
    setSwitchTarget('');
    setMessage(null);
    setAnim(NO_ANIM);
    forceRerender();
  };

  const resetBattle = () => {
    battleRef.current = null;
    forceRerender();
  };

  const activeA = battle?.getActive('A');
  const activeB = battle?.getActive('B');

  const usableSkills = activeA
    ? activeA.skills
        .map((id) => getSkill(id))
        .filter((skill) => skill.type === getWeapon(activeA.equippedWeapon.templateId).type)
        .filter((skill) => skill.category !== 'defense' || getWeapon(activeA.equippedWeapon.templateId).kind === 'shield')
    : [];

  const playTurn = async (actionA: BattleAction) => {
    const currentBattle = battleRef.current;
    if (!currentBattle || busyRef.current || currentBattle.finished) return;
    const opponent = currentBattle.getActive('B');
    const actionB = pickAiAction(opponent);

    busyRef.current = true;
    setIsAnimating(true);

    const preLogIdx = currentBattle.log.length;
    currentBattle.beginTurn(actionA, actionB);
    const preLines = currentBattle.log.slice(preLogIdx).filter((line) => !line.startsWith('---'));
    if (preLines.length > 0) {
      setMessage(preLines.join(' '));
      forceRerender();
      await delay(PRE_STEP_DURATION_MS);
    }

    while (currentBattle.hasPendingStep()) {
      const step = currentBattle.resolveNextStep();
      animCounter.current += 1;
      setAnim({
        attacker: step.skipped ? null : step.actorSide,
        target: step.missed ? null : step.targetSide,
        targetEffect: step.targetFainted ? 'faint' : step.isHeal ? 'heal' : step.missed ? null : step.isAttack ? 'hit' : null,
        id: animCounter.current,
      });
      setMessage(step.lines.length > 0 ? step.lines.join(' ') : `${step.actorName}가 행동했다.`);
      forceRerender();
      await delay(STEP_DURATION_MS);
    }

    setAnim(NO_ANIM);
    setMessage(null);
    forceRerender();
    setIsAnimating(false);
    busyRef.current = false;
  };

  const playSkill = (skillId: string) => {
    void playTurn({ skillId });
  };

  const playSwitchWeapon = () => {
    if (!switchTarget) return;
    const target = switchTarget;
    setSwitchTarget('');
    void playTurn({ switchWeaponTo: target });
  };

  if (!battle) {
    return (
      <div className="app-shell">
        <h1>포켓판타지 - 전투 코어 프로토타입</h1>
        <div className="setup-panel">
          <label>
            A팀 캐릭터
            <select value={teamAJobId} onChange={(e) => setTeamAJobId(e.target.value)}>
              {ROSTER.map((c) => (
                <option key={c.jobId} value={c.jobId}>
                  {c.name} ({getJob(c.jobId).name})
                </option>
              ))}
            </select>
          </label>
          <label>
            B팀 캐릭터 (AI)
            <select value={teamBJobId} onChange={(e) => setTeamBJobId(e.target.value)}>
              {ROSTER.map((c) => (
                <option key={c.jobId} value={c.jobId}>
                  {c.name} ({getJob(c.jobId).name})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={startBattle}>
            전투 시작
          </button>
        </div>
      </div>
    );
  }

  const opponentAnimClasses = [
    anim.attacker === 'B' ? 'sprite-attack-front' : '',
    anim.target === 'B' && anim.targetEffect === 'hit' ? 'sprite-hit' : '',
    anim.target === 'B' && anim.targetEffect === 'faint' ? 'sprite-faint' : '',
    anim.target === 'B' && anim.targetEffect === 'heal' ? 'sprite-heal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const playerAnimClasses = [
    anim.attacker === 'A' ? 'sprite-attack-back' : '',
    anim.target === 'A' && anim.targetEffect === 'hit' ? 'sprite-hit' : '',
    anim.target === 'A' && anim.targetEffect === 'faint' ? 'sprite-faint' : '',
    anim.target === 'A' && anim.targetEffect === 'heal' ? 'sprite-heal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app-shell">
      <div className="battle-scene">
        <div className="battle-field">
          <div className="opponent-platform" />
          <div className="player-platform" />
          <div key={`opp-${anim.id}-${anim.target === 'B' ? anim.targetEffect : ''}`} className={`opponent-sprite-wrap ${opponentAnimClasses}`}>
            <TrainerSprite facing="front" className="opponent-sprite" />
          </div>
          <div key={`ply-${anim.id}-${anim.target === 'A' ? anim.targetEffect : ''}`} className={`player-sprite-wrap ${playerAnimClasses}`}>
            <TrainerSprite facing="back" className="player-sprite" />
          </div>
          <StatusBox character={activeB!} side="B" />
          <StatusBox character={activeA!} side="A" />
        </div>

        <div className="message-box">
          {message !== null ? (
            <p className="message-text">{message}</p>
          ) : battle.finished ? (
            <div className="result-panel">
              <p>전투 종료! 승자: {battle.winner === 'A' ? 'A팀' : battle.winner === 'B' ? 'B팀' : '무승부'}</p>
              <button type="button" onClick={resetBattle}>
                다시 하기
              </button>
            </div>
          ) : (
            <div className="action-panel">
              <div className="skill-buttons">
                {usableSkills.length === 0 && <p>사용 가능한 스킬이 없습니다 (무기 타입을 확인하세요).</p>}
                {usableSkills.map((skill) => (
                  <button key={skill.id} type="button" disabled={isAnimating} onClick={() => playSkill(skill.id)}>
                    {skill.name}
                  </button>
                ))}
              </div>
              <div className="weapon-switch">
                <select value={switchTarget} onChange={(e) => setSwitchTarget(e.target.value)} disabled={isAnimating}>
                  <option value="">무기 교체...</option>
                  {WEAPONS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type}/{w.handedness})
                    </option>
                  ))}
                </select>
                <button type="button" disabled={!switchTarget || isAnimating} onClick={playSwitchWeapon}>
                  교체 (턴 소모)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
