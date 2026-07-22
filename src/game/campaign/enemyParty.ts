import type { AiBehavior, Character, WeaponKind } from '../types';
import { BOSS_ROUND_INTERVAL, type EnemyTheme } from './types';
import { generateCharacter, randomName } from './generateCharacter';

/** 무기 종류별 기본 AI 행동 유형(§39). */
const BEHAVIOR_FOR_KIND: Record<WeaponKind, AiBehavior> = {
  sword: 'aggressive', spear: 'aggressive', dagger: 'aggressive',
  blunt: 'defensive', shield: 'defensive',
  bow: 'skirmisher', crossbow: 'skirmisher', thrown: 'skirmisher', staff: 'skirmisher',
  tome: 'support',
};

/** 해당 무기 종류에 맞는 AI 행동을 부여한 캐릭터를 만든다. */
function makeEnemy(kind: WeaponKind, level: number, opts: Parameters<typeof generateCharacter>[2]): Character {
  const c = generateCharacter(kind, level, opts);
  c.aiBehavior = BEHAVIOR_FOR_KIND[kind];
  return c;
}

/** 테마별 등장 무기 종류(앞쪽일수록 비중이 큼). */
const THEME_KINDS: Record<EnemyTheme, WeaponKind[]> = {
  spear: ['spear', 'spear', 'sword', 'blunt'],
  archer: ['bow', 'bow', 'crossbow', 'dagger'],
  mage: ['staff', 'staff', 'tome', 'tome'],
  heavy: ['blunt', 'sword', 'spear', 'blunt'],
  assassin: ['dagger', 'dagger', 'thrown', 'bow'],
  element: ['staff', 'staff', 'tome', 'staff'],
};

const THEMES: EnemyTheme[] = ['spear', 'archer', 'mage', 'heavy', 'assassin', 'element'];

/** 라운드별 테마(앞 라운드는 순환하여 예측 가능, 결정적). */
export function themeForRound(round: number): EnemyTheme {
  return THEMES[(round - 1) % THEMES.length];
}

/** 라운드별 적 기준 레벨(후반일수록 상승). */
export function enemyLevelForRound(round: number): number {
  return 3 + (round - 1) * 3;
}

/** 라운드별 적 인원(2~5). */
export function enemyCountForRound(round: number): number {
  return Math.min(5, 2 + Math.floor(round / 2));
}

export function isBossRound(round: number): boolean {
  return round % BOSS_ROUND_INTERVAL === 0;
}

/** 후반 라운드 능력치 스케일 배수(8라운드 이후 라운드당 +4%). */
export function enemyStatMult(round: number): number {
  return 1 + Math.max(0, round - 8) * 0.04;
}

/** 라운드에 맞는 적 파티를 생성한다(테마·레벨·인원·후반 스케일, 보스 라운드엔 보스 포함). */
export function generateEnemyParty(round: number, rng: () => number = Math.random): { units: Character[]; theme: EnemyTheme } {
  const theme = themeForRound(round);
  const level = enemyLevelForRound(round);
  const count = enemyCountForRound(round);
  const statMult = enemyStatMult(round);
  const kinds = THEME_KINDS[theme];
  const units: Character[] = [];

  if (isBossRound(round)) {
    units.push(makeEnemy(kinds[0], level + 5, { id: `enemy-${round}-boss`, name: `${randomName(rng)} (보스)`, rng, isBoss: true, statMult }));
    for (let i = 1; i < count; i++) {
      // 보스 라운드에는 부하 1명이 정예(친위대)로 등장한다.
      const elite = i === 1;
      units.push(makeEnemy(kinds[i % kinds.length], level, { id: `enemy-${round}-${i}`, rng, isElite: elite, statMult }));
    }
  } else {
    for (let i = 0; i < count; i++) {
      // 4라운드 이후에는 선두 1명이 정예로 등장한다.
      const elite = i === 0 && round >= 4;
      units.push(makeEnemy(kinds[i % kinds.length], level, { id: `enemy-${round}-${i}`, rng, isElite: elite, statMult }));
    }
  }
  return { units, theme };
}
