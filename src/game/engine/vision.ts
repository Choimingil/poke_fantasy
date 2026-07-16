import type { BattleMap, Character, GridPos } from '../types';
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

/** target이 team(관측 진영)의 살아있는 유닛 중 하나라도에게 보이는가 */
export function isVisibleToTeam(target: Character, team: Character[], map: BattleMap): boolean {
  return team.some((viewer) => viewer.currentHp > 0 && isVisibleTo(viewer, target, map));
}

/** 관측 진영이 해당 타일을 밝히고 있는가(시야 반경 내). 숲 타일은 실루엣이 항상 보이므로 별도 처리. */
export function isTileRevealed(pos: GridPos, team: Character[]): boolean {
  return team.some(
    (viewer) => viewer.currentHp > 0 && chebyshev(viewer.position, pos) <= effectiveSight(viewer),
  );
}
