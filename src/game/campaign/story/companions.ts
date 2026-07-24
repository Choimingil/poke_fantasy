import type { Character, SpriteGender, WeaponKind } from '../../types';
import { generateCharacter } from '../generateCharacter';

/** 스토리 동료 정의(합류 일정은 rounds.ts의 joinBefore/eventsAfter로 구동). */
interface CompanionDef {
  id: string;
  name: string;
  kind: WeaponKind;
  spriteJob: string;
  gender: SpriteGender;
  /** 역할 설명(합류 안내 표시용). */
  role: string;
}

/** 시나리오 2장 동료 구조. Act1에서는 도윤·연비만 실제 등장, 나머지는 이후 막에서 사용. */
const COMPANIONS: Record<string, CompanionDef> = {
  dohyun: { id: 'dohyun', name: '도윤', kind: 'blunt', spriteJob: 'east_general', gender: 'male', role: '방어·보조' },
  yeonbi: { id: 'yeonbi', name: '연비', kind: 'sword', spriteJob: 'east_duelist', gender: 'male', role: '전열 지휘' },
  seolhwa: { id: 'seolhwa', name: '설화', kind: 'tome', spriteJob: 'east_shaman', gender: 'female', role: '회복·정화' },
  baekrin: { id: 'baekrin', name: '백린', kind: 'staff', spriteJob: 'east_strategist', gender: 'male', role: '광역·지원' },
  kyle: { id: 'kyle', name: '카일', kind: 'sword', spriteJob: 'west_knight', gender: 'male', role: '검과 방패' },
};

/** 스토리 동료 기본 기술 로드아웃(강타·주술·보호·도발). 주인공과 동일하게 4종을 바로 사용. */
const COMPANION_LOADOUT = ['power_strike', 'incantation', 'protect', 'taunt'];

/** 동료를 지정 레벨(보통 주인공 레벨)로 생성한다. id는 동료 고정 id를 사용한다. */
export function buildCompanion(id: string, level: number, rng: () => number = Math.random): Character | undefined {
  const def = COMPANIONS[id];
  if (!def) return undefined;
  const c = generateCharacter(def.kind, Math.max(1, level), {
    id: def.id,
    name: def.name,
    spriteJob: def.spriteJob,
    gender: def.gender,
    rng,
  });
  c.skillLoadout = [...COMPANION_LOADOUT];
  return c;
}
