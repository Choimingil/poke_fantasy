import { useState } from 'react';
import { getJob } from '../game/data/jobs';
import { getLearnableSkills } from '../game/data/skills';
import { ROSTER } from '../game/data/roster';
import type { LoadoutMap } from '../game/data/loadouts';
import { TrainerSprite, type Gender } from './TrainerSprite';

interface InventoryPageProps {
  loadouts: LoadoutMap;
  onChange: (jobId: string, skills: string[]) => void;
  onBack: () => void;
}

export function InventoryPage({ loadouts, onChange, onBack }: InventoryPageProps) {
  const [jobId, setJobId] = useState(ROSTER[0].jobId);
  const [gender, setGender] = useState<Gender>('male');

  const character = ROSTER.find((c) => c.jobId === jobId)!;
  const job = getJob(jobId);
  const learnable = getLearnableSkills(jobId);
  const equipped = loadouts[jobId] ?? [];
  const slots = job.skillSlots;

  const toggle = (skillId: string) => {
    if (equipped.includes(skillId)) {
      onChange(jobId, equipped.filter((id) => id !== skillId));
    } else if (equipped.length < slots) {
      onChange(jobId, [...equipped, skillId]);
    }
  };

  return (
    <div className="app-shell inventory-screen">
      <div className="inventory-header">
        <button type="button" className="link-button" onClick={onBack}>
          ← 홈으로
        </button>
        <h1>기술 인벤토리</h1>
      </div>

      <div className="inventory-body">
        <aside className="inventory-side">
          <label>
            캐릭터
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {ROSTER.map((c) => (
                <option key={c.jobId} value={c.jobId}>
                  {c.name} ({getJob(c.jobId).name})
                </option>
              ))}
            </select>
          </label>
          <div className="gender-toggle" role="group" aria-label="성별">
            {(['male', 'female'] as const).map((g) => (
              <button key={g} type="button" className={gender === g ? 'active' : ''} onClick={() => setGender(g)}>
                {g === 'male' ? '남자' : '여자'}
              </button>
            ))}
          </div>
          <div className="inventory-preview">
            <TrainerSprite jobId={jobId} gender={gender} facing="front" className="inventory-sprite" />
          </div>
          <p className="inventory-slots">
            장착 기술 <strong>{equipped.length}</strong> / {slots}
          </p>
        </aside>

        <section className="inventory-main">
          <p className="inventory-hint">
            {character.name}이(가) 배울 수 있는 기술입니다. 최대 {slots}개까지 장착할 수 있습니다.
          </p>
          <div className="skill-table-scroll">
          <table className="skill-table">
            <thead>
              <tr>
                <th>장착</th>
                <th>사용 직업</th>
                <th>기술명</th>
                <th>기술설명</th>
                <th>타입</th>
                <th>명중률</th>
              </tr>
            </thead>
            <tbody>
              {learnable.map((skill) => {
                const on = equipped.includes(skill.id);
                const full = !on && equipped.length >= slots;
                return (
                  <tr key={skill.id} className={on ? 'equipped' : ''}>
                    <td>
                      <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(skill.id)} aria-label={`${skill.name} 장착`} />
                    </td>
                    <td>{skill.learnableBy === 'common' ? '공통' : job.name}</td>
                    <td className="skill-name">{skill.name}</td>
                    <td>{skill.description}</td>
                    <td>
                      <span className={`type-badge type-${skill.typeLabel}`}>{skill.typeLabel}</span>
                    </td>
                    <td>{skill.accuracyLabel ?? `${skill.accuracy}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>
      </div>
    </div>
  );
}
