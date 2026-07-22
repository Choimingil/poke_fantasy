/**
 * 초반 시스템 점진 해금(§44). 튜토리얼(1라운드) 직후부터 라운드가 오를 때마다
 * 정비 시스템을 하나씩 연다 — 신규 플레이어가 한꺼번에 모든 기능을 마주하지 않도록.
 */
export type SystemId = 'recruit' | 'shop' | 'enhance';

/** 시스템별 해금 라운드. */
export const UNLOCK_ROUND: Record<SystemId, number> = {
  recruit: 2, // 튜토리얼 종료 후 동료 모집
  shop: 3, // 상점
  enhance: 4, // 장비 강화
};

export const SYSTEM_LABEL: Record<SystemId, string> = {
  recruit: '동료 모집', shop: '상점', enhance: '장비 강화',
};

const SYSTEM_ORDER: SystemId[] = ['recruit', 'shop', 'enhance'];

/** 해당 시스템이 지정 라운드에 열려 있는가. */
export function isUnlocked(system: SystemId, round: number): boolean {
  return round >= UNLOCK_ROUND[system];
}

/** 이 라운드에 새로 열린 시스템들(결과 화면 안내용). */
export function unlockedThisRound(round: number): SystemId[] {
  return SYSTEM_ORDER.filter((s) => UNLOCK_ROUND[s] === round);
}
