import { useRef, useState } from 'react';
import './App.css';
import { TrainerSprite, type Gender } from './components/TrainerSprite';
import { InventoryPage } from './components/InventoryPage';
import { TrpgBattle, type PartyMember } from './components/TrpgBattle';
import battleForest from './assets/battle-forest.jpg';
import { pickAiAction } from './game/engine/ai';
import { Battle, type BattleAction, type Side } from './game/engine/battle';
import { getJob } from './game/data/jobs';
import { getSkill, skillUsableWithWeapon } from './game/data/skills';
import { getWeapon, WEAPONS } from './game/data/weapons';
import { cloneRosterCharacter, ROSTER } from './game/data/roster';
import { loadLoadouts, saveLoadouts, type LoadoutMap } from './game/data/loadouts';
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
  const [teamAGender, setTeamAGender] = useState<Gender>('male');
  const [teamBGender, setTeamBGender] = useState<Gender>('male');
  const [view, setView] = useState<'home' | 'inventory' | 'trpg-setup'>('home');
  const [loadouts, setLoadouts] = useState<LoadoutMap>(() => loadLoadouts());
  const [trpgActive, setTrpgActive] = useState(false);
  const [trpgParty, setTrpgParty] = useState<PartyMember[]>([
    { jobId: 'east_general', gender: 'male' },
    { jobId: 'east_shaman', gender: 'female' },
    { jobId: 'east_archer', gender: 'male' },
  ]);
  const trpgEnemyParty: PartyMember[] = [
    { jobId: 'west_knight', gender: 'male' },
    { jobId: 'west_witch', gender: 'female' },
    { jobId: 'west_archer', gender: 'male' },
  ];
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
    const loadoutA = loadouts[teamAJobId];
    const loadoutB = loadouts[teamBJobId];
    if (loadoutA && loadoutA.length > 0) a.skills = [...loadoutA];
    if (loadoutB && loadoutB.length > 0) b.skills = [...loadoutB];
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

  const exitToHome = () => {
    busyRef.current = false;
    setIsAnimating(false);
    setAnim(NO_ANIM);
    setMessage(null);
    battleRef.current = null;
    setView('home');
    forceRerender();
  };

  const updateLoadout = (jobId: string, skills: string[]) => {
    setLoadouts((prev) => {
      const next = { ...prev, [jobId]: skills };
      saveLoadouts(next);
      return next;
    });
  };

  const activeA = battle?.getActive('A');
  const activeB = battle?.getActive('B');

  const usableSkills = activeA
    ? activeA.skills
        .map((id) => getSkill(id))
        .filter((skill) => skillUsableWithWeapon(skill, getWeapon(activeA.equippedWeapon.templateId)))
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

  if (trpgActive) {
    return (
      <TrpgBattle
        playerParty={trpgParty}
        enemyParty={trpgEnemyParty}
        onExit={() => {
          setTrpgActive(false);
          setView('home');
        }}
      />
    );
  }

  if (!battle && view === 'inventory') {
    return <InventoryPage loadouts={loadouts} onChange={updateLoadout} onBack={() => setView('home')} />;
  }

  if (!battle && view === 'trpg-setup') {
    return (
      <div className="app-shell setup-screen">
        <h1>TRPG 전투 — 아군 편성 (3명)</h1>
        <div className="setup-panel">
          {trpgParty.map((member, i) => (
            <div key={i} className="trpg-party-row">
              <label>
                {i + 1}번 캐릭터
                <select
                  value={member.jobId}
                  onChange={(e) =>
                    setTrpgParty((prev) => prev.map((m, j) => (j === i ? { ...m, jobId: e.target.value } : m)))
                  }
                >
                  {ROSTER.map((c) => (
                    <option key={c.jobId} value={c.jobId}>
                      {c.name} ({getJob(c.jobId).name})
                    </option>
                  ))}
                </select>
              </label>
              <div className="gender-toggle" role="group" aria-label={`${i + 1}번 성별`}>
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={member.gender === g ? 'active' : ''}
                    onClick={() => setTrpgParty((prev) => prev.map((m, j) => (j === i ? { ...m, gender: g } : m)))}
                  >
                    {g === 'male' ? '남' : '여'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="trpg-enemy-note">
            상대 팀: {trpgEnemyParty.map((m) => getJob(m.jobId).name).join(', ')}
          </p>
          <button type="button" onClick={() => setTrpgActive(true)}>
            TRPG 전투 시작
          </button>
          <button type="button" className="secondary-button" onClick={() => setView('home')}>
            뒤로
          </button>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="app-shell setup-screen">
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
          <div className="gender-toggle" role="group" aria-label="A팀 성별">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={teamAGender === g ? 'active' : ''}
                onClick={() => setTeamAGender(g)}
              >
                {g === 'male' ? '남자' : '여자'}
              </button>
            ))}
          </div>
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
          <div className="gender-toggle" role="group" aria-label="B팀 성별">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={teamBGender === g ? 'active' : ''}
                onClick={() => setTeamBGender(g)}
              >
                {g === 'male' ? '남자' : '여자'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setView('trpg-setup')}>
            TRPG 전투 (그리드)
          </button>
          <button type="button" className="secondary-button" onClick={startBattle}>
            액션 전투 (기존)
          </button>
          <button type="button" className="secondary-button" onClick={() => setView('inventory')}>
            기술 인벤토리 / 세팅
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
          <button type="button" className="battle-back" onClick={exitToHome}>
            ← 나가기
          </button>
          <div className="battle-stage">
            <img className="battle-bg" src={battleForest} alt="" aria-hidden="true" />

            <div className="opponent-stand">
              <div
                key={`opp-${anim.id}-${anim.target === 'B' ? anim.targetEffect : ''}`}
                className={`opponent-sprite-wrap ${opponentAnimClasses}`}
              >
                <TrainerSprite
                  jobId={activeB!.jobId}
                  gender={teamBGender}
                  facing="front"
                  className="opponent-sprite"
                />
              </div>
            </div>

            <div className="player-stand">
              <div
                key={`ply-${anim.id}-${anim.target === 'A' ? anim.targetEffect : ''}`}
                className={`player-sprite-wrap ${playerAnimClasses}`}
              >
                <TrainerSprite
                  jobId={activeA!.jobId}
                  gender={teamAGender}
                  facing="back"
                  className="player-sprite"
                />
              </div>
            </div>

            <StatusBox character={activeB!} side="B" />
            <StatusBox character={activeA!} side="A" />
          </div>
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
