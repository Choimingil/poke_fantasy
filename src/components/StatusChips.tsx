import { useState } from 'react';
import type { ActiveStatus, StatusEffectType } from '../game/types';

const STATUS_LABEL: Record<StatusEffectType, string> = {
  guarding: '보호',
  taunted: '도발',
  elementEnchant: '마법부여',
  riverSurge: '급류',
  climbing: '등반',
  farSight: '천리안',
  forestVision: '투시',
  swordAwaken: '각성',
  bluntUnity: '단결',
  bowCrit: '급소',
  focused: '집중',
  legHit: '다리부상',
  bleeding: '출혈',
  stunned: '기절',
};

const STATUS_DESC: Record<StatusEffectType, string> = {
  guarding: '주위 1칸 아군을 향한 공격을 대신 받는다.',
  taunted: '지정한 상대를 우선 목표로 삼도록 강제된다.',
  elementEnchant: '공격에 속성이 부여되고, 주스탯이 근력+지력 합산으로 계산된다.',
  riverSurge: '물 타일 위에서 이동력이 +1 된다.',
  climbing: '언덕에 올라선 턴에도 행동할 수 있다.',
  farSight: '시야가 1 증가한다.',
  forestVision: '숲 속에 숨은 상대도 확인할 수 있다.',
  swordAwaken: '스피드가 1.2배가 된다.',
  bluntUnity: '방어력이 1.2배가 된다.',
  bowCrit: '공격 시 일정 확률로 급소(피해 증가)가 터진다.',
  focused: '공격 시 상대의 회피를 무시한다.',
  legHit: '이동력이 감소한다.',
  bleeding: '매 턴 최대 체력의 1/8 피해를 입는다.',
  stunned: '매 턴 30% 확률로 행동할 수 없다.',
};

// 디버프로 취급하는 상태(붉은색)
const DEBUFFS = new Set<StatusEffectType>(['taunted', 'legHit', 'bleeding', 'stunned']);

/** 현재 캐릭터의 버프/디버프와 남은 턴 수를 칩으로 표시한다. 칩을 누르면 해당 상태 설명이 나온다. */
export function StatusChips({ effects }: { effects: ActiveStatus[] }) {
  const [openType, setOpenType] = useState<StatusEffectType | null>(null);
  if (effects.length === 0) return <span className="status-chips status-chips-empty">상태 없음</span>;
  const active = openType && effects.some((e) => e.type === openType) ? openType : null;
  return (
    <span className="status-chips">
      {effects.map((s, i) => (
        <button
          key={`${s.type}-${i}`}
          type="button"
          className={`status-chip ${DEBUFFS.has(s.type) ? 'status-chip-debuff' : 'status-chip-buff'}${active === s.type ? ' status-chip-open' : ''}`}
          title={STATUS_DESC[s.type]}
          onClick={() => setOpenType((cur) => (cur === s.type ? null : s.type))}
        >
          {STATUS_LABEL[s.type]} {s.turnsRemaining}턴
        </button>
      ))}
      {active && <span className="status-desc"><strong>{STATUS_LABEL[active]}</strong> — {STATUS_DESC[active]}</span>}
    </span>
  );
}
