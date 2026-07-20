import { useState } from 'react';
import type { ActiveStatus, StatusEffectType } from '../game/types';

const STATUS_LABEL: Record<StatusEffectType, string> = {
  guarding: '보호',
  guardWide: '광역보호',
  taunted: '도발',
  elementEnchant: '마법부여',
  riverSurge: '급류',
  climbing: '등반',
  farSight: '천리안',
  forestVision: '투시',
  focused: '집중',
  hidden: '은신',
  shadowClone: '분신',
  quickSwap: '빠른교체',
  legHit: '다리부상',
  immobilized: '봉쇄',
  bleeding: '출혈',
  poisoned: '맹독',
  shocked: '충격',
  moveDown: '둔화',
};

const STATUS_DESC: Record<StatusEffectType, string> = {
  guarding: '주위 1칸 아군을 향한 공격을 대신 받는다.',
  guardWide: '경호 반경이 2칸으로, 라운드당 발동이 2회로 늘어난다.',
  taunted: '지정한 상대를 우선 목표로 삼도록 강제된다.',
  elementEnchant: '공격에 속성이 부여되고, 주스탯이 높은 능력치 + 낮은 능력치 50%로 계산된다.',
  riverSurge: '물 타일 위에서 이동력이 +1 된다.',
  climbing: '언덕에 올라선 턴에도 행동할 수 있다.',
  farSight: '시야가 1 증가한다.',
  forestVision: '숲 속에 숨은 상대도 확인할 수 있다.',
  focused: '공격 시 상대의 회피를 무시한다.',
  hidden: '다음 턴까지 투명해진다(공격하거나 범위 공격에 맞으면 해제).',
  shadowClone: '직접 공격 후 0.3배 위력의 추가타가 발동한다.',
  quickSwap: '무기 교체가 턴을 소모하지 않는다.',
  legHit: '이동력이 1 감소한다.',
  immobilized: '이동할 수 없다.',
  bleeding: '매 턴 최대 체력의 1/8 피해를 입는다.',
  poisoned: '매 턴 최대 체력의 1/8 피해를 입는다(출혈과 중복, 합산 상한 20%).',
  shocked: '다음 행동이 취소된다(정예·보스는 이동력 감소로 전환).',
  moveDown: '일정 기간 이동력이 감소한다(최소 1).',
};

// 디버프로 취급하는 상태(붉은색)
const DEBUFFS = new Set<StatusEffectType>(['taunted', 'legHit', 'immobilized', 'bleeding', 'poisoned', 'shocked', 'moveDown']);

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
