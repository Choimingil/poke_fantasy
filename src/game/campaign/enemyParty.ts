import type { Character, WeaponKind } from '../types';
import { BOSS_ROUND_INTERVAL, type EnemyTheme } from './types';
import { generateCharacter, randomName } from './generateCharacter';

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

/** 라운드에 맞는 적 파티를 생성한다(테마·레벨·인원 스케일, 보스 라운드엔 보스 포함). */
export function generateEnemyParty(round: number, rng: () => number = Math.random): { units: Character[]; theme: EnemyTheme } {
  const theme = themeForRound(round);
  const level = enemyLevelForRound(round);
  const count = enemyCountForRound(round);
  const kinds = THEME_KINDS[theme];
  const units: Character[] = [];

  if (isBossRound(round)) {
    units.push(generateCharacter(kinds[0], level + 5, { id: `enemy-${round}-boss`, name: `${randomName(rng)} (보스)`, rng, isBoss: true }));
    for (let i = 1; i < count; i++) {
      units.push(generateCharacter(kinds[i % kinds.length], level, { id: `enemy-${round}-${i}`, rng }));
    }
  } else {
    for (let i = 0; i < count; i++) {
      units.push(generateCharacter(kinds[i % kinds.length], level, { id: `enemy-${round}-${i}`, rng }));
    }
  }
  return { units, theme };
}
