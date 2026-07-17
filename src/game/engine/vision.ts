import type { BattleMap, Character, GridPos } from '../types';
import { chebyshev } from './grid';
import type { TimeOfDay } from './daytime';
import type { Weather } from './weather';

/** 숲 타일에 있는 캐릭터를 발견할 수 있는 최소 근접 반경(투시 없이도 이 거리 이내면 보임) */
export const FOREST_CONCEALMENT_RADIUS = 1;

export interface SightConditions {
  time?: TimeOfDay;
  weather?: Weather;
}

/** 시간대·날씨에 따른 시야 보정치. 밤 -2, 비/눈 -1. */
function envSightModifier(cond?: SightConditions): number {
  let mod = 0;
  if (cond?.time === 'night') mod -= 2;
  if (cond?.weather === 'rain' || cond?.weather === 'snow') mod -= 1;
  return mod;
}

export function effectiveSight(c: Character, cond?: SightConditions): number {
  const base = c.sight + (c.statusEffects.some((s) => s.type === 'farSight') ? 1 : 0);
  return Math.max(1, base + envSightModifier(cond)); // 시야는 최소 1
}

export function isVisibleTo(viewer: Character, target: Character, map: BattleMap, cond?: SightConditions): boolean {
  const dist = chebyshev(viewer.position, target.position);
  if (dist > effectiveSight(viewer, cond)) return false;
  const onForest = map.tiles[target.position.y][target.position.x].terrain === 'forest';
  if (onForest) {
    const canSeeIntoForest = viewer.statusEffects.some((s) => s.type === 'forestVision');
    if (!canSeeIntoForest && dist > FOREST_CONCEALMENT_RADIUS) return false;
  }
  return true;
}

/** target이 team(관측 진영)의 살아있는 유닛 중 하나라도에게 보이는가 */
export function isVisibleToTeam(target: Character, team: Character[], map: BattleMap, cond?: SightConditions): boolean {
  return team.some((viewer) => viewer.currentHp > 0 && isVisibleTo(viewer, target, map, cond));
}

/** 관측 진영이 해당 타일을 밝히고 있는가(시야 반경 내). 숲 타일은 실루엣이 항상 보이므로 별도 처리. */
export function isTileRevealed(pos: GridPos, team: Character[], cond?: SightConditions): boolean {
  return team.some(
    (viewer) => viewer.currentHp > 0 && chebyshev(viewer.position, pos) <= effectiveSight(viewer, cond),
  );
}
