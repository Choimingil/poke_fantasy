import type { Character } from '../../types';
import { generateCharacter } from '../generateCharacter';
import { BEHAVIOR_FOR_KIND } from '../enemyParty';
import type { StoryRoundDef } from './types';

/** 값을 [lo,hi]로 제한. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 스토리 적 기준 레벨: 주인공 레벨을 라운드 권장 밴드로 클램프한다.
 * → 저레벨이면 쉽게, 고레벨이면 밴드 상한까지 따라와 "적당한" 난이도를 유지한다.
 */
function storyEnemyBaseLevel(def: StoryRoundDef, heroLevel: number): number {
  return clamp(Math.round(heroLevel), def.recLevelMin, def.recLevelMax);
}

/** 후반 라운드 능력치 스케일(8라운드 이후 라운드당 +4%). 절차 모드와 동일 기준. */
function storyStatMult(round: number): number {
  return 1 + Math.max(0, round - 8) * 0.04;
}

export interface StoryEnemyParty {
  units: Character[];
  commanderId?: string;
}

/**
 * 라운드 정의와 주인공 레벨로 적 파티를 만든다.
 * 지휘관(role: commander)은 정예 능력치를 갖고 killCommander 목표의 대상이 된다.
 */
export function buildStoryEnemyParty(
  def: StoryRoundDef,
  heroLevel: number,
  rng: () => number = Math.random,
): StoryEnemyParty {
  const base = storyEnemyBaseLevel(def, heroLevel);
  const statMult = storyStatMult(def.round);
  const units: Character[] = [];
  let commanderId: string | undefined;

  def.enemies.forEach((slot, i) => {
    const isCmd = slot.role === 'commander';
    const isElite = slot.role === 'elite' || isCmd;
    const id = isCmd ? `enemy-${def.round}-cmd` : `enemy-${def.round}-${i}`;
    const level = Math.max(1, base + (slot.levelOffset ?? 0));
    const c = generateCharacter(slot.kind, level, {
      id,
      name: slot.name,
      gender: slot.gender,
      spriteJob: slot.spriteJob,
      isElite,
      statMult,
      rng,
    });
    c.aiBehavior = BEHAVIOR_FOR_KIND[slot.kind];
    if (isCmd) commanderId = id;
    units.push(c);
  });

  return { units, commanderId };
}
