import type { BattleMap, Character } from '../types';
import { chebyshev } from './grid';

/** 숲 타일에 있는 캐릭터를 발견할 수 있는 최소 근접 반경(투시 없이도 이 거리 이내면 보임) */
export const FOREST_CONCEALMENT_RADIUS = 1;

export function effectiveSight(c: Character): number {
  return c.sight + (c.statusEffects.some((s) => s.type === 'farSight') ? 1 : 0);
}

export function isVisibleTo(viewer: Character, target: Character, map: BattleMap): boolean {
  const dist = chebyshev(viewer.position, target.position);
  if (dist > effectiveSight(viewer)) return false;
  const onForest = map.tiles[target.position.y][target.position.x].terrain === 'forest';
  if (onForest) {
    const canSeeIntoForest = viewer.statusEffects.some((s) => s.type === 'forestVision');
    if (!canSeeIntoForest && dist > FOREST_CONCEALMENT_RADIUS) return false;
  }
  return true;
}
