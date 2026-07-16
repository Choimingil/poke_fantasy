import { useState } from 'react';
import { getJob } from '../game/data/jobs';
import { getLearnableSkills, skillPowerPercent } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { ROSTER } from '../game/data/roster';
import type { LoadoutMap } from '../game/data/loadouts';
import {
  baseWeaponId,
  EXTRA_WEAPON_SLOTS,
  TRPG_WEAPON_IDS,
  type WeaponLoadoutMap,
} from '../game/data/weaponLoadouts';
import { TrainerSprite, type Gender } from './TrainerSprite';

interface InventoryPageProps {
  loadouts: LoadoutMap;
  onChange: (jobId: string, skills: string[]) => void;
  weaponLoadouts: WeaponLoadoutMap;
  onWeaponChange: (jobId: string, weapons: string[]) => void;
  onBack: () => void;
}

const ARMOR_BY_TYPE: Record<string, string> = { melee: '판금', ranged: '중갑', magic: '가죽' };

export function InventoryPage({ loadouts, onChange, weaponLoadouts, onWeaponChange, onBack }: InventoryPageProps) {
  const [jobId, setJobId] = useState(ROSTER[0].jobId);
  const [gender, setGender] = useState<Gender>('male');

  const character = ROSTER.find((c) => c.jobId === jobId)!;
  const job = getJob(jobId);
  const learnable = getLearnableSkills(jobId);
  const equipped = loadouts[jobId] ?? [];
  const slots = job.skillSlots;

  const base = baseWeaponId(jobId);
  const extras = weaponLoadouts[jobId] ?? [];

  const toggle = (skillId: string) => {
    if (equipped.includes(skillId)) {
      onChange(jobId, equipped.filter((id) => id !== skillId));
    } else if (equipped.length < slots) {
      onChange(jobId, [...equipped, skillId]);
    }
  };

  const setExtra = (slot: number, weaponId: string) => {
    const next = [...extras];
    if (weaponId === '') next.splice(slot, 1);
    else next[slot] = weaponId;
    // 중복 제거 + 빈칸 제거, 최대 슬롯 수 유지.
    onWeaponChange(jobId, [...new Set(next.filter(Boolean))].slice(0, EXTRA_WEAPON_SLOTS));
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

          <div className="inventory-equip">
            <h3>장비</h3>
            <p className="equip-row">
              <span>기본 무기</span>
              <strong>{getWeapon(base).name}</strong>
            </p>
            <p className="equip-row">
              <span>방어구</span>
              <strong>{ARMOR_BY_TYPE[job.type] ?? '천'}</strong>
            </p>
            <p className="equip-label">추가 무기 (최대 {EXTRA_WEAPON_SLOTS})</p>
            {Array.from({ length: EXTRA_WEAPON_SLOTS }, (_, i) => {
              const cur = extras[i] ?? '';
              return (
                <select key={i} value={cur} onChange={(e) => setExtra(i, e.target.value)} aria-label={`추가 무기 슬롯 ${i + 1}`}>
                  <option value="">(비어있음)</option>
                  {TRPG_WEAPON_IDS.filter((w) => w === cur || (w !== base && !extras.includes(w))).map((w) => (
                    <option key={w} value={w}>
                      {getWeapon(w).name}
                    </option>
                  ))}
                </select>
              );
            })}
          </div>
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
                <th>위력</th>
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
                    <td>{skill.category === 'attack' ? `${skillPowerPercent(skill.power)}%` : '-'}</td>
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
