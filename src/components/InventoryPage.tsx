import { useState } from 'react';
import { getJob } from '../game/data/jobs';
import { getLearnableSkills, skillPowerPercent } from '../game/data/skills';
import { getWeapon } from '../game/data/weapons';
import { ROSTER } from '../game/data/roster';
import type { LoadoutMap } from '../game/data/loadouts';
import {
  baseWeaponId,
  EXTRA_WEAPON_SLOTS,
  registerableWeapons,
  type WeaponLoadoutMap,
} from '../game/data/weaponLoadouts';
import {
  TOME_EFFECTS,
  TOME_EFFECT_LABEL,
  type EquipConfig,
  type Offhand,
  type TomeEffect,
} from '../game/data/equipment';
import {
  pendingPoints,
  xpForNext,
  type Progress,
  type ProgressMap,
  type StatAlloc,
} from '../game/data/progression';
import { TrainerSprite, type Gender } from './TrainerSprite';

interface InventoryPageProps {
  loadouts: LoadoutMap;
  onChange: (jobId: string, skills: string[]) => void;
  weaponLoadouts: WeaponLoadoutMap;
  onWeaponChange: (jobId: string, weapons: string[]) => void;
  equipConfig: EquipConfig;
  onEquipChange: (cfg: EquipConfig) => void;
  progress: ProgressMap;
  onProgressChange: (jobId: string, p: Progress) => void;
  onBack: () => void;
}

const ARMOR_BY_TYPE: Record<string, string> = { melee: '판금', ranged: '중갑', magic: '가죽' };
const STAT_ROWS: { key: keyof StatAlloc; label: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '근력' },
  { key: 'magic', label: '지력' },
  { key: 'speed', label: '스피드' },
  { key: 'endurance', label: '지구력' },
];

export function InventoryPage({
  loadouts,
  onChange,
  weaponLoadouts,
  onWeaponChange,
  equipConfig,
  onEquipChange,
  progress,
  onProgressChange,
  onBack,
}: InventoryPageProps) {
  const [jobId, setJobId] = useState(ROSTER[0].jobId);
  const [gender, setGender] = useState<Gender>('male');

  const character = ROSTER.find((c) => c.jobId === jobId)!;
  const job = getJob(jobId);
  const learnable = getLearnableSkills(jobId);
  const equipped = loadouts[jobId] ?? [];
  const slots = job.skillSlots;

  const base = baseWeaponId(jobId);
  const extras = weaponLoadouts[jobId] ?? [];
  const weaponPool = registerableWeapons(jobId);

  const toggle = (skillId: string) => {
    if (equipped.includes(skillId)) {
      onChange(jobId, equipped.filter((id) => id !== skillId));
    } else if (equipped.length < slots) {
      onChange(jobId, [...equipped, skillId]);
    }
  };

  const prog = progress[jobId];
  const pending = prog ? pendingPoints(prog) : 0;
  const allocStat = (key: keyof StatAlloc, delta: number) => {
    if (!prog) return;
    if (delta > 0 && pending <= 0) return;
    if (delta < 0 && prog.alloc[key] <= 5) return; // 기본치 5 미만으로는 못 내림
    onProgressChange(jobId, { ...prog, alloc: { ...prog.alloc, [key]: prog.alloc[key] + delta } });
  };

  const offhand = equipConfig.offhand[jobId] ?? 'none';
  const tomeEffect = equipConfig.tomeEffect[jobId] ?? 'bleed';
  const setOffhand = (v: Offhand) => onEquipChange({ ...equipConfig, offhand: { ...equipConfig.offhand, [jobId]: v } });
  const setTomeEffect = (v: TomeEffect) =>
    onEquipChange({ ...equipConfig, tomeEffect: { ...equipConfig.tomeEffect, [jobId]: v } });

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

          {prog && (
            <div className="inventory-level">
              <h3>레벨 · 능력치</h3>
              <p className="equip-row">
                <span>Lv.{prog.level}</span>
                <span>EXP {prog.xp}/{xpForNext(prog.level)}</span>
              </p>
              <p className="equip-label">
                잔여 포인트 <strong>{pending}</strong> (레벨업 시 +3)
              </p>
              {STAT_ROWS.map(({ key, label }) => (
                <div key={key} className="stat-alloc-row">
                  <span>
                    {label} {prog.alloc[key]}
                  </span>
                  <span className="stat-alloc-btns">
                    <button type="button" onClick={() => allocStat(key, -1)} disabled={prog.alloc[key] <= 5}>
                      −
                    </button>
                    <button type="button" onClick={() => allocStat(key, 1)} disabled={pending <= 0}>
                      ＋
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

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
                  {weaponPool
                    .filter((w) => w === cur || (w !== base && !extras.includes(w)))
                    .map((w) => (
                      <option key={w} value={w}>
                        {getWeapon(w).name}
                      </option>
                    ))}
                </select>
              );
            })}
            <p className="equip-label">보조장비 (방패=블락 / 단검=이도류)</p>
            <select value={offhand} onChange={(e) => setOffhand(e.target.value as Offhand)} aria-label="보조장비">
              <option value="none">없음</option>
              <option value="shield">방패</option>
              <option value="dagger">단검(이도류)</option>
            </select>
            <p className="equip-label">마법서·투척 발동 효과</p>
            <select value={tomeEffect} onChange={(e) => setTomeEffect(e.target.value as TomeEffect)} aria-label="마법서/투척 효과">
              {TOME_EFFECTS.map((e) => (
                <option key={e} value={e}>
                  {TOME_EFFECT_LABEL[e]}
                </option>
              ))}
            </select>
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
