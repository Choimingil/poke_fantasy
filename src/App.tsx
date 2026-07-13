import { useRef, useState } from 'react';
import './App.css';
import { pickAiAction } from './game/engine/ai';
import { Battle } from './game/engine/battle';
import { getJob } from './game/data/jobs';
import { getSkill } from './game/data/skills';
import { getWeapon, WEAPONS } from './game/data/weapons';
import { cloneRosterCharacter, ROSTER } from './game/data/roster';
import type { Character } from './game/types';

const FACTION_LABEL: Record<string, string> = { east: '동양', west: '서양' };

function HpBar({ character }: { character: Character }) {
  const ratio = Math.max(0, character.currentHp / character.baseStats.hp);
  return (
    <div className="hp-bar">
      <div className="hp-bar-fill" style={{ width: `${ratio * 100}%` }} />
      <span className="hp-bar-label">
        {character.currentHp} / {character.baseStats.hp}
      </span>
    </div>
  );
}

function CharacterCard({ character, label }: { character: Character; label: string }) {
  const job = getJob(character.jobId);
  const weapon = getWeapon(character.equippedWeapon.templateId);
  return (
    <div className="character-card">
      <div className="character-card-header">
        <strong>{label}</strong> {character.name} · {job.name} ({FACTION_LABEL[character.faction]})
      </div>
      <HpBar character={character} />
      <div className="character-meta">
        무기: {weapon.name} (+{character.equippedWeapon.enhancementLevel}) · 방어구 강화 +{character.armorEnhancementLevel}
      </div>
      <div className="status-badges">
        {character.statusEffects.length === 0 && <span className="status-badge none">정상</span>}
        {character.statusEffects.map((s) => (
          <span key={s.effect} className={`status-badge ${s.effect}`}>
            {s.effect} ({s.turnsRemaining})
          </span>
        ))}
        {character.guarding && <span className="status-badge guard">방어태세</span>}
      </div>
    </div>
  );
}

function App() {
  const [teamAJobId, setTeamAJobId] = useState(ROSTER[0].jobId);
  const [teamBJobId, setTeamBJobId] = useState(ROSTER[6].jobId);
  const battleRef = useRef<Battle | null>(null);
  const [, setTick] = useState(0);
  const [switchTarget, setSwitchTarget] = useState('');

  const battle = battleRef.current;

  const startBattle = () => {
    const a = cloneRosterCharacter(teamAJobId);
    const b = cloneRosterCharacter(teamBJobId);
    battleRef.current = new Battle([a], [b]);
    setSwitchTarget('');
    setTick((t) => t + 1);
  };

  const resetBattle = () => {
    battleRef.current = null;
    setTick((t) => t + 1);
  };

  const activeA = battle?.getActive('A');
  const activeB = battle?.getActive('B');

  const usableSkills = activeA
    ? activeA.skills
        .map((id) => getSkill(id))
        .filter((skill) => skill.type === getWeapon(activeA.equippedWeapon.templateId).type)
        .filter((skill) => skill.category !== 'defense' || getWeapon(activeA.equippedWeapon.templateId).kind === 'shield')
    : [];

  const playSkill = (skillId: string) => {
    if (!battle || !activeA || !activeB) return;
    const actionB = pickAiAction(activeB);
    battle.runTurn({ skillId }, actionB);
    setTick((t) => t + 1);
  };

  const playSwitchWeapon = () => {
    if (!battle || !activeA || !activeB || !switchTarget) return;
    const actionB = pickAiAction(activeB);
    battle.runTurn({ switchWeaponTo: switchTarget }, actionB);
    setSwitchTarget('');
    setTick((t) => t + 1);
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

  return (
    <div className="app-shell">
      <h1>포켓판타지 - 전투 코어 프로토타입</h1>
      <div className="battle-panel">
        <CharacterCard character={activeA!} label="A" />
        <CharacterCard character={activeB!} label="B" />
      </div>

      {!battle.finished && (
        <div className="action-panel">
          <div className="skill-buttons">
            {usableSkills.length === 0 && <p>사용 가능한 스킬이 없습니다 (무기 타입을 확인하세요).</p>}
            {usableSkills.map((skill) => (
              <button key={skill.id} type="button" onClick={() => playSkill(skill.id)}>
                {skill.name} ({skill.type}/{skill.category})
              </button>
            ))}
          </div>
          <div className="weapon-switch">
            <select value={switchTarget} onChange={(e) => setSwitchTarget(e.target.value)}>
              <option value="">무기 교체...</option>
              {WEAPONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type}/{w.handedness})
                </option>
              ))}
            </select>
            <button type="button" disabled={!switchTarget} onClick={playSwitchWeapon}>
              교체 (턴 소모)
            </button>
          </div>
        </div>
      )}

      {battle.finished && (
        <div className="result-panel">
          <p>전투 종료! 승자: {battle.winner === 'A' ? 'A팀' : battle.winner === 'B' ? 'B팀' : '무승부'}</p>
          <button type="button" onClick={resetBattle}>
            다시 하기
          </button>
        </div>
      )}

      <div className="battle-log">
        {battle.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
