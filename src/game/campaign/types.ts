import type { ArmorInstance, Character, Element, ProcEffect, WeaponInstance, WeaponKind } from '../types';

/** 동료 품질 등급(명성에 따라 결정). 일반병사 → 숙련병 → 엘리트 → 영웅급. */
export type Quality = 'recruit' | 'veteran' | 'elite' | 'hero';

export const QUALITY_LABEL: Record<Quality, string> = {
  recruit: '일반 병사',
  veteran: '숙련병',
  elite: '엘리트',
  hero: '영웅급',
};

/** 적 파티 라운드별 테마. */
export type EnemyTheme = 'spear' | 'archer' | 'mage' | 'heavy' | 'assassin' | 'element';

export const ENEMY_THEME_LABEL: Record<EnemyTheme, string> = {
  spear: '창병 중심',
  archer: '궁병 중심',
  mage: '마법사 중심',
  heavy: '중장갑 중심',
  assassin: '암살자 중심',
  element: '속성 특화',
};

/** 모집 후보(생성된 캐릭터 + 모집 비용). */
export interface RecruitCandidate {
  id: string;
  character: Character;
  quality: Quality;
  cost: number;
}

/** 상점 상품(장비 인스턴스 + 가격). (상점 단계에서 확장) */
interface ShopItem {
  id: string;
  slot: 'weapon' | 'armor' | 'shield';
  templateId: string;
  level: number;
  element?: Element;
  procEffect?: ProcEffect;
  rare?: boolean;
  price: number;
}

/** 라운드 진행 캠페인 상태(localStorage에 저장). */
export interface Campaign {
  version: number;
  heroKind: WeaponKind;
  round: number;
  gold: number;
  reputation: number;
  roster: Character[]; // 주인공 포함 보유 동료(최대 30)
  deployedIds: string[]; // 다음 전투 출전 선택
  stash: { weapons: WeaponInstance[]; armor: ArmorInstance[] }; // 미장착 보관 장비
  recruits: RecruitCandidate[]; // 이번 라운드 모집 후보(3~5)
  shop: ShopItem[]; // 이번 라운드 상점 상품
  nextId: number; // 고유 id 시퀀스
}

/** 전투 결과 요약(명성·골드 정산 입력). */
export interface BattleOutcome {
  round: number;
  won: boolean;
  enemiesDefeated: number;
  allySurvivors: number;
  bossDefeated: boolean;
}

export const CAMPAIGN_VERSION = 1;
export const MAX_ROSTER = 30;
export const MAX_DEPLOY = 4;
/** 보스 라운드 주기(이 배수 라운드에 보스 등장). */
export const BOSS_ROUND_INTERVAL = 5;
